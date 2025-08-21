import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { StreamsController } from "./StreamsController";
import logger from "@infrastructure/monitoring/logger";

export class WebApiServer {
  private app: Application;
  private streamsController: StreamsController;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.streamsController = new StreamsController();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
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

    // API documentation
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "MongoDB Streams POC API",
        version: "1.0.0",
        description:
          "Demonstration of MongoDB streaming vs traditional processing",
        endpoints: {
          "GET /health": "Health check",
          "GET /api/status": "Database status and document count",
          "POST /api/process/stream": "Process documents using MongoDB streams",
          "POST /api/process/traditional":
            "Process documents using traditional approach",
          "POST /api/compare": "Compare both processing methods",
          "DELETE /api/data": "Clear all documents from database",
        },
        examples: {
          "Process with streams": {
            method: "POST",
            url: "/api/process/stream",
            body: { limit: 10000 },
          },
          "Process traditionally": {
            method: "POST",
            url: "/api/process/traditional",
            body: { limit: 10000 },
          },
          "Compare methods": {
            method: "POST",
            url: "/api/compare",
            body: { limit: 5000 },
          },
        },
      });
    });

    // API routes
    this.app.get(
      "/api/status",
      this.streamsController.getStatus.bind(this.streamsController)
    );
    this.app.post(
      "/api/process/stream",
      this.streamsController.processWithStream.bind(this.streamsController)
    );
    this.app.post(
      "/api/process/traditional",
      this.streamsController.processWithoutStream.bind(this.streamsController)
    );
    this.app.post(
      "/api/compare",
      this.streamsController.compareProcessing.bind(this.streamsController)
    );
    this.app.delete(
      "/api/data",
      this.streamsController.clearData.bind(this.streamsController)
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
          "POST /api/process/traditional",
          "POST /api/compare",
          "DELETE /api/data",
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
          logger.info("🚀 MongoDB Streams POC API started", {
            port: this.port,
            environment: process.env.NODE_ENV || "development",
            pid: process.pid,
          });

          console.log(`\n🚀 MongoDB Streams POC API Server`);
          console.log(`📡 Port: ${this.port}`);
          console.log(
            `🌍 Environment: ${process.env.NODE_ENV || "development"}`
          );
          console.log(`📚 Documentation: http://localhost:${this.port}/`);
          console.log(`❤️  Health: http://localhost:${this.port}/health`);
          console.log(`📊 Status: http://localhost:${this.port}/api/status`);

          resolve();
        });

        server.on("error", (error: any) => {
          if (error.code === "EADDRINUSE") {
            logger.error(`Port ${this.port} is already in use`, {
              port: this.port,
            });
            reject(new Error(`Port ${this.port} is already in use`));
          } else {
            logger.error("Server error", { error: error.message });
            reject(error);
          }
        });
      } catch (error) {
        logger.error("Failed to start server", { error });
        reject(error);
      }
    });
  }

  private async shutdown(): Promise<void> {
    logger.info("🛑 Shutting down Web API Server...");

    try {
      // Graceful shutdown logic here
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown", { error });
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

export default WebApiServer;
