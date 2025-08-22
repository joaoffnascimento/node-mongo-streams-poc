# Streams API - Dedicated Monitoring Dashboards

This document provides comprehensive information about the three specialized Grafana dashboards focused exclusively on the **streams-api** container performance, operations, and health monitoring.

## Dashboard Overview

### Location
All API-focused dashboards are located in:
```
docker/monitoring/grafana/api-dashboards/
```

### Dashboard Collection

#### 1. **API Performance Monitoring**
- **File**: `1-api-performance.json`
- **UID**: `streams-api-performance`
- **Focus**: HTTP performance, Node.js metrics, and resource utilization
- **Update Frequency**: 1 second real-time

#### 2. **API Operations Dashboard**
- **File**: `2-api-operations.json`
- **UID**: `streams-api-operations`  
- **Focus**: Business metrics, endpoint analysis, and operational insights
- **Update Frequency**: 1 second real-time

#### 3. **API Health Dashboard**
- **File**: `3-api-health.json`
- **UID**: `streams-api-health`
- **Focus**: Real-time health status, SLA compliance, and alerting
- **Update Frequency**: 1 second real-time

## Dashboard 1: API Performance Monitoring

### **HTTP Performance Section**
- **API Request Rate by Endpoint**: Real-time requests per second breakdown by endpoint and HTTP method
- **API Response Time Distribution**: Response time percentiles (50th, 95th, 99th) and average latency
- **HTTP Status Code Distribution**: Visual breakdown of success vs error responses with color coding

### **Node.js Performance Section**
- **Node.js Event Loop Performance**: Event loop lag monitoring with health thresholds
- **API Process Memory Usage**: Resident, heap, and virtual memory tracking

### **Resource Utilization Section**
- **API CPU Utilization**: Container and process-level CPU usage with efficiency metrics
- **API Memory Utilization**: Memory usage vs container limits with visual indicators
- **API Process Health**: File descriptors, uptime, and process stability metrics

### **Key Metrics Used**
- `http_requests_total` - HTTP request counters
- `http_request_duration_ms` - Response time histograms
- `nodejs_eventloop_lag_seconds` - Event loop performance
- `process_resident_memory_bytes` - Memory usage
- `container_cpu_usage_seconds_total` - CPU utilization
- `container_memory_usage_bytes` - Container memory

### **Alert Thresholds**
- **Response Time**: Green <100ms, Yellow 100-500ms, Red >500ms
- **Event Loop Lag**: Green <10ms, Yellow 10-100ms, Red >100ms
- **CPU Usage**: Green <70%, Yellow 70-85%, Red >85%
- **Memory Usage**: Green <70%, Yellow 70-85%, Red >85%

## Dashboard 2: API Operations Dashboard

### **Business Operations Section**
- **Total API Requests (Cumulative)**: Complete request history with endpoint breakdown
- **API Success Rate & Availability**: Success rate and availability percentage tracking

### **Endpoint Analysis Section**
- **Requests by Endpoint**: Pie chart showing most frequently accessed endpoints
- **Requests by HTTP Method**: Distribution of GET, POST, PUT, DELETE requests
- **Response Status Codes**: Visual breakdown of 2xx, 4xx, 5xx responses

### **Performance Insights Section**
- **Average Response Time by Endpoint**: Performance comparison across endpoints
- **Request Rate by Endpoint**: Traffic comparison between different API routes

### **Error Analysis Section**
- **API Error Rates**: 4xx and 5xx error rate tracking over time
- **Slowest Endpoints (95th Percentile)**: Identification of performance bottlenecks

### **Key Business Metrics**
- **Total Requests**: Cumulative API usage
- **Success Rate**: `(2xx responses / total responses) * 100`
- **Availability**: `(non-5xx responses / total responses) * 100`
- **Error Rate**: `(4xx + 5xx responses / total responses) * 100`

### **Operational Insights**
- Most popular endpoints identification
- Traffic pattern analysis
- Performance trend monitoring
- Error pattern detection

## Dashboard 3: API Health Dashboard

### **Health & Status Overview Section**
- **API Status**: Real-time UP/DOWN indicator
- **Current RPS**: Live requests per second gauge
- **Average Response Time**: Current performance indicator
- **Error Rate**: Real-time error percentage

### **Real-time Health Monitoring Section**
- **Real-time Response Time SLA**: Performance against SLA thresholds
- **API Throughput by Status**: Request rate breakdown by response status

### **Advanced Health Metrics Section**
- **Event Loop Health**: Node.js event loop lag monitoring
- **Memory Health**: Memory utilization percentage tracking
- **Container Stability**: Uptime and restart tracking

### **Alerting & SLA Section**
- **SLA Compliance Monitoring**: Availability and response time SLA tracking

### **Health Indicators**
- **API Status**: Binary UP (1) / DOWN (0) indicator
- **Health Thresholds**:
  - RPS: Green <50, Yellow 50-100, Red >100
  - Response Time: Green <100ms, Yellow 100-500ms, Red >500ms
  - Error Rate: Green <1%, Yellow 1-5%, Red >5%
  - Event Loop: Green <10ms, Yellow 10-100ms, Red >100ms

### **SLA Targets**
- **Availability SLA**: 99.9% (max 0.1% 5xx errors)
- **Response Time SLA**: 95th percentile <500ms
- **Uptime SLA**: Container stability tracking

## Metrics Deep Dive

### **HTTP Metrics from streams-api:9464**
```
http_requests_total{method,route,status_code}     # Request counters
http_request_duration_ms_bucket{method,route}     # Response time histogram
http_request_duration_ms_sum{method,route}        # Total response time
http_request_duration_ms_count{method,route}      # Request count for averaging
```

### **Node.js Process Metrics**
```
nodejs_eventloop_lag_seconds                      # Event loop performance
nodejs_eventloop_lag_min_seconds                  # Minimum lag
nodejs_eventloop_lag_max_seconds                  # Maximum lag
nodejs_eventloop_lag_mean_seconds                 # Average lag
nodejs_eventloop_lag_p50_seconds                  # 50th percentile lag
nodejs_eventloop_lag_p99_seconds                  # 99th percentile lag
```

### **Process Metrics**
```
process_cpu_user_seconds_total                    # User CPU time
process_cpu_system_seconds_total                  # System CPU time
process_cpu_seconds_total                         # Total CPU time
process_resident_memory_bytes                     # RAM usage
process_virtual_memory_bytes                      # Virtual memory
process_heap_bytes                                # Heap memory
process_open_fds                                  # File descriptors
process_max_fds                                   # Max file descriptors
process_start_time_seconds                        # Process start time
```

### **Container Metrics (from cAdvisor)**
```
container_cpu_usage_seconds_total{name="streams-api"}      # Container CPU
container_memory_usage_bytes{name="streams-api"}           # Container memory
container_spec_memory_limit_bytes{name="streams-api"}      # Memory limits
container_start_time_seconds{name="streams-api"}           # Container start
```

## Usage Guide

### **Accessing the Dashboards**

1. **Open Grafana**: http://localhost:3001
2. **Login**: admin / admin123
3. **Navigate**: Dashboards → Browse → api-dashboards folder
4. **Select**: Any of the three API-focused dashboards

### **Dashboard Navigation**

#### **Performance Dashboard Usage**
- Monitor real-time API performance during load tests
- Track Node.js event loop health during high traffic
- Identify resource bottlenecks and capacity limits
- Monitor memory usage patterns and potential leaks

#### **Operations Dashboard Usage**
- Analyze endpoint popularity and usage patterns
- Track business metrics and API adoption
- Identify error trends and problematic endpoints
- Monitor overall API success rates and availability

#### **Health Dashboard Usage**
- Real-time health monitoring during live demos
- SLA compliance tracking and alerting
- Quick status overview for operations teams
- Health trend analysis for capacity planning

### **Demo Scenarios**

#### **Scenario 1: API Load Testing**
```bash
# Generate API load
for i in {1..100}; do
  curl http://localhost:3000/health &
done
wait

# Watch Performance Dashboard for:
# - CPU and memory spikes
# - Response time increases
# - Event loop lag
```

#### **Scenario 2: Error Rate Analysis**
```bash
# Generate some 404 errors
for i in {1..20}; do
  curl http://localhost:3000/nonexistent &
done

# Watch Operations Dashboard for:
# - Error rate increases
# - Status code distribution changes
# - Endpoint error patterns
```

#### **Scenario 3: Health Monitoring**
```bash
# Monitor during normal operations
curl http://localhost:3000/health

# Watch Health Dashboard for:
# - Real-time status indicators
# - SLA compliance
# - Health trends
```

### **Alert Configuration**

The dashboards include visual threshold indicators but can be extended with Grafana alerting:

#### **Recommended Alerts**
- **High Error Rate**: >5% error rate for 2 minutes
- **High Response Time**: 95th percentile >500ms for 1 minute
- **Event Loop Lag**: >100ms for 30 seconds
- **High Memory Usage**: >85% of container limit for 2 minutes
- **API Down**: No requests for 1 minute

#### **Alert Channels**
- Email notifications
- Slack integration
- PagerDuty for critical alerts
- Webhook notifications

## Performance Baseline

### **Expected Performance Metrics**

#### **Healthy API Metrics**
- **Response Time**: 50th percentile <50ms, 95th percentile <200ms
- **Error Rate**: <1% total error rate
- **Event Loop Lag**: <10ms under normal load
- **CPU Usage**: <50% under normal load
- **Memory Usage**: <60% of container limit

#### **Warning Thresholds**
- **Response Time**: 95th percentile >200ms
- **Error Rate**: >1% but <5%
- **Event Loop Lag**: >10ms but <100ms
- **CPU Usage**: >70% but <85%
- **Memory Usage**: >70% but <85%

#### **Critical Thresholds**
- **Response Time**: 95th percentile >500ms
- **Error Rate**: >5%
- **Event Loop Lag**: >100ms
- **CPU Usage**: >85%
- **Memory Usage**: >85%

## Troubleshooting

### **High Response Time**
1. Check Event Loop Lag (Node.js performance)
2. Monitor CPU utilization (resource constraint)
3. Analyze endpoint-specific performance
4. Check memory usage patterns

### **High Error Rate**
1. Identify specific endpoints with errors
2. Check HTTP status code distribution
3. Monitor for 5xx vs 4xx error patterns
4. Correlate with resource usage spikes

### **High Memory Usage**
1. Monitor heap vs resident memory
2. Check for memory leak patterns
3. Analyze request volume correlation
4. Monitor garbage collection patterns

### **Event Loop Issues**
1. Check for blocking operations
2. Monitor CPU usage correlation
3. Analyze request processing patterns
4. Look for synchronous operations

## Export and Integration

### **Dashboard Export**
- All dashboards support JSON export for backup
- Template variables allow easy customization
- Panels can be embedded in external applications

### **Metrics Integration**
- All metrics are available via Prometheus API
- Support for custom alerting rules
- Integration with external monitoring systems
- API for programmatic access to metrics

## Conclusion

These three API-focused dashboards provide comprehensive monitoring for the streams-api container with:

- **Real-time performance tracking** with 1-second updates
- **Business metrics analysis** for operational insights
- **Health monitoring** with SLA compliance tracking
- **Deep Node.js insights** for application-specific monitoring
- **Visual alerting** with color-coded thresholds
- **Demo-ready visualizations** for PoC presentations

The dashboards are designed to work together, providing different perspectives on the same underlying metrics while maintaining focus on the streams-api container exclusively.