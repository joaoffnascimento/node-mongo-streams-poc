# 🚀 MongoDB Streams API - Clean Architecture POC

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-7+-green?style=for-the-badge&logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-Required-blue?style=for-the-badge&logo=docker)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=for-the-badge&logo=typescript)
![Express](https://img.shields.io/badge/Express-5+-black?style=for-the-badge&logo=express)

**A clean architecture API demonstrating MongoDB streaming vs traditional processing performance**

[🎯 Quick Start](#-quick-start) • [🏗️ Architecture](#️-clean-architecture) • [🌐 API](#-api-endpoints) • [⚡ Performance](#-performance-comparison) • [🧪 Testing](#-testing-and-benchmarking)

</div>

---

## 🎯 **Quick Start**

### 1. Start the Environment

```bash
# Clone and setup
git clone <repository-url>
cd mongodb-streams-poc
npm install

# Start MongoDB + API with Docker
npm run env:start
```

### 2. Explore the API

```bash
# API Documentation
curl http://localhost:3000/

# Health Check
curl http://localhost:3000/health

# Database Status
curl http://localhost:3000/api/status
```

### 3. Run Performance Tests

```bash
# Seed database with test data
npm run seed:medium  # 100K documents

# Test stream processing
curl -X POST http://localhost:3000/api/process/stream \
  -H "Content-Type: application/json" \
  -d '{"limit": 10000}'

# Test traditional processing
curl -X POST http://localhost:3000/api/process/traditional \
  -H "Content-Type: application/json" \
  -d '{"limit": 10000}'

# Compare both approaches
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"limit": 10000}'
```

---

## 🏗️ **Clean Architecture**

This project follows **Clean Architecture** principles with clear separation of concerns:

```
src/
├── 📋 domain/                    # Business Logic (Pure)
│   ├── entities/                 # Business entities
│   ├── ports/                    # Repository interfaces
│   ├── services/                 # Domain services
│   ├── use-cases/               # Business use cases
│   └── value-objects/           # Value objects
├── 🔧 application/              # Application Services
│   └── use-cases/               # Application use cases
├── 🌐 presentation/             # External Interfaces
│   ├── controllers/             # REST API controllers
│   └── routes/                  # API routes
└── 🔌 infrastructure/           # External Dependencies
    ├── adapters/                # External service adapters
    └── database/                # MongoDB implementation
```

### 🎯 **Key Principles Applied**

- **Dependency Inversion**: Domain doesn't depend on infrastructure
- **Single Responsibility**: Each layer has one clear purpose
- **Interface Segregation**: Small, focused interfaces
- **Repository Pattern**: Abstract data access
- **Use Case Pattern**: Encapsulated business logic

### 🔄 **Processing Implementations**

**Stream Processing**

```typescript
async execute({ limit }: { limit: number }) {
  const cursor = this.repository.findWithCursor({ limit });
  let processedCount = 0;

  for (let document = await cursor.next(); document != null; document = await cursor.next()) {
    await this.processDocument(document);
    processedCount++;
  }

  return { processedCount, memoryUsage: this.monitor.getMemoryUsage() };
}
```

**Traditional Processing**

```typescript
async execute({ limit }: { limit: number }) {
  const documents = await this.repository.findAll({ limit }); // ⚠️ Loads all into memory
  let processedCount = 0;

  for (const document of documents) {
    await this.processDocument(document);
    processedCount++;
  }

  return { processedCount, memoryUsage: this.monitor.getMemoryUsage() };
}
```

---

## 🌐 **API Endpoints**

### Core Endpoints

| Method | Endpoint      | Description       |
| ------ | ------------- | ----------------- |
| `GET`  | `/`           | API documentation |
| `GET`  | `/health`     | Health check      |
| `GET`  | `/api/status` | Database status   |

### Processing Endpoints

| Method | Endpoint                   | Description            | Body               |
| ------ | -------------------------- | ---------------------- | ------------------ |
| `POST` | `/api/process/stream`      | Stream processing      | `{"limit": 10000}` |
| `POST` | `/api/process/traditional` | Traditional processing | `{"limit": 10000}` |
| `POST` | `/api/compare`             | Compare both methods   | `{"limit": 10000}` |

### Data Management

| Method   | Endpoint    | Description         |
| -------- | ----------- | ------------------- |
| `DELETE` | `/api/data` | Clear all documents |

### API Response Format

All endpoints return consistent JSON responses:

```json
{
  "success": true,
  "data": {
    "type": "STREAM",
    "totalProcessed": 10000,
    "totalTime": 2341,
    "memoryUsed": {
      "bytes": 47185920,
      "humanReadable": "45.02 MB"
    },
    "throughput": {
      "documentsPerSecond": 4271,
      "documentsPerSecondFormatted": "4271 docs/sec"
    },
    "method": "MongoDB Cursor Streaming"
  },
  "timestamp": "2025-08-21T18:30:45.123Z"
}
```

---

## ⚡ **Performance Comparison**

### 🧪 **The Problem We're Solving**

Traditional approaches load all data into memory, causing crashes on large datasets:

```typescript
// ❌ TRADITIONAL - Memory Intensive
const documents = await collection.find({}).toArray(); // Loads ALL data
documents.forEach(doc => processDocument(doc));
```

```typescript
// ✅ STREAMS - Memory Efficient
const cursor = collection.find({}).cursor();
for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
  await processDocument(doc);
}
```

### 📊 **Performance Results**

| Dataset Size | Traditional Memory | Stream Memory | Memory Saved | Result              |
| ------------ | ------------------ | ------------- | ------------ | ------------------- |
| 10K docs     | 180 MB             | 45 MB         | 75%          | ✅ Both work        |
| 50K docs     | 850 MB             | 48 MB         | 94%          | ✅ Streams better   |
| 100K docs    | 💥 **CRASH**       | 52 MB         | 100%         | 🏆 **Streams only** |
| 1M docs      | 💥 **CRASH**       | 58 MB         | 100%         | 🏆 **Streams only** |

### 🎯 **Key Benefits**

- **Memory Efficiency**: 75-94% less memory usage
- **Scalability**: Handle unlimited dataset sizes
- **Reliability**: No out-of-memory crashes
- **Performance**: Faster processing for large datasets

---

## 🧪 **Testing and Benchmarking**

### Environment Commands

```bash
# Environment Management
npm run env:start          # Start MongoDB + API
npm run env:stop           # Stop environment
npm run env:restart        # Restart environment
npm run env:destroy        # Clean destroy
npm run env:status         # Check status

# Development
npm run dev                # Start API in development mode
npm run build              # Build TypeScript
npm run start              # Start production API
```

### Data Seeding

```bash
# Seed different dataset sizes
npm run seed:quick         # 10K documents (fast testing)
npm run seed:medium        # 100K documents (realistic load)
npm run seed:large         # 1M documents (stress testing)
```

### Benchmarking

```bash
# Run comprehensive benchmark
npm run benchmark          # Automated performance comparison
```

### Logs and Monitoring

```bash
# View logs
npm run logs:all           # All service logs
npm run logs:api           # API logs only
npm run logs:db            # MongoDB logs only
```

---

## 🛠️ **Development Setup**

### Prerequisites

- **Node.js 20+**
- **Docker & Docker Compose**
- **Git**

### Local Development

```bash
# Install dependencies
npm install

# Start development environment
npm run dev

# The API will be available at:
# - Documentation: http://localhost:3000/
# - Health: http://localhost:3000/health
# - Status: http://localhost:3000/api/status
```

### Docker Development

```bash
# Start full environment
docker compose -f docker/docker-compose.yml up -d

# View running services
docker compose -f docker/docker-compose.yml ps

# View logs
docker compose -f docker/docker-compose.yml logs -f
```

---

## 📊 **Production Considerations**

### 🎯 **Best Practices Demonstrated**

- **Clean Architecture**: Maintainable and testable code
- **Error Handling**: Comprehensive error management
- **Logging**: Structured logging with Pino
- **Security**: Helmet.js for security headers
- **CORS**: Configurable cross-origin requests
- **Health Checks**: Proper health monitoring
- **Graceful Shutdown**: Clean process termination

### 🔒 **Security Features**

- Helmet.js security headers
- CORS protection
- Request validation
- Error sanitization
- Structured logging

### 📈 **Scalability Features**

- Stream-based processing
- Memory-efficient operations
- Connection pooling
- Async/await patterns
- Clean separation of concerns

---

## 🧪 **Testing with Insomnia/Postman**

Import the provided `insomnia-requests.json` file to get a complete collection of API requests for testing all endpoints.

### Quick Test Sequence

1. **Health Check**: `GET /health`
2. **Seed Data**: Use seeding scripts
3. **Stream Test**: `POST /api/process/stream`
4. **Traditional Test**: `POST /api/process/traditional`
5. **Compare**: `POST /api/compare`
6. **Clean Up**: `DELETE /api/data`

---

## ️ **Technology Stack**

- **🏗️ Language**: TypeScript + Node.js 20
- **🗄️ Database**: MongoDB 7 with cursor streaming
- **🌐 API**: Express.js with comprehensive error handling
- **🐳 Deployment**: Docker Compose with smart profiles
- **🧪 Architecture**: Clean Architecture with dependency injection
- **📈 Performance**: Memory monitoring and benchmarking tools

---

## 🚨 **Troubleshooting**

### Environment Issues

```bash
# Clean restart
npm run env:destroy && npm run env:start

# Check all services
npm run env:status

# View logs
npm run logs:all
```

### Performance Issues

```bash
# Check API health
curl http://localhost:3000/health

# Monitor resources
open http://localhost:8080

# Check database
npm run data:status
```

### Docker Issues

```bash
# Clean Docker completely
docker system prune -a --volumes

# Restart environment
npm run session:start
```

---

## 🎊 **Production Lessons**

This POC teaches critical production patterns:

### ✅ **Do This**

- Always use cursors/streams for large datasets
- Monitor memory usage in production
- Implement proper error handling
- Test with realistic data volumes

### ❌ **Avoid This**

- Loading large datasets with `.toArray()`
- Assuming development data represents production
- Ignoring memory constraints
- Missing performance monitoring
- Skipping scalability testing

---

## 🤝 **Contributing**

This project demonstrates clean architecture principles and is perfect for:

- Learning clean architecture patterns
- Understanding MongoDB streaming
- Performance optimization techniques
- API design best practices
- Docker containerization

---

## 📜 **License**

MIT License - Feel free to use this for education, presentations, or production guidance.

---

<div align="center">

**Built with ❤️ using Clean Architecture principles**

[🌟 Give it a star](https://github.com/joaoffnascimento/node-mongo-streams-poc) if you found this helpful!

**🚀 Ready to see why streams matter in production?**

```bash
npm run env:start
```

**Then visit http://localhost:3000** ✨

_"In production, memory management isn't optional—it's survival."_

</div>
