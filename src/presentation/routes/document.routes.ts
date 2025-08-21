import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { DependencyContainer } from '../di/dependency-container.di';

export function createDocumentRoutes(container: DependencyContainer): Router {
  const router = Router();
  const controller = container.getDocumentController();

  router.get('/status', (req, res) => controller.getStatus(req, res));
  router.post('/process/stream', (req, res) => controller.processWithStream(req, res));
  router.post('/process/traditional', (req, res) => controller.processWithoutStream(req, res));
  router.post('/compare', (req, res) => controller.compareProcessing(req, res));
  router.post('/seed', (req, res) => controller.seedDatabase(req, res));
  router.delete('/data', (req, res) => controller.clearData(req, res));

  return router;
}