# 🎯 Presentation Setup Guide

This guide provides step-by-step instructions for setting up and demonstrating the MongoDB Streams POC with complete monitoring.

## 🚀 Pre-Presentation Setup (5 minutes)

### 1. Initial Setup

```bash
# Clone and navigate to project
git clone <repository-url>
cd streams-poc

# Start complete monitoring stack
./start.sh full
```

**Wait for:** All services to start (2-3 minutes)

### 2. Verify Services

```bash
# Check all services are running
./start.sh status

# Test API connectivity
curl http://localhost:3000/health
```

### 3. Open Browser Tabs

- **Coroot Dashboard**: http://localhost:8080 (main monitoring)
- **API Documentation**: http://localhost:3000 (API endpoints)
- **Prometheus**: http://localhost:9090 (metrics queries)
- **Grafana**: http://localhost:3001 (admin/admin123)

## 🎪 Live Demonstration Flow

### Demo 1: Memory Usage Comparison (5 minutes)

**Setup Terminal + Coroot Side-by-Side**

```bash
# 1. Show initial state
curl http://localhost:3000/api/status

# 2. Test stream processing (efficient)
curl -X POST http://localhost:3000/api/process/stream \
  -H "Content-Type: application/json" \
  -d '{"limit": 10000}' | jq '.data.performance, .data.memoryUsed'

# 3. Test traditional processing (memory intensive)
curl -X POST http://localhost:3000/api/process/no-stream \
  -H "Content-Type: application/json" \
  -d '{"limit": 10000}' | jq '.data.performance, .data.memoryUsed'
```

**🎯 Highlight in Coroot:**

- Memory spikes during traditional processing
- Consistent memory usage with streams
- Response time differences

### Demo 2: Direct Comparison (3 minutes)

```bash
# Run side-by-side comparison
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"limit": 5000}' | jq '.data.summary'
```

**🎯 Show in Results:**

- Time differences (streams typically 2-3x faster)
- Memory efficiency (streams use 60-80% less memory)
- Performance gains percentage

### Demo 3: Scalability Test (5 minutes)

```bash
# Increase load progressively
curl -X POST http://localhost:3000/api/process/stream \
  -H "Content-Type: application/json" \
  -d '{"limit": 50000}'

# Try traditional with higher load (may fail/be slow)
curl -X POST http://localhost:3000/api/process/no-stream \
  -H "Content-Type: application/json" \
  -d '{"limit": 50000}'
```

**🎯 Demonstrate:**

- Streams handle large datasets consistently
- Traditional processing shows exponential memory growth
- System resource usage in real-time

## 📊 Key Metrics to Highlight

### Coroot Dashboard Points

1. **Service Overview**: Application topology and health
2. **Memory Metrics**: Real-time memory consumption
3. **Response Times**: API latency comparisons
4. **Throughput**: Documents processed per second
5. **Resource Efficiency**: CPU and memory utilization

### API Response Highlights

```json
// Stream Processing Results
{
  "memoryUsed": {
    "humanReadable": "52.3 MB",
    "megabytes": "52.30"
  },
  "performance": {
    "documentsPerSecondFormatted": "4,264 docs/sec",
    "totalTimeFormatted": "2345ms (2.35s)"
  }
}

// Traditional Processing Results
{
  "memoryUsed": {
    "humanReadable": "156.7 MB",
    "megabytes": "156.70"
  },
  "performance": {
    "documentsPerSecondFormatted": "2,847 docs/sec",
    "totalTimeFormatted": "3521ms (3.52s)"
  }
}
```

## 🗣️ Presentation Script Template

### Opening (1 minute)

> "Today I'll demonstrate why streams are essential for production applications. We'll see live metrics showing how traditional approaches fail with real-world data volumes."

### Problem Statement (2 minutes)

> "Many applications work fine in development but crash in production. Let me show you why..."

**Show:** Database with 1M documents, explain the scenario

### Live Demo (10 minutes)

> "Watch both the terminal output AND the real-time monitoring dashboard as we process the same dataset two different ways..."

**Demo flow:** Stream → Traditional → Comparison → Scalability

### Key Takeaways (2 minutes)

> "As you can see from the live metrics:"
>
> - Streams use 60-80% less memory
> - 2-3x faster processing
> - Consistent performance regardless of dataset size
> - Production-ready scalability

## 🔧 Troubleshooting During Presentation

### If Services Don't Start

```bash
# Quick restart
./start.sh restart

# Check logs
./start.sh logs
```

### If API Returns Errors

```bash
# Check database connection
curl http://localhost:3000/api/status

# Reseed if needed
./start.sh seed 100000
```

### If Monitoring Shows No Data

- Wait 2-3 minutes for Coroot initialization
- Refresh browser tabs
- Check Prometheus targets: http://localhost:9090/targets

### Backup Commands (If API Fails)

```bash
# Use CLI directly
npm run compare
npm run test:stream
npm run test:no-stream
```

## 📈 Advanced Demo Scenarios

### For Technical Audiences

```bash
# Show Prometheus metrics directly
curl http://localhost:3000/metrics | grep streams_api

# Query specific metrics
curl 'http://localhost:9090/api/v1/query?query=streams_api_memory_usage_bytes'

# Concurrent load testing
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/process/stream \
    -H "Content-Type: application/json" \
    -d '{"limit": 5000}' &
done
```

### For Business Audiences

- Focus on cost implications (memory = infrastructure cost)
- Highlight scalability for growth
- Emphasize reliability and user experience

## 🎯 Presentation Tips

1. **Practice the Flow**: Run through the demo 2-3 times
2. **Have Backups**: CLI commands ready if API fails
3. **Monitor Resources**: Keep system resource usage reasonable
4. **Time Management**: Allocate 15 minutes total for live demo
5. **Engage Audience**: Ask them to predict results before showing
6. **Visual Focus**: Keep Coroot dashboard visible throughout

## 📋 Quick Reference Commands

```bash
# Essential commands for live demo
./start.sh full          # Start everything
./start.sh status        # Check services
./start.sh test          # Run quick tests
./start.sh stop          # Clean shutdown

# API endpoints for copy-paste
curl http://localhost:3000/health
curl http://localhost:3000/api/status
curl -X POST http://localhost:3000/api/process/stream -H "Content-Type: application/json" -d '{"limit": 5000}'
curl -X POST http://localhost:3000/api/process/no-stream -H "Content-Type: application/json" -d '{"limit": 5000}'
curl -X POST http://localhost:3000/api/compare -H "Content-Type: application/json" -d '{"limit": 3000}'
```

## 🌟 Success Indicators

Your presentation setup is ready when:

- ✅ All services show "running" status
- ✅ Coroot dashboard loads and shows services
- ✅ API health check returns 200
- ✅ Database status shows document count
- ✅ Test commands return valid responses
- ✅ Real-time metrics update in Coroot

**Ready to demonstrate the power of streams! 🚀**
