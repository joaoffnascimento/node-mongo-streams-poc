import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { CliApiService } from "./CliApiService";
import MongoDocumentRepository from "@infrastructure/database/repositories/MongoDocumentRepository";
import logger from "@infrastructure/monitoring/logger";
import {
  register,
  recordHttpRequest,
} from "@infrastructure/monitoring/PrometheusMetrics";

export class WebApiServer {
  private app: Application;
  private apiService: CliApiService;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.apiService = new CliApiService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Metrics middleware - track all requests
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on("finish", () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        const route = req.route ? req.route.path : req.path;
        recordHttpRequest(req.method, route, res.statusCode, duration);
      });

      next();
    });

    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // Disable for API
      })
    );

    // CORS middleware
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
      })
    );

    // JSON parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        method: req.method,
        url: req.url,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      });
    });

    // Prometheus metrics endpoint
    this.app.get("/metrics", async (req: Request, res: Response) => {
      try {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).json({ error: "Failed to collect metrics" });
      }
    });

    // API documentation
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "MongoDB Streams POC API",
        version: "1.0.0",
        description: "CLI commands transformed into HTTP API endpoints",
        endpoints: {
          "GET /health": "Health check",
          "GET /api/status": "Database status and document count",
          "POST /api/process/stream": "Process documents with streams",
          "POST /api/process/no-stream": "Process documents without streams",
          "POST /api/compare": "Compare both processing methods",
          "POST /api/seed": "Seed database with documents",
          "DELETE /api/clear": "Clear all documents from database",
        },
        examples: {
          "Process with streams":
            'POST /api/process/stream with body: {"limit": 10000}',
          "Compare methods": 'POST /api/compare with body: {"limit": 5000}',
          "Seed database": 'POST /api/seed with body: {"count": 100000}',
        },
      });
    });

    // CLI command routes
    this.app.get(
      "/api/status",
      this.apiService.getStatus.bind(this.apiService)
    );
    this.app.post(
      "/api/process/stream",
      async (req: Request, res: Response) => {
        try {
          const { limit = 10000 } = req.body;
          const result = await this.apiService.processWithStream(limit);
          res.json(result);
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );
    this.app.post(
      "/api/process/no-stream",
      async (req: Request, res: Response) => {
        try {
          const { limit = 10000 } = req.body;
          const result = await this.apiService.processWithoutStream(limit);
          res.json(result);
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );
    this.app.post("/api/compare", async (req: Request, res: Response) => {
      try {
        const { limit = 10000 } = req.body;
        const result = await this.apiService.compareProcessing(limit);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
    this.app.post(
      "/api/seed",
      this.apiService.seedDatabase.bind(this.apiService)
    );
    this.app.delete(
      "/api/clear",
      this.apiService.clearDatabase.bind(this.apiService)
    );

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Route ${req.method} ${req.path} not found`,
        availableRoutes: [
          "GET /",
          "GET /health",
          "GET /api/status",
          "POST /api/process/stream",
          "POST /api/process/no-stream",
          "POST /api/compare",
          "POST /api/seed",
          "DELETE /api/clear",
        ],
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: any) => {
      logger.error("Unhandled error", {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
      });

      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    });

    // Graceful shutdown
    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.port, () => {
          logger.info("🚀 Web API Server started", {
            port: this.port,
            environment: process.env.NODE_ENV || "development",
            pid: process.pid,
            endpoints: {
              health: `http://localhost:${this.port}/health`,
              status: `http://localhost:${this.port}/api/status`,
              docs: `http://localhost:${this.port}/`,
            },
          });

          console.log(
            `\n🚀 MongoDB Streams POC API is running on port ${this.port}`
          );
          console.log(`📋 API Documentation: http://localhost:${this.port}/`);
          console.log(`❤️  Health Check: http://localhost:${this.port}/health`);
          console.log(
            `📊 Database Status: http://localhost:${this.port}/api/status\n`
          );

          resolve();
        });

        // server.on('error', (error: Error) => {
        //   logger.error('Server startup error', { error: error.message });
        //   reject(error);
        // });
      } catch (error) {
        logger.error("Failed to start server", { error });
        reject(error);
      }
    });
  }

  private shutdown(): void {
    logger.info("Shutting down server gracefully...");

    this.apiService
      .cleanup()
      .then(() => {
        logger.info("API service cleanup completed");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Error during cleanup", { error });
        process.exit(1);
      });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default WebApiServer;
