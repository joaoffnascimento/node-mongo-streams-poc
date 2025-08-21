export interface PerformanceReport {
  totalTime: number;
  memoryUsed: number;
  operationName: string;
}

export interface PerformanceMonitor {
  start(): void;
  stop(): PerformanceReport;
  track<T>(operationName: string, operation: () => Promise<T>): Promise<T>;
  getMetrics(): PerformanceReport;
}