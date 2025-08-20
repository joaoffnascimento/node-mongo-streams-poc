const { Transform, PassThrough, pipeline } = require("stream");
const { promisify } = require("util");

class StreamService {
  constructor() {
    this.pipelineAsync = promisify(pipeline);
  }

  createProcessingStream(processingFunction) {
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const processed = processingFunction(chunk);
          callback(null, processed);
        } catch (error) {
          callback(error);
        }
      },
    });
  }

  createBatchTransform(batchSize, processingFunction) {
    let batch = [];

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        batch.push(chunk);

        if (batch.length >= batchSize) {
          try {
            const processed = processingFunction(batch);
            batch = [];
            callback(null, processed);
          } catch (error) {
            callback(error);
          }
        } else {
          callback();
        }
      },

      flush(callback) {
        if (batch.length > 0) {
          try {
            const processed = processingFunction(batch);
            callback(null, processed);
          } catch (error) {
            callback(error);
          }
        } else {
          callback();
        }
      },
    });
  }

  createProgressTracker(total, progressCallback) {
    let processed = 0;

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        processed++;

        if (progressCallback) {
          progressCallback(processed, total);
        }

        callback(null, chunk);
      },
    });
  }

  createFilterStream(filterFunction) {
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          if (filterFunction(chunk)) {
            callback(null, chunk);
          } else {
            callback();
          }
        } catch (error) {
          callback(error);
        }
      },
    });
  }

  async runPipeline(...streams) {
    return await this.pipelineAsync(...streams);
  }

  createPassThroughStream() {
    return new PassThrough({ objectMode: true });
  }
}

module.exports = StreamService;
