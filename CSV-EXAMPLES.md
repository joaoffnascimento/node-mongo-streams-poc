# 🚀 CSV Streaming Examples

# MongoDB Streams POC - CSV Download Functionality

## Quick Start

### 1. Start Environment

```bash
npm run env:start
```

### 2. Seed Database

```bash
# Small dataset for quick testing
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"totalDocuments": 10000, "batchSize": 1000}'

# Large dataset for real demonstration
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"totalDocuments": 1000000, "batchSize": 5000}'
```

### 3. Download Processed CSV

#### Quick Demo (10K documents)

```bash
curl -X POST http://localhost:3000/api/process/csv-download \
  -H "Content-Type: application/json" \
  -d '{"limit": 10000, "batchSize": 1000}' \
  --output processed_documents_10k.csv
```

#### Full Demo (1M documents)

```bash
curl -X POST http://localhost:3000/api/process/csv-download \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000000, "batchSize": 1000}' \
  --output processed_documents_1m.csv
```

#### Custom Batch Size (optimized for memory)

```bash
curl -X POST http://localhost:3000/api/process/csv-download \
  -H "Content-Type: application/json" \
  -d '{"limit": 500000, "batchSize": 2000}' \
  --output processed_documents_custom.csv
```

## Using NPM Scripts

```bash
# Interactive demo script
npm run demo:csv

# Quick CSV download (10K docs)
npm run demo:csv-quick

# Large CSV download (1M docs)
npm run demo:csv-large
```

## Browser Testing

You can also test directly in the browser using tools like Postman or by creating an HTML form:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>CSV Download Test</title>
  </head>
  <body>
    <h1>MongoDB Streams CSV Download</h1>

    <form id="csvForm">
      <label for="limit">Number of documents:</label>
      <input type="number" id="limit" value="10000" min="1000" max="1000000" />

      <label for="batchSize">Batch size:</label>
      <input type="number" id="batchSize" value="1000" min="100" max="5000" />

      <button type="submit">Download CSV</button>
    </form>

    <script>
      document
        .getElementById('csvForm')
        .addEventListener('submit', function (e) {
          e.preventDefault();

          const limit = document.getElementById('limit').value;
          const batchSize = document.getElementById('batchSize').value;

          fetch('http://localhost:3000/api/process/csv-download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              limit: parseInt(limit),
              batchSize: parseInt(batchSize),
            }),
          })
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.style.display = 'none';
              a.href = url;
              a.download = `processed_documents_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
            })
            .catch(error => {
              console.error('Error:', error);
              alert('Error downloading CSV: ' + error.message);
            });
        });
    </script>
  </body>
</html>
```

## Expected Results

### CSV File Structure

```csv
id,timestamp,original_value,processed_value,squared_value,sqrt_value,category,source,version,tags,description,nested_level3_value,processed_at
1,2025-08-22T10:30:45.123Z,1234,2468,1522756,35.13,financial,api_v1,1.0.0,important;urgent,Sample document,42,2025-08-22T10:30:45.456Z
2,2025-08-22T10:30:45.124Z,5678,11356,32238884,75.35,operational,api_v1,1.0.0,normal,Another document,84,2025-08-22T10:30:45.457Z
```

### File Sizes (Approximate)

- 10K documents: ~2MB
- 100K documents: ~20MB
- 1M documents: ~200MB

### Memory Usage

- Traditional approach: Would crash on 1M documents
- Stream approach: ~50MB constant memory usage

### Download Times

- 10K documents: ~5-10 seconds
- 100K documents: ~30-60 seconds
- 1M documents: ~5-10 minutes

## Performance Monitoring

Check memory usage during download:

```bash
# In another terminal
docker stats mongodb-streams-api
```

## Troubleshooting

### API Not Responding

```bash
# Check if containers are running
npm run env:status

# Restart if needed
npm run env:restart
```

### Large File Downloads Timing Out

Increase batch size for better performance:

```bash
curl -X POST http://localhost:3000/api/process/csv-download \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000000, "batchSize": 5000}' \
  --output large_file.csv \
  --max-time 0  # No timeout
```

### Memory Issues

Reduce batch size:

```bash
curl -X POST http://localhost:3000/api/process/csv-download \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000000, "batchSize": 500}' \
  --output memory_optimized.csv
```

## Demo Scenarios

### Scenario 1: Quick Validation

1. Seed 10K documents
2. Download CSV
3. Verify file content and size

### Scenario 2: Performance Test

1. Seed 100K documents
2. Monitor memory usage during download
3. Compare with traditional approaches

### Scenario 3: Scale Test

1. Seed 1M documents
2. Download full CSV
3. Observe constant memory usage
4. Demonstrate real-time streaming

---

**🎯 Key Demonstration Points:**

- ✅ Immediate download start (streaming)
- ✅ Constant low memory usage
- ✅ Handles millions of documents
- ✅ No timeouts or crashes
- ✅ Real-time processing feedback
