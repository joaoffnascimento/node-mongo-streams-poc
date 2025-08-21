import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createDocumentRoutes } from './routes/document.routes';
import { DependencyContainer } from './di/dependency-container.di';
import { MetricsAdapter } from '../infrastructure/adapters/metrics.adapter';
import { MetricsServer } from '../infrastructure/metrics/metrics-server';

const app = express();
const port = process.env.PORT || 3000;
const metricsPort = process.env.METRICS_PORT || 9464;
const container = new DependencyContainer();

const metricsAdapter = MetricsAdapter.getInstance();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(metricsAdapter.createHttpMetricsMiddleware());

app.use('/api', createDocumentRoutes(container));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const metricsServer = new MetricsServer(Number(metricsPort));
metricsServer.start();

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 API available at http://localhost:${port}/api`);
  console.log(`🔍 Health check at http://localhost:${port}/health`);
  console.log(`📈 Metrics available at http://localhost:${metricsPort}/metrics`);
});

export default app;
