#!/bin/bash

# MongoDB Streams POC - Complete Setup Script
# This script provides different startup options for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}"
    echo "=================================================================="
    echo "$1"
    echo "=================================================================="
    echo -e "${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_status "Docker is running"
}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local port=$2
    local host=${3:-localhost}
    local timeout=${4:-300}
    
    print_info "Waiting for $service_name to be ready on $host:$port..."
    
    elapsed=0
    while ! nc -z $host $port 2>/dev/null; do
        if [ $elapsed -ge $timeout ]; then
            print_error "Timeout waiting for $service_name"
            return 1
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        if [ $((elapsed % 30)) -eq 0 ]; then
            print_info "Still waiting for $service_name... (${elapsed}s elapsed)"
        fi
    done
    
    print_status "$service_name is ready!"
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local url=$2
    
    print_info "Checking $service_name health..."
    if curl -s "$url" > /dev/null; then
        print_status "$service_name is healthy"
        return 0
    else
        print_warning "$service_name may not be fully ready yet"
        return 1
    fi
}

# Function to start full monitoring stack
start_full_stack() {
    print_header "🚀 Starting Full Monitoring Stack"
    
    check_docker
    
    cd docker
    
    print_info "Starting all services..."
    docker compose up -d
    
    print_info "Waiting for core services..."
    wait_for_service "MongoDB" 27017
    wait_for_service "API Server" 3000
    wait_for_service "Prometheus" 9090
    wait_for_service "ClickHouse" 8123
    wait_for_service "Coroot" 8080
    
    print_info "Checking service health..."
    sleep 10
    
    # Health checks
    check_service_health "API" "http://localhost:3000/health"
    check_service_health "Prometheus" "http://localhost:9090/-/ready"
    
    print_status "All services are running!"
    
    cd ..
}

# Function to start minimal stack (just API + MongoDB)
start_minimal() {
    print_header "🔧 Starting Minimal Stack (API + MongoDB)"
    
    check_docker
    
    cd docker
    
    print_info "Starting minimal services..."
    docker compose up -d mongodb api
    
    wait_for_service "MongoDB" 27017
    wait_for_service "API Server" 3000
    
    check_service_health "API" "http://localhost:3000/health"
    
    print_status "Minimal stack is running!"
    
    cd ..
}

# Function to seed database
seed_database() {
    local count=${1:-100000}
    
    print_header "🌱 Seeding Database with $count documents"
    
    print_info "Seeding database..."
    TOTAL_DOCUMENTS=$count npm run seed
    
    print_status "Database seeded successfully!"
}

# Function to run tests
run_tests() {
    print_header "🧪 Running Performance Tests"
    
    print_info "Testing stream processing..."
    curl -s -X POST http://localhost:3000/api/process/stream \
        -H "Content-Type: application/json" \
        -d '{"limit": 5000}' | jq '.data.performance.totalTimeFormatted, .data.memoryUsed.humanReadable'
    
    print_info "Testing traditional processing..."
    curl -s -X POST http://localhost:3000/api/process/no-stream \
        -H "Content-Type: application/json" \
        -d '{"limit": 5000}' | jq '.data.performance.totalTimeFormatted, .data.memoryUsed.humanReadable'
    
    print_info "Running comparison..."
    curl -s -X POST http://localhost:3000/api/compare \
        -H "Content-Type: application/json" \
        -d '{"limit": 3000}' | jq '.data.summary'
    
    print_status "Tests completed!"
}

# Function to show access points
show_access_points() {
    print_header "🌟 Access Points"
    
    echo -e "${CYAN}📊 Monitoring Dashboards:${NC}"
    echo "   Coroot (Main):          http://localhost:8080"
    echo "   Prometheus:             http://localhost:9090"
    echo "   Grafana:                http://localhost:3001 (admin/admin123)"
    echo "   cAdvisor:               http://localhost:8081"
    echo ""
    echo -e "${CYAN}🌐 API Endpoints:${NC}"
    echo "   API Documentation:      http://localhost:3000"
    echo "   Health Check:           http://localhost:3000/health"
    echo "   Database Status:        http://localhost:3000/api/status"
    echo "   Metrics:                http://localhost:3000/metrics"
    echo ""
    echo -e "${CYAN}🧪 Quick Test Commands:${NC}"
    echo "   Stream Processing:      curl -X POST http://localhost:3000/api/process/stream -H 'Content-Type: application/json' -d '{\"limit\": 5000}'"
    echo "   Traditional Processing: curl -X POST http://localhost:3000/api/process/no-stream -H 'Content-Type: application/json' -d '{\"limit\": 5000}'"
    echo "   Compare Methods:        curl -X POST http://localhost:3000/api/compare -H 'Content-Type: application/json' -d '{\"limit\": 3000}'"
    echo ""
}

# Function to show usage
show_usage() {
    echo -e "${PURPLE}MongoDB Streams POC - Startup Script${NC}"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  full          Start complete stack with monitoring (recommended)"
    echo "  minimal       Start only API + MongoDB"
    echo "  seed [count]  Seed database with documents (default: 100000)"
    echo "  test          Run performance tests"
    echo "  status        Show service status"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  logs          Show logs from all services"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 full                 # Start everything with monitoring"
    echo "  $0 minimal              # Start just API and database"
    echo "  $0 seed 50000          # Seed with 50k documents"
    echo "  $0 test                 # Run performance tests"
    echo ""
}

# Main script logic
case "${1:-help}" in
    "full")
        start_full_stack
        seed_database 100000
        show_access_points
        print_header "🎯 Ready for Monitoring & Testing!"
        print_info "Open Coroot dashboard: http://localhost:8080"
        print_info "Run: $0 test to generate metrics"
        ;;
    
    "minimal")
        start_minimal
        seed_database 100000
        print_header "🎯 Minimal Stack Ready!"
        print_info "API available at: http://localhost:3000"
        ;;
    
    "seed")
        seed_database ${2:-100000}
        ;;
    
    "test")
        run_tests
        ;;
    
    "status")
        cd docker
        docker compose ps
        ;;
    
    "stop")
        print_info "Stopping all services..."
        cd docker
        docker compose down
        print_status "All services stopped"
        ;;
    
    "restart")
        print_info "Restarting services..."
        cd docker
        docker compose down
        docker compose up -d
        print_status "Services restarted"
        ;;
    
    "logs")
        cd docker
        docker compose logs -f
        ;;
    
    "help"|*)
        show_usage
        ;;
esac
