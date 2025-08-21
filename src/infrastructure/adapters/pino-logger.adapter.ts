import { Logger } from '../../domain/ports/logger.port';
import pino from 'pino';

export class PinoLoggerAdapter implements Logger {
  private readonly logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(context, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context, message);
  }
}
