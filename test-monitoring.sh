#!/bin/bash

echo "🧪 Testing Real-time Monitoring Stack"
echo "======================================"

echo "📊 Checking Service Health..."

# Check API Health
echo "API Health:"
curl -s http://localhost:3000/health | jq .

# Check Metrics Endpoint
echo -e "\n📈 Metrics Endpoint (first 10 lines):"
curl -s http://localhost:9464/metrics | head -10

# Check Prometheus Health
echo -e "\n🔍 Prometheus Health:"
curl -s http://localhost:9090/-/healthy

# Check Grafana Health
echo -e "\n📊 Grafana Health:"
curl -s http://localhost:3001/api/health | jq .

echo -e "\n🚀 Generating Test Traffic..."

# Generate some API calls to create metrics
for i in {1..5}; do
  echo "Making API call $i..."
  curl -s http://localhost:3000/health > /dev/null
  curl -s http://localhost:3000/api/documents/status > /dev/null
  sleep 1
done

echo -e "\n📊 Current HTTP Metrics:"
curl -s http://localhost:9464/metrics | grep -E "http_requests_total|http_active_connections"

echo -e "\n🎯 Access Points:"
echo "• Grafana Dashboard: http://localhost:3001 (admin/admin123)"
echo "• Prometheus: http://localhost:9090"
echo "• API: http://localhost:3000"
echo "• Metrics: http://localhost:9464/metrics"
echo "• Container Metrics: http://localhost:8080"

echo -e "\n✅ Monitoring Stack Test Complete!"
echo "🔥 Real-time metrics updating every 1 second!"