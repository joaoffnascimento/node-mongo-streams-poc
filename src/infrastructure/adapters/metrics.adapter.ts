import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';

export class MetricsAdapter {
  private static instance: MetricsAdapter;
  private register: promClient.Registry;
  
  public httpRequestsTotal: promClient.Counter<string>;
  public httpRequestDuration: promClient.Histogram<string>;
  public activeConnections: promClient.Gauge<string>;
  public mongoOperations: promClient.Counter<string>;
  public mongoOperationDuration: promClient.Histogram<string>;
  public systemMemoryUsage: promClient.Gauge<string>;

  private constructor() {
    this.register = new promClient.Registry();
    
    promClient.collectDefaultMetrics({
      register: this.register,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in milliseconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
      registers: [this.register],
    });

    this.activeConnections = new promClient.Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections',
      registers: [this.register],
    });

    this.mongoOperations = new promClient.Counter({
      name: 'mongodb_operations_total',
      help: 'Total number of MongoDB operations',
      labelNames: ['operation', 'collection'],
      registers: [this.register],
    });

    this.mongoOperationDuration = new promClient.Histogram({
      name: 'mongodb_operation_duration_ms',
      help: 'Duration of MongoDB operations in milliseconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.1, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.register],
    });

    this.systemMemoryUsage = new promClient.Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage in bytes',
      labelNames: ['type'],
      registers: [this.register],
    });

    this.startMemoryCollection();
  }

  public static getInstance(): MetricsAdapter {
    if (!MetricsAdapter.instance) {
      MetricsAdapter.instance = new MetricsAdapter();
    }
    return MetricsAdapter.instance;
  }

  public getRegister(): promClient.Registry {
    return this.register;
  }

  public createHttpMetricsMiddleware() {
    const metrics = this;
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      metrics.activeConnections.inc();

      const originalEnd = res.end.bind(res);
      res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void) {
        const duration = Date.now() - start;
        const route = req.route?.path || req.path || 'unknown';
        
        metrics.httpRequestsTotal.inc({
          method: req.method,
          route,
          status_code: res.statusCode.toString(),
        });

        metrics.httpRequestDuration.observe(
          { method: req.method, route },
          duration
        );

        metrics.activeConnections.dec();
        
        return originalEnd(chunk, encoding as BufferEncoding, cb);
      };

      next();
    };
  }

  public recordMongoOperation(operation: string, collection: string, duration: number) {
    this.mongoOperations.inc({ operation, collection });
    this.mongoOperationDuration.observe({ operation, collection }, duration);
  }

  public async getMetrics(): Promise<string> {
    return await this.register.metrics();
  }

  private startMemoryCollection() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.systemMemoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.systemMemoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.systemMemoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.systemMemoryUsage.set({ type: 'external' }, memUsage.external);
      this.systemMemoryUsage.set({ type: 'arrayBuffers' }, memUsage.arrayBuffers);
    }, 1000);
  }
}