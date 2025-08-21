import {
  PerformanceMonitor,
  PerformanceReport,
} from '../../domain/ports/performance-monitor.port';

export class PerformanceMonitorAdapter implements PerformanceMonitor {
  private startTime: number = 0;
  private startMemory: NodeJS.MemoryUsage = process.memoryUsage();
  private endTime: number = 0;
  private endMemory: NodeJS.MemoryUsage = process.memoryUsage();

  constructor(private readonly operationName: string) {}

  public start(): void {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage();
  }

  public stop(): PerformanceReport {
    this.endTime = Date.now();
    this.endMemory = process.memoryUsage();

    const totalTime = (this.endTime - this.startTime) / 1000;
    const memoryUsed = Math.round(
      (this.endMemory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024
    );

    return {
      totalTime,
      memoryUsed,
      operationName: this.operationName,
    };
  }

  public getMetrics(): PerformanceReport {
    const currentTime = this.endTime || Date.now();
    const currentMemory = this.endMemory || process.memoryUsage();

    const totalTime = (currentTime - this.startTime) / 1000;
    const memoryUsed = Math.round(
      (currentMemory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024
    );

    return {
      totalTime,
      memoryUsed,
      operationName: this.operationName,
    };
  }

  public async track<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const monitor = new PerformanceMonitorAdapter(operationName);
    monitor.start();

    try {
      const result = await operation();
      const report = monitor.stop();
      console.log(
        `Operation ${operationName} completed in ${report.totalTime}s using ${report.memoryUsed}MB`
      );
      return result;
    } catch (error) {
      const report = monitor.stop();
      console.error(
        `Operation ${operationName} failed after ${report.totalTime}s using ${report.memoryUsed}MB`
      );
      throw error;
    }
  }
}
