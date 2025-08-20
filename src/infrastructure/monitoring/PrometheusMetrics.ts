import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from "prom-client";

// Enable default metrics collection
collectDefaultMetrics({ prefix: "streams_api_" });

// Custom metrics for the Streams POC API
export const httpRequestDuration = new Histogram({
  name: "streams_api_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: "streams_api_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const documentsProcessedTotal = new Counter({
  name: "streams_api_documents_processed_total",
  help: "Total number of documents processed",
  labelNames: ["method", "processing_type"],
});

export const processingDuration = new Histogram({
  name: "streams_api_processing_duration_seconds",
  help: "Duration of document processing operations in seconds",
  labelNames: ["method", "processing_type"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

export const memoryUsage = new Gauge({
  name: "streams_api_memory_usage_bytes",
  help: "Memory usage during processing operations",
  labelNames: ["method", "processing_type", "memory_type"],
});

export const databaseConnections = new Gauge({
  name: "streams_api_db_connections_active",
  help: "Number of active database connections",
});

export const databaseOperationDuration = new Histogram({
  name: "streams_api_db_operation_duration_seconds",
  help: "Duration of database operations in seconds",
  labelNames: ["operation", "collection"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const streamThroughput = new Gauge({
  name: "streams_api_stream_throughput_docs_per_second",
  help: "Documents processed per second in streaming operations",
  labelNames: ["method"],
});

export const comparisonMetrics = new Gauge({
  name: "streams_api_comparison_metrics",
  help: "Comparison metrics between processing methods",
  labelNames: ["metric_type", "method"],
});

// MongoDB specific metrics
export const mongodbDocumentCount = new Gauge({
  name: "streams_api_mongodb_document_count",
  help: "Total number of documents in MongoDB collection",
  labelNames: ["collection"],
});

export const mongodbCollectionSize = new Gauge({
  name: "streams_api_mongodb_collection_size_bytes",
  help: "Size of MongoDB collection in bytes",
  labelNames: ["collection"],
});

// Performance monitoring metrics
export const gcDuration = new Histogram({
  name: "streams_api_gc_duration_seconds",
  help: "Duration of garbage collection cycles",
  labelNames: ["gc_type"],
  buckets: [0.001, 0.01, 0.1, 1, 10],
});

export const eventLoopLag = new Histogram({
  name: "streams_api_event_loop_lag_seconds",
  help: "Event loop lag in seconds",
  buckets: [0.001, 0.01, 0.1, 1, 10],
});

// Export the registry for metrics endpoint
export { register };

// Helper function to record HTTP request metrics
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number
) {
  httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });
  httpRequestDuration.observe(
    { method, route, status_code: statusCode.toString() },
    duration
  );
}

// Helper function to record processing metrics
export function recordProcessingMetrics(
  method: string,
  processingType: string,
  documentsProcessed: number,
  duration: number,
  memoryUsed: number
) {
  documentsProcessedTotal.inc(
    { method, processing_type: processingType },
    documentsProcessed
  );
  processingDuration.observe(
    { method, processing_type: processingType },
    duration
  );
  memoryUsage.set(
    { method, processing_type: processingType, memory_type: "heap_used" },
    memoryUsed
  );
  streamThroughput.set({ method }, documentsProcessed / duration);
}

// Helper function to record comparison metrics
export function recordComparisonMetrics(
  streamTime: number,
  traditionalTime: number,
  streamMemory: number,
  traditionalMemory: number
) {
  comparisonMetrics.set(
    { metric_type: "processing_time", method: "stream" },
    streamTime
  );
  comparisonMetrics.set(
    { metric_type: "processing_time", method: "traditional" },
    traditionalTime
  );
  comparisonMetrics.set(
    { metric_type: "memory_usage", method: "stream" },
    streamMemory
  );
  comparisonMetrics.set(
    { metric_type: "memory_usage", method: "traditional" },
    traditionalMemory
  );
  comparisonMetrics.set(
    { metric_type: "time_difference", method: "absolute" },
    Math.abs(streamTime - traditionalTime)
  );
  comparisonMetrics.set(
    { metric_type: "memory_difference", method: "absolute" },
    Math.abs(streamMemory - traditionalMemory)
  );
}

// Helper function to update MongoDB metrics
export function updateMongodbMetrics(
  documentCount: number,
  collectionSize: number
) {
  mongodbDocumentCount.set({ collection: "documents" }, documentCount);
  mongodbCollectionSize.set({ collection: "documents" }, collectionSize);
}
