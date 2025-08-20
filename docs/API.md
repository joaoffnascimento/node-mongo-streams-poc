# 🌐 Web API Documentation

The MongoDB Streams POC includes a RESTful API that exposes all CLI functionality as HTTP endpoints. This allows for easy integration, testing, and monitoring of stream processing operations.

## 🚀 Quick Start

### Starting the API Server

```bash
# Option 1: Full stack with monitoring
cd docker
docker-compose up -d

# Option 2: Local development
npm run web:dev
```

### Base URL

- **Local Development**: `http://localhost:3000`
- **Docker**: `http://localhost:3000`

### Health Check

```bash
curl http://localhost:3000/health
```

## 📋 API Endpoints

### 1. Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-08-20T19:30:00.000Z",
  "uptime": 123.456,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1572864,
    "arrayBuffers": 524288
  },
  "version": "v18.17.0"
}
```

### 2. API Documentation

```http
GET /
```

Returns interactive API documentation with available endpoints and examples.

### 3. Database Status

```http
GET /api/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "connected",
    "database": "streams-poc",
    "documentCount": "1,000,000",
    "timestamp": "2025-08-20T19:30:00.000Z"
  }
}
```

### 4. Stream Processing

```http
POST /api/process/stream
Content-Type: application/json

{
  "limit": 10000
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "type": "STREAM_PROCESSING",
    "totalProcessed": 10000,
    "totalTime": 2.345,
    "memoryUsed": {
      "bytes": 52428800,
      "megabytes": "50.00",
      "formatted": "50.00 MB",
      "humanReadable": "50.00 MB"
    },
    "method": "with-streams",
    "performance": {
      "totalProcessed": 10000,
      "totalTime": 2345,
      "totalTimeFormatted": "2345ms (2.35s)",
      "method": "MongoDB Streaming",
      "throughput": {
        "documentsPerSecond": 4264,
        "documentsPerSecondFormatted": "4264 docs/sec"
      },
      "efficiency": {
        "memoryPerDocument": "5.24 KB per doc",
        "timePerDocument": "0.23ms per doc"
      }
    },
    "advantages": [
      "Low, consistent memory usage",
      "Immediate processing start",
      "Backpressure handling",
      "Scalable for any dataset size"
    ]
  },
  "executionTime": 2345,
  "performanceReport": {
    /* ... detailed metrics ... */
  }
}
```

### 5. Traditional Processing

```http
POST /api/process/no-stream
Content-Type: application/json

{
  "limit": 10000
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "type": "TRADITIONAL_PROCESSING",
    "totalProcessed": 10000,
    "loadTime": 1500,
    "processTime": 800,
    "totalTime": 2300,
    "memoryUsed": {
      "bytes": 157286400,
      "megabytes": "150.00",
      "formatted": "150.00 MB",
      "humanReadable": "150.00 MB"
    },
    "method": "without-streams",
    "performance": {
      /* ... detailed metrics ... */
    },
    "disadvantages": [
      "High memory usage",
      "Loading wait time",
      "Memory spikes",
      "Not scalable for large datasets"
    ]
  },
  "executionTime": 2300,
  "performanceReport": {
    /* ... detailed metrics ... */
  }
}
```

### 6. Method Comparison

```http
POST /api/compare
Content-Type: application/json

{
  "limit": 5000
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "type": "COMPARISON",
    "comparison": {
      "stream": {
        "totalProcessed": 5000,
        "totalTime": 1200,
        "memoryUsed": {
          /* ... formatted memory ... */
        },
        "method": "with-streams",
        "performance": {
          /* ... detailed metrics ... */
        }
      },
      "traditional": {
        "totalProcessed": 5000,
        "totalTime": 1800,
        "memoryUsed": {
          /* ... formatted memory ... */
        },
        "method": "without-streams",
        "loadTime": 900,
        "processTime": 900,
        "performance": {
          /* ... detailed metrics ... */
        }
      },
      "winner": "stream",
      "memoryEfficiency": "stream",
      "timeDifference": 600,
      "memoryDifference": {
        /* ... formatted difference ... */
      }
    },
    "summary": {
      "fasterMethod": "stream",
      "memoryEfficientMethod": "stream",
      "timeSavedMs": 600,
      "timeSavedFormatted": "600ms (0.60s)",
      "memorySaved": {
        /* ... formatted memory saved ... */
      },
      "performanceGain": {
        "timeImprovement": "33.3%",
        "memoryImprovement": "66.7%"
      }
    }
  },
  "executionTime": 3000,
  "performanceReport": {
    "stream": {
      /* ... stream detailed metrics ... */
    },
    "traditional": {
      /* ... traditional detailed metrics ... */
    },
    "comparisonSummary": {
      /* ... comparison metrics ... */
    }
  }
}
```

### 7. Database Operations

#### Seed Database

```http
POST /api/seed
Content-Type: application/json

{
  "count": 100000
}
```

#### Clear Database

```http
DELETE /api/clear
```

### 8. Prometheus Metrics

```http
GET /metrics
```

Returns Prometheus-formatted metrics for monitoring and alerting.

## 📊 Monitoring Integration

The API automatically collects and exposes metrics for:

- **HTTP Request Metrics**: Duration, count, status codes
- **Processing Metrics**: Documents processed, memory usage, execution time
- **MongoDB Metrics**: Connection status, document count, collection size
- **System Metrics**: Memory usage, CPU usage, garbage collection
- **Comparison Metrics**: Performance differences between methods

### Key Metrics

| Metric Name                                     | Description                     | Labels                               |
| ----------------------------------------------- | ------------------------------- | ------------------------------------ |
| `streams_api_http_requests_total`               | Total HTTP requests             | method, route, status_code           |
| `streams_api_http_request_duration_seconds`     | HTTP request duration           | method, route, status_code           |
| `streams_api_documents_processed_total`         | Total documents processed       | method, processing_type              |
| `streams_api_processing_duration_seconds`       | Processing operation duration   | method, processing_type              |
| `streams_api_memory_usage_bytes`                | Memory usage during operations  | method, processing_type, memory_type |
| `streams_api_stream_throughput_docs_per_second` | Documents per second throughput | method                               |
| `streams_api_comparison_metrics`                | Comparison between methods      | metric_type, method                  |

## 🔧 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `500`: Internal Server Error (processing failure)

## 🧪 Testing Examples

### Bash/cURL Examples

```bash
# Test stream processing with 5K documents
curl -X POST http://localhost:3000/api/process/stream \
  -H "Content-Type: application/json" \
  -d '{"limit": 5000}' | jq .

# Compare methods with 3K documents
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"limit": 3000}' | jq .

# Check current metrics
curl http://localhost:3000/metrics
```

### JavaScript/Node.js Example

```javascript
const axios = require("axios");

async function testStreamProcessing() {
  try {
    const response = await axios.post(
      "http://localhost:3000/api/process/stream",
      {
        limit: 10000,
      }
    );

    console.log("Stream Processing Results:");
    console.log(`Processed: ${response.data.data.totalProcessed} documents`);
    console.log(`Memory: ${response.data.data.memoryUsed.humanReadable}`);
    console.log(`Time: ${response.data.data.performance.totalTimeFormatted}`);
    console.log(
      `Throughput: ${response.data.data.performance.throughput.documentsPerSecondFormatted}`
    );
  } catch (error) {
    console.error("Error:", error.response?.data?.error || error.message);
  }
}

testStreamProcessing();
```

### Python Example

```python
import requests
import json

def test_comparison():
    url = "http://localhost:3000/api/compare"
    data = {"limit": 5000}

    response = requests.post(url, json=data)
    result = response.json()

    if result["success"]:
        comparison = result["data"]["comparison"]
        summary = result["data"]["summary"]

        print(f"Winner: {summary['fasterMethod']}")
        print(f"Time saved: {summary['timeSavedFormatted']}")
        print(f"Memory efficiency: {summary['memoryEfficientMethod']}")
        print(f"Performance gain: {summary['performanceGain']['timeImprovement']}")
    else:
        print(f"Error: {result['error']}")

test_comparison()
```

## 🔗 Integration with Monitoring

The API integrates seamlessly with the monitoring stack:

1. **Coroot Dashboard**: Real-time application performance monitoring
2. **Prometheus**: Metrics collection and alerting
3. **Grafana**: Custom dashboards and visualizations

See [Monitoring Documentation](MONITORING.md) for detailed setup instructions.

## 🚀 Performance Tips

1. **Optimal Limits**: Start with 5K-10K documents for testing
2. **Memory Monitoring**: Watch memory usage during traditional processing
3. **Concurrent Requests**: API handles concurrent processing requests
4. **Metrics Collection**: Use `/metrics` endpoint for performance analysis
5. **Health Checks**: Monitor `/health` for service availability

## 🔍 Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure MongoDB is running
2. **High Memory Usage**: Reduce limit parameter for traditional processing
3. **Slow Responses**: Check database document count and system resources
4. **Metrics Not Updating**: Verify Prometheus scraping configuration

### Debug Mode

Set environment variable for verbose logging:

```bash
LOG_LEVEL=debug npm run web:dev
```
