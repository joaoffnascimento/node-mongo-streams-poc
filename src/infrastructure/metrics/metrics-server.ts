import express from 'express';
import { MetricsAdapter } from '../adapters/metrics.adapter';

export class MetricsServer {
  private app: express.Application;
  private metricsAdapter: MetricsAdapter;
  private port: number;

  constructor(port: number = 9464) {
    this.app = express();
    this.port = port;
    this.metricsAdapter = MetricsAdapter.getInstance();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      const metrics = await this.metricsAdapter.getMetrics();
      res.send(metrics);
    });

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        service: 'metrics-server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`📊 Metrics server running on port ${this.port}`);
      console.log(`📈 Metrics endpoint: http://localhost:${this.port}/metrics`);
    });
  }
}