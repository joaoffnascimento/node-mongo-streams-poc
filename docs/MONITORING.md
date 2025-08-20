# 📊 Monitoring & Observability

This project includes a comprehensive monitoring stack powered by **Coroot**, **Prometheus**, and **Grafana** to provide real-time insights into stream processing performance, memory usage, and system metrics.

## 🎯 Monitoring Overview

The monitoring stack captures and visualizes:

- **🔍 Application Performance**: API response times, throughput, error rates
- **💾 Memory Usage**: Real-time memory consumption during processing
- **🗄️ Database Metrics**: MongoDB performance, connection status, document counts
- **🖥️ System Metrics**: CPU, memory, disk, network usage
- **📊 Comparison Metrics**: Stream vs Traditional processing performance
- **🔄 Container Metrics**: Docker container resource usage

## 🚀 Quick Start

### Start Complete Monitoring Stack

```bash
# Start all services including monitoring
cd docker
docker-compose up -d

# Wait for services to initialize (2-3 minutes)
# Check service status
docker-compose ps
```

### Access Monitoring Dashboards

| Service           | URL                   | Purpose                       | Credentials      |
| ----------------- | --------------------- | ----------------------------- | ---------------- |
| **🎯 Coroot**     | http://localhost:8080 | Main monitoring dashboard     | None             |
| **📈 Prometheus** | http://localhost:9090 | Metrics collection & querying | None             |
| **📊 Grafana**    | http://localhost:3001 | Custom dashboards & alerts    | admin / admin123 |
| **🔍 cAdvisor**   | http://localhost:8081 | Container metrics             | None             |

## 🎯 Coroot Dashboard

**Coroot** is the primary monitoring interface, providing:

### Key Features

- **Application Topology**: Visual service dependencies
- **Real-time Metrics**: Live performance data
- **Automatic Alerting**: Built-in anomaly detection
- **Resource Usage**: Memory, CPU, network monitoring
- **Error Tracking**: Automatic error detection and analysis

### Navigation Guide

1. **Overview Dashboard**:

   - Service health status
   - Key performance indicators
   - Resource utilization summary

2. **Application View**:

   - `streams-api` service metrics
   - Request latency and throughput
   - Error rates and patterns

3. **Infrastructure View**:
   - MongoDB performance
   - Container resource usage
   - System-level metrics

### Coroot Setup Process

When first accessing Coroot:

1. Open http://localhost:8080
2. Coroot will auto-discover services
3. Wait 2-3 minutes for initial data collection
4. Navigate through the discovered applications
5. Explore the `streams-api` and `mongodb` services

## 📈 Prometheus Metrics

### Key Metrics Collected

#### API Performance Metrics

```prometheus
# HTTP request metrics
streams_api_http_requests_total{method="POST", route="/api/process/stream", status_code="200"}
streams_api_http_request_duration_seconds{method="POST", route="/api/process/stream"}

# Processing performance
streams_api_documents_processed_total{method="stream", processing_type="mongodb_cursor"}
streams_api_processing_duration_seconds{method="stream", processing_type="mongodb_cursor"}
streams_api_memory_usage_bytes{method="stream", processing_type="mongodb_cursor"}
```

#### Database Metrics

```prometheus
# MongoDB metrics
streams_api_mongodb_document_count{collection="documents"}
streams_api_db_connections_active
mongodb_up
mongodb_connections{state="current"}
```

#### System Metrics

```prometheus
# Node.js application metrics
nodejs_heap_size_used_bytes
nodejs_gc_duration_seconds
nodejs_eventloop_lag_seconds

# Container metrics
container_memory_usage_bytes{name="streams-api"}
container_cpu_usage_seconds_total{name="streams-api"}
```

### Querying Metrics

Access Prometheus at http://localhost:9090 and try these queries:

```prometheus
# Average processing time by method
rate(streams_api_processing_duration_seconds_sum[5m]) / rate(streams_api_processing_duration_seconds_count[5m])

# Memory usage comparison
streams_api_memory_usage_bytes{memory_type="heap_used"}

# API request rate
rate(streams_api_http_requests_total[1m])

# Documents processed per second
rate(streams_api_documents_processed_total[1m])
```

## 📊 Grafana Dashboards

### Pre-configured Dashboards

Access Grafana at http://localhost:3001 (admin/admin123) for custom visualizations:

#### 1. Streams POC Overview

- API performance overview
- Processing method comparison
- Memory usage trends
- Database connection status

#### 2. Performance Comparison

- Stream vs Traditional processing metrics
- Real-time throughput comparison
- Memory efficiency visualization
- Response time analysis

#### 3. System Resources

- Container resource usage
- MongoDB performance metrics
- Network and disk I/O
- Garbage collection patterns

### Creating Custom Dashboards

1. Login to Grafana
2. Create new dashboard
3. Add panels with Prometheus queries
4. Use the metrics listed above for visualizations

## 🧪 Testing & Demo Scenarios

### Scenario 1: Memory Usage Comparison

```bash
# Start monitoring stack
docker-compose up -d

# Generate load for comparison
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"limit": 10000}'

# Watch metrics in Coroot dashboard
# Observe memory spikes in traditional processing
```

### Scenario 2: Load Testing

```bash
# Multiple concurrent requests
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/process/stream \
    -H "Content-Type: application/json" \
    -d '{"limit": 5000}' &
done

# Monitor in Coroot:
# - Request latency
# - Memory usage patterns
# - Throughput metrics
```

### Scenario 3: Traditional Processing Limits

```bash
# Test with increasing limits to see memory growth
curl -X POST http://localhost:3000/api/process/no-stream \
  -H "Content-Type: application/json" \
  -d '{"limit": 50000}'

# Watch for:
# - Memory spikes in Coroot
# - Potential OOM conditions
# - Response time degradation
```

## 📋 Monitoring Checklist for Presentations

### Pre-Demo Setup

- [ ] All services running (`docker-compose ps`)
- [ ] Coroot dashboard accessible (http://localhost:8080)
- [ ] Services discovered in Coroot (wait 3-5 minutes)
- [ ] Database seeded with data (`npm run seed:100k`)
- [ ] API health check passing (`curl http://localhost:3000/health`)

### During Demo

- [ ] Open Coroot dashboard side-by-side with terminal
- [ ] Show service topology and dependencies
- [ ] Run stream processing and watch metrics
- [ ] Run traditional processing and observe memory spikes
- [ ] Use comparison endpoint to show differences
- [ ] Highlight real-time metric changes

### Key Metrics to Highlight

- [ ] Memory usage differences (MB → GB)
- [ ] Processing time comparisons
- [ ] Throughput metrics (docs/second)
- [ ] Resource utilization efficiency
- [ ] Error rates and reliability

## 🔧 Configuration & Customization

### Adjusting Scrape Intervals

Edit `docker/monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "streams-api"
    scrape_interval: 5s # More frequent for demos
    static_configs:
      - targets: ["api:3000"]
```

### Custom Alerting Rules

Create `docker/monitoring/alerts.yml`:

```yaml
groups:
  - name: streams-api
    rules:
      - alert: HighMemoryUsage
        expr: streams_api_memory_usage_bytes > 500000000 # 500MB
        for: 30s
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }} bytes"
```

### Environment Variables

Configure monitoring behavior:

```bash
# In docker-compose.yml
environment:
  - COROOT_DISCOVERY_INTERVAL=30s
  - PROMETHEUS_RETENTION=7d
  - GRAFANA_ADMIN_PASSWORD=your-secure-password
```

## 🔍 Troubleshooting

### Common Issues

#### Coroot Not Showing Services

```bash
# Check if services are running
docker-compose ps

# Restart Coroot if needed
docker-compose restart coroot

# Wait for service discovery (2-3 minutes)
```

#### Metrics Not Updating

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify API metrics endpoint
curl http://localhost:3000/metrics

# Check container networking
docker network ls
docker network inspect docker_streams-network
```

#### High Resource Usage

```bash
# Monitor container resources
docker stats

# Reduce metrics retention
# Edit prometheus.yml: --storage.tsdb.retention.time=7d
```

### Debug Commands

```bash
# Check service logs
docker-compose logs coroot
docker-compose logs prometheus
docker-compose logs api

# Test connectivity
docker-compose exec prometheus wget -O- http://api:3000/metrics
docker-compose exec coroot wget -O- http://prometheus:9090/api/v1/targets
```

## 📊 Metrics Export & Analysis

### Exporting Data

```bash
# Export Prometheus data
curl 'http://localhost:9090/api/v1/query_range?query=streams_api_memory_usage_bytes&start=2025-08-20T10:00:00Z&end=2025-08-20T11:00:00Z&step=60s'

# Export Grafana dashboard
# Use Grafana UI: Dashboard → Share → Export
```

### Analysis Scripts

```python
import requests
import pandas as pd
import matplotlib.pyplot as plt

# Fetch metrics from Prometheus
def get_metrics():
    url = "http://localhost:9090/api/v1/query"
    params = {"query": "streams_api_memory_usage_bytes"}
    response = requests.get(url, params=params)
    return response.json()

# Analyze and visualize
data = get_metrics()
# Process and plot data...
```

## 🚀 Production Considerations

### Security

- Change default passwords
- Enable HTTPS/TLS
- Configure authentication
- Network security policies

### Scalability

- Increase retention periods
- Add additional exporters
- Configure high availability
- Implement backup strategies

### Performance

- Optimize scrape intervals
- Configure resource limits
- Monitor monitoring stack performance
- Implement data lifecycle policies

## 🎯 Presentation Tips

1. **Start with Overview**: Show Coroot main dashboard first
2. **Live Demos**: Run API commands while showing metrics
3. **Side-by-Side**: Terminal + Coroot dashboard + API results
4. **Focus on Differences**: Highlight stream vs traditional metrics
5. **Real-time Impact**: Show immediate metric changes during processing
6. **Resource Efficiency**: Emphasize memory and CPU usage differences

The monitoring stack provides compelling visual evidence of why streams are essential for production-grade data processing!
