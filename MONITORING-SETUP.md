# 📊 Real-time Monitoring Stack - PoC Setup Guide

This document provides complete setup instructions for the comprehensive monitoring solution optimized for **real-time demonstration** with 1-second intervals.

## 🎯 Overview

The monitoring stack includes:
- **Prometheus** - Metrics collection (1-second scrape intervals)
- **Grafana** - Real-time visualization dashboards
- **Loki** - Log aggregation
- **Promtail** - Log collection
- **MongoDB Exporter** - Database metrics
- **Node Exporter** - Host system metrics
- **cAdvisor** - Container metrics
- **Custom Node.js metrics** - Application-specific metrics

## 🚀 Quick Start

### 1. Start the Complete Stack
```bash
cd docker
docker compose up -d --build
```

### 2. Access the Monitoring Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana Dashboard** | http://localhost:3001 | Real-time monitoring dashboard |
| **Prometheus** | http://localhost:9090 | Metrics collection interface |
| **API Health** | http://localhost:3000/health | API health check |
| **API Metrics** | http://localhost:9464/metrics | Application metrics endpoint |
| **Container Metrics** | http://localhost:8080 | cAdvisor container metrics |

### 3. Grafana Login
- **Username**: `admin`
- **Password**: `admin123` (can be changed via `GRAFANA_PASSWORD` env var)

## 📈 Real-time Dashboard Features

The **"Streams PoC - Real-time Monitoring Dashboard"** includes:

### 🔥 1-Second Real-time Updates
- **API Request Rate** - Live request per second tracking
- **Response Time Percentiles** - 95th percentile response times
- **System Resource Usage** - CPU, Memory (Host + Container)
- **MongoDB Operations** - Database operations in real-time
- **Application Logs** - Live log streaming

### 📊 Key Metrics Tracked
- HTTP request duration and count by method/route/status
- Active connections monitoring
- MongoDB operations (find, insert, delete, count)
- System CPU and memory usage
- Container resource utilization
- Application logs with structured JSON parsing

## 🛠️ Integration Instructions

### Node.js Application Metrics

The application is automatically configured with metrics tracking:

```typescript
// Metrics are automatically collected for:
// - HTTP requests (duration, count, status codes)
// - MongoDB operations (with timing)
// - System memory usage
// - Active connections

// Custom metrics can be added using:
import { MetricsAdapter } from './infrastructure/adapters/metrics.adapter';

const metrics = MetricsAdapter.getInstance();
metrics.recordMongoOperation('custom_operation', 'collection_name', duration);
```

### Environment Variables

Key configuration options:

```bash
# API Configuration
PORT=3000
METRICS_PORT=9464

# MongoDB Configuration
MONGO_USERNAME=admin
MONGO_PASSWORD=password123
MONGO_DATABASE=streams_poc

# Grafana Configuration
GRAFANA_PASSWORD=admin123

# Logging
LOG_LEVEL=info
```

## 🎯 PoC Demonstration Guide

### Real-time Visualization Test

1. **Start the stack** and open Grafana dashboard
2. **Make API calls** to see instant metric updates:
   ```bash
   # Test API requests for real-time metrics
   curl http://localhost:3000/api/documents/status
   curl http://localhost:3000/api/documents/clear
   ```
3. **Watch the dashboard** - metrics update every **1 second**
4. **Generate load** for dramatic visualization:
   ```bash
   # Generate multiple requests to see rate changes
   for i in {1..10}; do curl http://localhost:3000/api/documents/status & done
   ```

### Key Demo Points

- **Instant Feedback**: All metrics appear within 1 second
- **Real-time Logs**: Application logs stream live in Grafana
- **Resource Monitoring**: CPU/Memory changes visible immediately
- **Database Operations**: MongoDB metrics update with each operation
- **System Health**: Complete stack monitoring in one dashboard

## 🔧 Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   docker compose logs -f [service-name]
   ```

2. **No metrics in Grafana**:
   - Check Prometheus targets: http://localhost:9090/targets
   - Verify API metrics endpoint: http://localhost:9464/metrics

3. **Dashboard not loading**:
   - Ensure Grafana has started completely
   - Check datasource connections in Grafana settings

4. **Logs not appearing**:
   - Verify Promtail is collecting logs: `docker compose logs promtail`
   - Check Loki ingestion: http://localhost:3100/ready

### Checking Service Health

```bash
# Check all services
docker compose ps

# View specific service logs
docker compose logs -f grafana
docker compose logs -f prometheus
docker compose logs -f api

# Restart specific service
docker compose restart [service-name]
```

## 📦 Directory Structure

```
docker/
├── docker-compose.yml              # Complete stack configuration
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml          # 1-second scrape intervals
│   ├── loki/
│   │   └── loki-config.yml         # Log aggregation config
│   ├── promtail/
│   │   └── promtail-config.yml     # Log collection config
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/        # Auto-configured datasources
│       │   └── dashboards/         # Dashboard provisioning
│       └── dashboards/
│           └── streams-overview.json # Real-time dashboard
```

## 🎨 Custom Metrics

### Adding Business Metrics

```typescript
// Example: Track custom business events
const metrics = MetricsAdapter.getInstance();

// Custom counter
metrics.httpRequestsTotal.inc({
  method: 'POST',
  route: '/custom-endpoint',
  status_code: '200'
});

// Custom histogram
metrics.httpRequestDuration.observe(
  { method: 'GET', route: '/custom' },
  responseTime
);
```

### Dashboard Customization

1. **Edit dashboard** in Grafana UI
2. **Export JSON** and save to `monitoring/grafana/dashboards/`
3. **Restart Grafana** to load changes:
   ```bash
   docker compose restart grafana
   ```

## 🔍 Monitoring Stack Health

### Quick Health Check
```bash
# API Health
curl http://localhost:3000/health

# Metrics Endpoint
curl http://localhost:9464/metrics

# Prometheus Health
curl http://localhost:9090/-/healthy

# Grafana Health
curl http://localhost:3001/api/health
```

### Performance Optimization

For production use, adjust these settings:
- Increase scrape intervals (currently 1s for PoC)
- Extend retention periods (currently 2h for PoC)
- Optimize resource limits based on actual usage

## 🎬 Demo Script

For live demonstrations:

1. **Open Grafana dashboard** (http://localhost:3001)
2. **Show baseline metrics** - system idle state
3. **Make API calls** - demonstrate instant metric updates
4. **Generate load** - show scaling visualization
5. **Check logs** - demonstrate log correlation with metrics
6. **Resource usage** - show real-time system impact

The entire stack is optimized for **immediate visual feedback** perfect for PoC presentations!

## 📧 Support

For issues or questions:
1. Check service logs: `docker compose logs [service-name]`
2. Verify configuration files in `monitoring/` directory
3. Test individual endpoints for connectivity
4. Review this documentation for troubleshooting steps