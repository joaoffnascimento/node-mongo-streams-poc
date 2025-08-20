const { performance, PerformanceObserver } = require("perf_hooks");
const v8 = require("v8");
const os = require("os");

class PerformanceMonitor {
  constructor(name) {
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

  setupObservers() {
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

  startMonitoring() {
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

  collectSample() {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const sample = {
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

  stop() {
    clearInterval(this.lagInterval);
    clearInterval(this.sampleInterval);

    // Collect final metrics
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = (endTime - this.metrics.startTime) / 1000;

    const maxHeap = Math.max(
      ...this.metrics.samples.map((s) => s.memory.heapUsed)
    );
    const avgHeap = Math.round(
      this.metrics.samples.reduce((a, b) => a + b.memory.heapUsed, 0) /
        this.metrics.samples.length
    );

    const avgEventLoopLag =
      this.metrics.eventLoopLag.length > 0
        ? this.metrics.eventLoopLag.reduce((a, b) => a + b.lag, 0) /
          this.metrics.eventLoopLag.length
        : 0;

    return {
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
        average: {
          heapUsed: avgHeap,
        },
      },
      gc: {
        count: this.metrics.gcEvents.length,
        totalTime: this.metrics.gcEvents.reduce((a, b) => a + b.duration, 0),
      },
      eventLoop: {
        avgLag: avgEventLoopLag.toFixed(2),
        maxLag: Math.max(
          ...this.metrics.eventLoopLag.map((e) => e.lag)
        ).toFixed(2),
      },
      samples: this.metrics.samples,
    };
  }

  printReport() {
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
        report.memory.end.heapUsed - report.memory.start.heapUsed
      } MB`
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

module.exports = PerformanceMonitor;
