# AI Crawler

An intelligent web crawler powered by AI that combines multi-engine search, browser automation, and structured data extraction.

## Features

- **Multi-engine Search**: Uses WebSerp to search across 7+ search engines simultaneously
- **Browser Automation**: Full browser automation with Puppeteer and anti-detection measures
- **AI-Powered Parsing**: Extracts and structures data using AI models (OpenAI, Kimi, etc.)
- **Configurable Tasks**: Define crawling tasks via YAML/JSON configuration files
- **SQLite Storage**: Persistent storage with deduplication and incremental crawling
- **Dual Interface**: Use via CLI or REST API
- **Anti-Detection**: Built-in stealth measures to bypass bot detection
- **Proxy Support**: Configurable proxy rotation for large-scale crawling

## Project Structure

```
ai-crawler/
├── src/
│   ├── core/
│   │   ├── crawler.ts      # Core crawling engine
│   │   ├── parser.ts       # AI content parsing and structuring
│   │   └── storage.ts      # SQLite database operations
│   ├── skills/
│   │   ├── webserp.ts      # Multi-engine search wrapper
│   │   └── browser.ts      # Browser automation wrapper
│   ├── cli.ts              # Command-line interface
│   └── api.ts              # REST API service
├── config/
│   └── tasks/              # Task configuration files
├── data/                   # SQLite database storage
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-crawler

# Install dependencies
npm install

# Build the project
npm run build

# Install webserp (Python dependency)
pip install webserp
```

## Configuration

### Task Configuration

Create task files in `config/tasks/` directory. Supported formats: YAML, JSON.

**Example YAML task (`config/tasks/example-news.yaml`):**
```yaml
name: "Tech News Crawler"
description: "Crawl latest tech news from major sites"
search:
  query: "latest AI technology news"
  engines: ["google", "brave", "duckduckgo"]
  maxResults: 20
browser:
  headless: true
  timeout: 30000
  scrollToBottom: true
extract:
  fields:
    - name: "title"
      type: "string"
      description: "Article title"
    - name: "author"
      type: "string" 
      description: "Article author"
    - name: "publishDate"
      type: "date"
      description: "Publication date"
    - name: "summary"
      type: "text"
      description: "Article summary"
    - name: "tags"
      type: "array"
      description: "Article tags"
antiDetection:
  randomDelay: true
  minDelay: 1000
  maxDelay: 5000
  rotateUserAgents: true
storage:
  deduplicate: true
  incremental: true
```

### Environment Variables

Create a `.env` file in the project root:

```env
# AI Model Configuration
AI_MODEL=kimi-latest
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://api.moonshot.cn/v1

# Database
DATABASE_PATH=./data/crawler.db

# Proxy (optional)
PROXY_URL=http://your-proxy:port

# Rate limiting
REQUEST_DELAY=2000
MAX_CONCURRENT_REQUESTS=5
```

## Usage

### CLI Usage

```bash
# Build the project
npm run build

# Run a specific task
npm run cli -- crawl --task example-news

# List all tasks
npm run cli -- list-tasks

# Get crawler stats
npm run cli -- stats --task example-news

# Clean up old records (older than 30 days)
npm run cli -- cleanup --days 30

# Start interactive mode
npm run cli -- interactive
```

### API Usage

```bash
# Start the API server
npm run api

# Or start with custom port
npm run api -- --port 8080
```

**API Endpoints:**

- `POST /crawl` - Start a new crawling task
- `GET /tasks` - List all configured tasks
- `GET /tasks/:taskId` - Get task details
- `GET /records/:taskId` - Get crawled records for a task
- `GET /stats/:taskId` - Get crawling statistics
- `POST /cleanup` - Clean up old records

**Example API request:**
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"taskId": "example-news", "maxPages": 10}'
```

## Key Features Explained

### Incremental Crawling
The crawler automatically tracks which URLs have been processed and avoids re-crawling them unless explicitly configured to do so. This enables efficient periodic updates of existing data.

### Anti-Detection Measures
- Randomized request delays
- User agent rotation
- Stealth browser fingerprinting
- Proxy support
- Human-like scrolling behavior

### AI-Powered Data Extraction
Instead of relying on fixed CSS selectors, the AI parser can understand page structure and extract relevant information even when the HTML changes. This makes the crawler more robust and maintainable.

### Multi-Engine Search
By searching across multiple engines simultaneously, the crawler can discover more comprehensive results and avoid bias from any single search provider.

## Development

```bash
# Development mode (auto-reload)
npm run dev -- crawl --task example-news

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Build for production
npm run build
```

## Requirements

- Node.js >= 18.0.0
- Python >= 3.8 (for webserp)
- SQLite3 (usually included with Python)

## Security Considerations

- Always respect robots.txt
- Implement appropriate rate limiting
- Use proxies for large-scale crawling
- Store API keys securely (use environment variables)
- Don't crawl sensitive or private content

## License

MIT License

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.