# Specialized Monitoring Dashboards

This document provides comprehensive information about the three specialized Grafana dashboards designed for deep monitoring and PoC demonstrations with 1-second real-time updates.

## Dashboard Overview

### 1. Container Resources Deep Monitoring
- **File**: `1-container-resources.json`
- **UID**: `container-resources`
- **Focus**: Container CPU and memory performance analysis
- **Update Frequency**: 1 second

### 2. Network Monitoring Deep Dive
- **File**: `2-network-monitoring.json`
- **UID**: `network-monitoring`
- **Focus**: Network traffic, connectivity, and inter-service communication
- **Update Frequency**: 1 second

### 3. MongoDB Deep Dive Monitoring
- **File**: `3-mongodb-deep-dive.json`
- **UID**: `mongodb-deep-dive`
- **Focus**: MongoDB performance, WiredTiger engine, and query analysis
- **Update Frequency**: 1 second

## Enhanced Monitoring Stack

### New Components Added

#### Netdata
- **Port**: 19999
- **Purpose**: Enhanced system and network metrics
- **Capabilities**: Real-time system monitoring with sub-second granularity

#### Blackbox Exporter
- **Port**: 9115
- **Purpose**: Network connectivity testing
- **Tests**: HTTP endpoints, TCP ports, service health checks

#### Process Exporter
- **Port**: 9256
- **Purpose**: Enhanced process monitoring
- **Tracking**: MongoDB, Node.js, and all monitoring services

#### Enhanced MongoDB Exporter
- **Additional Metrics**: Index usage, collection stats, top metrics, diagnostic data
- **Profiling**: Enabled slow query collection and analysis

## Dashboard 1: Container Resources Deep Monitoring

### Key Sections

#### Container CPU Monitoring
- **Container CPU Usage (%)**: Real-time CPU percentage with color-coded thresholds
  - Green: <70%, Yellow: 70-85%, Red: >85%
- **Container CPU Cores Usage vs Limits**: Individual core usage and limit comparison
- **Container CPU Throttling**: Detection of CPU limit hits and throttling events

#### Container Memory Monitoring
- **Container Memory Usage vs Limits**: Memory consumption with limit visualization
- **Container Memory Breakdown**: RSS, Cache, Swap usage per container
- **Memory Pressure & OOM Events**: Out-of-memory kills and pressure indicators

#### Container Lifecycle & Efficiency
- **Container Restart Count**: Stability tracking with 1-hour windows
- **Resource Efficiency**: CPU/Memory utilization vs limits ratio
- **Container Uptime**: Lifecycle tracking and availability

### Key Metrics
- `container_cpu_usage_seconds_total` - CPU usage tracking
- `container_memory_usage_bytes` - Memory consumption
- `container_spec_cpu_quota` - CPU limits
- `container_spec_memory_limit_bytes` - Memory limits
- `container_memory_rss` - Resident Set Size
- `container_memory_cache` - Cache memory
- `container_memory_swap` - Swap usage
- `container_start_time_seconds` - Container lifecycle

### Alert Thresholds
- **CPU**: Yellow >70%, Red >85%
- **Memory**: Yellow >70%, Red >85%
- **Restarts**: Yellow ≥1, Red ≥3

## Dashboard 2: Network Monitoring Deep Dive

### Key Sections

#### Network Traffic Overview
- **Container Network Traffic**: RX/TX bytes per container with bidirectional view
- **Host Network Interface Traffic**: Physical interface monitoring

#### Network Connectivity & Latency
- **HTTP Connectivity Success Rate**: Service availability testing
- **TCP Connectivity Success Rate**: Port reachability testing
- **Network Latency & Response Times**: End-to-end performance measurement

#### Network Connections & Error Analysis
- **Active Network Connections**: Real-time connection counting
- **TCP Connection States**: ESTABLISHED, TIME_WAIT state breakdown
- **Network Errors & Packet Loss**: Error rate and drop detection

#### Inter-Service Communication Matrix
- **HTTP Requests Between Services**: Service-to-service communication patterns
- **Docker Network Bridge Traffic**: Container network performance

### Key Metrics
- `container_network_receive_bytes_total` - Container network RX
- `container_network_transmit_bytes_total` - Container network TX
- `node_network_receive_bytes_total` - Host interface RX
- `node_network_transmit_bytes_total` - Host interface TX
- `probe_success` - Connectivity test results
- `probe_duration_seconds` - Network latency
- `node_network_receive_errs_total` - Network errors
- `http_requests_total` - Inter-service requests

### Connectivity Tests
- **HTTP Endpoints**:
  - `http://api:3000/health` - API health check
  - `http://grafana:3000/login` - Grafana accessibility
  - `http://prometheus:9090/` - Prometheus web UI

- **TCP Ports**:
  - `mongodb:27017` - MongoDB connection
  - `prometheus:9090` - Prometheus port
  - `grafana:3000` - Grafana port
  - `loki:3100` - Loki port

## Dashboard 3: MongoDB Deep Dive Monitoring

### Key Sections

#### MongoDB Performance Overview
- **MongoDB Operations per Second**: Insert, Query, Update, Delete breakdown
- **MongoDB Connection Pool**: Active, available, and total connections

#### Query Performance & Indexing
- **Query Execution Time & Latency**: Read/Write/Command latency analysis
- **Index Performance & Query Scanning**: Document scanning efficiency

#### WiredTiger Storage Engine & Memory
- **WiredTiger Cache Hit Ratio**: Cache performance indicator
- **WiredTiger Cache Memory Usage**: Cache utilization and limits
- **WiredTiger Cache Eviction Rate**: Memory pressure indicators

#### Database Storage & Real-time Operations
- **Database Storage Size**: Data and index size growth
- **Current Operations & Queue Depth**: Real-time operation monitoring
- **Collection & Document Statistics**: Database content metrics

#### Resource Utilization & Error Monitoring
- **MongoDB Resource Utilization**: CPU and memory usage
- **MongoDB Error Rates & Assertions**: Error tracking and alerting

### Key Metrics
- `mongodb_op_counters_total` - Operation counters
- `mongodb_connections` - Connection pool status
- `mongodb_mongod_op_latencies_latency_total` - Query latency
- `mongodb_mongod_wiredtiger_cache_bytes` - Cache metrics
- `mongodb_mongod_db_data_size_bytes` - Database size
- `mongodb_mongod_db_index_size_bytes` - Index size
- `mongodb_mongod_global_lock_current_queue` - Lock queues
- `mongodb_mongod_asserts_total` - Error assertions

### Performance Indicators
- **Cache Hit Ratio**: Target >95% (Red <80%, Yellow 80-95%, Green >95%)
- **Query Latency**: Target <100ms (Green <100ms, Yellow 100-1000ms, Red >1000ms)
- **Connection Pool**: Monitor utilization vs available connections
- **Queue Depth**: Watch for read/write queue buildup

## Usage Instructions

### Starting the Enhanced Monitoring Stack

```bash
# Navigate to docker directory
cd /home/joaofelipe/git/personal/streams-poc/docker

# Start all services
docker compose up -d

# Verify all services are running
docker compose ps
```

### Service Access URLs
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Netdata**: http://localhost:19999
- **MongoDB Exporter**: http://localhost:9216/metrics
- **Blackbox Exporter**: http://localhost:9115/metrics
- **cAdvisor**: http://localhost:8080

### Dashboard Access
1. Open Grafana at http://localhost:3001
2. Login with admin/admin123
3. Navigate to Dashboards → Browse
4. Select any of the three specialized dashboards:
   - Container Resources Deep Monitoring
   - Network Monitoring Deep Dive
   - MongoDB Deep Dive Monitoring

### Real-time Demo Features

#### Container Resources Dashboard
- Watch CPU usage spike during load tests
- Monitor memory consumption patterns
- Track container restart events
- Observe resource efficiency metrics

#### Network Monitoring Dashboard
- Monitor real-time network traffic
- Track service connectivity health
- Analyze network latency patterns
- Observe inter-service communication

#### MongoDB Deep Dive Dashboard
- Monitor operation rates in real-time
- Track query performance and slow queries
- Watch WiredTiger cache performance
- Monitor connection pool utilization

## Troubleshooting

### Common Issues

#### Missing Metrics
```bash
# Check service health
docker compose ps

# Verify Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check specific exporter metrics
curl http://localhost:9216/metrics  # MongoDB
curl http://localhost:9115/metrics  # Blackbox
curl http://localhost:19999/api/v1/allmetrics?format=prometheus  # Netdata
```

#### Performance Impact
- 1-second scraping may increase resource usage
- Monitor system resources during demo
- Adjust scrape intervals if needed in prometheus.yml

#### Network Connectivity Tests
```bash
# Test blackbox exporter manually
curl "http://localhost:9115/probe?target=http://api:3000/health&module=http_2xx"
```

### Configuration Files

#### Enhanced Monitoring Configurations
- `monitoring/blackbox/blackbox.yml` - Network probe configuration
- `monitoring/process-exporter/process-exporter.yml` - Process monitoring
- `monitoring/prometheus/prometheus.yml` - Updated with new targets

#### Dashboard Templates
All dashboards include:
- Variable templates for filtering
- Color-coded thresholds
- Real-time refresh capabilities
- Mobile-responsive design
- Export-ready configurations

## Performance Considerations

### Resource Usage
- Prometheus with 1-second scraping: ~100MB RAM, 10% CPU
- Enhanced MongoDB Exporter: ~50MB RAM, 5% CPU
- Netdata: ~150MB RAM, 15% CPU
- Total overhead: ~300MB RAM, 30% CPU

### Retention Settings
- Prometheus: 2 hours (configured for PoC)
- Adjust `--storage.tsdb.retention.time` for longer demos

### Optimization Tips
1. Use time range selectors during demos
2. Focus on specific containers/services when needed
3. Leverage dashboard variables for filtering
4. Monitor host system resources during intensive demos

## Demo Scenarios

### Scenario 1: Container Resource Stress Test
1. Open Container Resources Dashboard
2. Run CPU-intensive operations
3. Watch real-time CPU usage and throttling
4. Monitor memory consumption patterns

### Scenario 2: Network Performance Analysis
1. Open Network Monitoring Dashboard
2. Generate network traffic between services
3. Monitor connectivity health
4. Analyze latency patterns

### Scenario 3: Database Performance Deep Dive
1. Open MongoDB Deep Dive Dashboard
2. Execute database operations
3. Monitor query performance
4. Watch cache efficiency and connection patterns

## Advanced Features

### Custom Alerts
Dashboards are configured with threshold-based alerting:
- Resource utilization alerts
- Network connectivity alerts
- Database performance alerts

### Export Capabilities
All dashboards support:
- PNG/PDF export
- JSON export for backup/sharing
- Panel embedding for reports
- Data export for analysis

### Dashboard Customization
- Use template variables for dynamic filtering
- Adjust time ranges for different demo scenarios
- Customize color schemes and thresholds
- Add annotations for important events

This monitoring setup provides comprehensive, real-time visibility into container resources, network performance, and MongoDB operations with 1-second granularity, perfect for PoC demonstrations and detailed performance analysis.