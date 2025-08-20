import {
  Transform,
  Readable,
  Writable,
  pipeline as pipelineOriginal,
} from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(pipelineOriginal);

// Type definitions for stream utilities
export interface IProcessingConfig {
  maxConcurrency?: number;
  timeout?: number;
}

export interface IBatchConfig {
  batchSize: number;
  flushTimeout?: number;
}

export interface IProgressConfig {
  reportInterval?: number;
  onProgress?: (processed: number, timestamp: number) => void;
}

export interface IFilterConfig<T> {
  predicate: (item: T) => boolean;
}

export type ProcessingFunction<T, R> = (item: T) => Promise<R> | R;
export type BatchProcessingFunction<T, R> = (batch: T[]) => Promise<R[]> | R[];

class StreamService {
  /**
   * Creates a Transform stream that applies a processing function to each item
   */
  createProcessingStream<T, R>(
    processFn: ProcessingFunction<T, R>,
    config: IProcessingConfig = {}
  ): Transform {
    const { maxConcurrency = 10, timeout = 30000 } = config;

    let activeOperations = 0;
    let isEnding = false;

    const transform = new Transform({
      objectMode: true,
      transform(chunk: T, encoding, callback) {
        if (activeOperations >= maxConcurrency) {
          this.once("operationComplete", () => {
            this._transform(chunk, encoding, callback);
          });
          return;
        }

        activeOperations++;

        const processItem = async () => {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error(`Processing timeout after ${timeout}ms`)),
                timeout
              )
            );

            const result = await Promise.race([
              Promise.resolve(processFn(chunk)),
              timeoutPromise,
            ]);

            activeOperations--;
            this.emit("operationComplete");
            callback(null, result);
          } catch (error) {
            activeOperations--;
            this.emit("operationComplete");
            callback(error instanceof Error ? error : new Error(String(error)));
          }
        };

        processItem();
      },

      flush(callback) {
        isEnding = true;
        const waitForCompletion = () => {
          if (activeOperations === 0) {
            callback();
          } else {
            setTimeout(waitForCompletion, 10);
          }
        };
        waitForCompletion();
      },
    });

    return transform;
  }

  /**
   * Creates a Transform stream that batches items and processes them in batches
   */
  createBatchTransform<T, R>(
    batchProcessFn: BatchProcessingFunction<T, R>,
    config: IBatchConfig
  ): Transform {
    const { batchSize, flushTimeout = 5000 } = config;
    let batch: T[] = [];
    let timeoutId: NodeJS.Timeout | null = null;

    const processBatch = async function (this: Transform, callback: Function) {
      if (batch.length === 0) {
        callback();
        return;
      }

      try {
        const currentBatch = batch;
        batch = [];

        const results = await batchProcessFn(currentBatch);

        // Push each result individually
        results.forEach((result) => this.push(result));
        callback();
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const transform = new Transform({
      objectMode: true,
      transform(chunk: T, encoding, callback) {
        batch.push(chunk);

        // Clear existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (batch.length >= batchSize) {
          processBatch.call(this, callback);
        } else {
          // Set timeout for partial batch
          timeoutId = setTimeout(() => {
            processBatch.call(this, callback);
          }, flushTimeout);
          callback();
        }
      },

      flush(callback) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (batch.length > 0) {
          processBatch.call(this, callback);
        } else {
          callback();
        }
      },
    });

    return transform;
  }

  /**
   * Creates a Transform stream that tracks processing progress
   */
  createProgressTracker<T>(config: IProgressConfig = {}): Transform {
    const { reportInterval = 1000, onProgress } = config;
    let processedCount = 0;
    let lastReportTime = Date.now();

    return new Transform({
      objectMode: true,
      transform(chunk: T, encoding, callback) {
        processedCount++;

        const now = Date.now();
        if (now - lastReportTime >= reportInterval) {
          if (onProgress) {
            onProgress(processedCount, now);
          }
          lastReportTime = now;
        }

        callback(null, chunk);
      },

      flush(callback) {
        // Final progress report
        if (onProgress) {
          onProgress(processedCount, Date.now());
        }
        callback();
      },
    });
  }

  /**
   * Creates a filter Transform stream
   */
  createFilter<T>(config: IFilterConfig<T>): Transform {
    const { predicate } = config;

    return new Transform({
      objectMode: true,
      transform(chunk: T, encoding, callback) {
        try {
          if (predicate(chunk)) {
            callback(null, chunk);
          } else {
            callback(); // Skip this item
          }
        } catch (error) {
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      },
    });
  }

  /**
   * Utility method to run a pipeline of streams
   */
  async runPipeline(
    source: Readable,
    ...transforms: (Transform | Writable)[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const streams = [source, ...transforms];
      pipelineOriginal(streams as any, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

export default StreamService;
