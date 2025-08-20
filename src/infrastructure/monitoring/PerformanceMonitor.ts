import { performance, PerformanceObserver } from "perf_hooks";
import * as v8 from "v8";
import * as os from "os";

export interface IMemoryMetrics {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface ICpuMetrics {
  user: number;
  system: number;
}

export interface ISystemMetrics {
  loadavg: number[];
  freemem: number;
  totalmem: number;
}

export interface ISample {
  timestamp: number;
  memory: IMemoryMetrics;
  cpu: ICpuMetrics;
  heap: v8.HeapInfo;
  system: ISystemMetrics;
}

export interface IGCEvent {
  name: string;
  duration: number;
  timestamp: number;
}

export interface IEventLoopLag {
  lag: number;
  timestamp: number;
}

export interface IPerformanceMetrics {
  startTime: number;
  startMemory: NodeJS.MemoryUsage;
  samples: ISample[];
  gcEvents: IGCEvent[];
  eventLoopLag: IEventLoopLag[];
}

export interface IMemoryReport {
  start: {
    heapUsed: number;
    rss: number;
  };
  end: {
    heapUsed: number;
    rss: number;
  };
  max: {
    heapUsed: number;
  };
  min: {
    heapUsed: number;
  };
  average: {
    heapUsed: number;
  };
}

export interface IGCReport {
  count: number;
  totalTime: number;
}

export interface IEventLoopReport {
  avgLag: number;
  maxLag: number;
}

export interface IPerformanceReport {
  name: string;
  duration: number;
  memory: IMemoryReport;
  gc: IGCReport;
  eventLoop: IEventLoopReport;
  samples: ISample[];
}

export class PerformanceMonitor {
  private readonly name: string;
  private metrics: IPerformanceMetrics;
  private lagInterval?: NodeJS.Timeout;
  private sampleInterval?: NodeJS.Timeout;
  private stopped: boolean = false;
  private lastReport?: IPerformanceReport;

  constructor(name: string) {
    this.name = name;
    this.metrics = {
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      samples: [],
      gcEvents: [],
      eventLoopLag: [],
    };

    this.setupObservers();
    this.startMonitoring();
  }

  private setupObservers(): void {
    // Monitor Garbage Collection
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.gcEvents.push({
          name: entry.name,
          duration: entry.duration,
          timestamp: Date.now(),
        });
      });
    });

    try {
      obs.observe({ entryTypes: ["gc"], buffered: false });
    } catch (e) {
      console.log("GC monitoring not available");
    }
  }

  private startMonitoring(): void {
    // Monitor event loop lag
    this.lagInterval = setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        this.metrics.eventLoopLag.push({
          lag,
          timestamp: Date.now(),
        });
      });
    }, 1000);

    // Collect memory samples
    this.sampleInterval = setInterval(() => {
      this.collectSample();
    }, 5000);
  }

  private collectSample(): ISample {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const sample: ISample = {
      timestamp: Date.now(),
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
        arrayBuffers: Math.round(memory.arrayBuffers / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      heap: v8.getHeapStatistics(),
      system: {
        loadavg: os.loadavg(),
        freemem: Math.round(os.freemem() / 1024 / 1024),
        totalmem: Math.round(os.totalmem() / 1024 / 1024),
      },
    };

    this.metrics.samples.push(sample);
    return sample;
  }

  public stop(): IPerformanceReport {
    // Prevent double-stopping
    if (this.stopped) {
      return this.lastReport!;
    }
    this.stopped = true;

    if (this.lagInterval) {
      clearInterval(this.lagInterval);
    }
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
    }

    // Collect final sample
    this.collectSample();

    // Collect final metrics
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = (endTime - this.metrics.startTime) / 1000;

    const maxHeap =
      this.metrics.samples.length > 0
        ? Math.max(...this.metrics.samples.map((s) => s.memory.heapUsed))
        : Math.round(endMemory.heapUsed / 1024 / 1024);

    const minHeap =
      this.metrics.samples.length > 0
        ? Math.min(...this.metrics.samples.map((s) => s.memory.heapUsed))
        : Math.round(endMemory.heapUsed / 1024 / 1024);

    const avgHeap =
      this.metrics.samples.length > 0
        ? Math.round(
            this.metrics.samples.reduce((a, b) => a + b.memory.heapUsed, 0) /
              this.metrics.samples.length
          )
        : Math.round(endMemory.heapUsed / 1024 / 1024);

    const avgEventLoopLag =
      this.metrics.eventLoopLag.length > 0
        ? this.metrics.eventLoopLag.reduce((a, b) => a + b.lag, 0) /
          this.metrics.eventLoopLag.length
        : 0;

    const maxEventLoopLag =
      this.metrics.eventLoopLag.length > 0
        ? Math.max(...this.metrics.eventLoopLag.map((e) => e.lag))
        : 0;

    this.lastReport = {
      name: this.name,
      duration,
      memory: {
        start: {
          heapUsed: Math.round(this.metrics.startMemory.heapUsed / 1024 / 1024),
          rss: Math.round(this.metrics.startMemory.rss / 1024 / 1024),
        },
        end: {
          heapUsed: Math.round(endMemory.heapUsed / 1024 / 1024),
          rss: Math.round(endMemory.rss / 1024 / 1024),
        },
        max: {
          heapUsed: maxHeap,
        },
        min: {
          heapUsed: minHeap,
        },
        average: {
          heapUsed: avgHeap,
        },
      },
      gc: {
        count: this.metrics.gcEvents.length,
        totalTime: this.metrics.gcEvents.reduce((a, b) => a + b.duration, 0),
      },
      eventLoop: {
        avgLag: Number(avgEventLoopLag.toFixed(2)),
        maxLag: Number(maxEventLoopLag.toFixed(2)),
      },
      samples: this.metrics.samples,
    };

    return this.lastReport;
  }

  public printReport(): IPerformanceReport {
    const report = this.stop();

    console.log("\n" + "═".repeat(60));
    console.log(`📊 PERFORMANCE REPORT: ${report.name}`);
    console.log("═".repeat(60));

    console.log("\n⏱️  Duration:", report.duration.toFixed(2), "seconds");

    console.log("\n💾 Memory Usage:");
    console.log(`   Start:   ${report.memory.start.heapUsed} MB`);
    console.log(`   End:     ${report.memory.end.heapUsed} MB`);
    console.log(`   Peak:    ${report.memory.max.heapUsed} MB`);
    console.log(`   Average: ${report.memory.average.heapUsed} MB`);
    console.log(
      `   Delta:   ${
        report.memory.end.heapUsed > report.memory.start.heapUsed ? "+" : ""
      }${report.memory.end.heapUsed - report.memory.start.heapUsed} MB`
    );

    console.log("\n♻️  Garbage Collection:");
    console.log(`   Total GC runs: ${report.gc.count}`);
    console.log(`   Total GC time: ${report.gc.totalTime.toFixed(2)} ms`);

    console.log("\n🔄 Event Loop:");
    console.log(`   Average lag: ${report.eventLoop.avgLag} ms`);
    console.log(`   Max lag:     ${report.eventLoop.maxLag} ms`);

    console.log("\n" + "═".repeat(60));

    return report;
  }
}

export default PerformanceMonitor;
