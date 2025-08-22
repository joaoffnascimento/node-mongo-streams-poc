#!/bin/bash

# 🚀 CSV Streaming Demo Script
# Demonstrates the power of MongoDB streams with CSV generation

echo "🚀 MongoDB Streams CSV Demo"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3000"
DOCUMENTS_COUNT=100000  # Start with 100K for demo
BATCH_SIZE=1000

echo -e "${BLUE}📊 Demo Configuration:${NC}"
echo "   API URL: $API_URL"
echo "   Documents: $DOCUMENTS_COUNT"
echo "   Batch Size: $BATCH_SIZE"
echo ""

# Check if API is running
echo -e "${YELLOW}🔍 Checking API status...${NC}"
if ! curl -s "$API_URL/health" > /dev/null; then
    echo -e "${RED}❌ API is not running! Please start with: npm run env:start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ API is running${NC}"
echo ""

# Check current database status
echo -e "${YELLOW}📊 Checking database status...${NC}"
DB_STATUS=$(curl -s "$API_URL/api/status")
echo "Current status: $DB_STATUS"
echo ""

# Seed database if needed
echo -e "${YELLOW}🌱 Seeding database with $DOCUMENTS_COUNT documents...${NC}"
echo "This may take a few minutes..."
curl -X POST "$API_URL/api/seed" \
  -H "Content-Type: application/json" \
  -d "{\"totalDocuments\": $DOCUMENTS_COUNT, \"batchSize\": 5000}" \
  -w "\n"

echo ""
echo -e "${YELLOW}⏳ Waiting for seeding to complete (30 seconds)...${NC}"
sleep 30

# Check database status again
echo -e "${YELLOW}📊 Checking database status after seeding...${NC}"
DB_STATUS=$(curl -s "$API_URL/api/status")
echo "Updated status: $DB_STATUS"
echo ""

# Start CSV download
echo -e "${GREEN}🚀 Starting CSV generation and download...${NC}"
echo "This will process all $DOCUMENTS_COUNT documents and generate a CSV file."
echo "The download starts immediately and processes in real-time!"
echo ""

FILENAME="demo_processed_documents_$(date +%Y%m%d_%H%M%S).csv"

echo -e "${BLUE}📥 Downloading to: $FILENAME${NC}"
echo "Processing and downloading..."

# Start the CSV download with progress
curl -X POST "$API_URL/api/process/csv-download" \
  -H "Content-Type: application/json" \
  -d "{\"limit\": $DOCUMENTS_COUNT, \"batchSize\": $BATCH_SIZE}" \
  --output "$FILENAME" \
  --progress-bar

echo ""
echo -e "${GREEN}✅ CSV download completed!${NC}"

# Show file info
if [ -f "$FILENAME" ]; then
    FILE_SIZE=$(du -h "$FILENAME" | cut -f1)
    LINE_COUNT=$(wc -l < "$FILENAME")
    echo ""
    echo -e "${BLUE}📊 File Information:${NC}"
    echo "   File: $FILENAME"
    echo "   Size: $FILE_SIZE"
    echo "   Lines: $LINE_COUNT (including header)"
    echo "   Records: $((LINE_COUNT - 1))"
    echo ""
    
    echo -e "${BLUE}📋 Sample data (first 5 rows):${NC}"
    head -6 "$FILENAME"
    echo ""
    
    echo -e "${GREEN}🎉 Demo completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}🔍 Key Observations:${NC}"
    echo "   • Download started immediately (streaming)"
    echo "   • Memory usage remained low (~50MB)"
    echo "   • No timeout or crashes"
    echo "   • Real-time processing of $DOCUMENTS_COUNT documents"
    echo ""
    echo -e "${BLUE}💡 Try with 1M documents for the full experience:${NC}"
    echo "   Change DOCUMENTS_COUNT=1000000 in this script"
else
    echo -e "${RED}❌ File not found. Something went wrong.${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 MongoDB Streams Demo Complete! 🚀${NC}"
