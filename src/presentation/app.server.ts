import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createDocumentRoutes } from './routes/document.routes';
import { DependencyContainer } from './di/dependency-container.di';

const app = express();
const port = process.env.PORT || 3000;
const container = new DependencyContainer();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', createDocumentRoutes(container));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 API available at http://localhost:${port}/api`);
  console.log(`🔍 Health check at http://localhost:${port}/health`);
});

export default app;
