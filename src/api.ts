/**
 * API server for AI Crawler
 */
import express from 'express';
import { Crawler, CrawlTask } from './core/crawler.js';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;
const DATA_DIR = process.env.DATA_DIR || './data';

// Initialize crawler
const crawler = new Crawler(DATA_DIR);

// Track active tasks
const taskProgress = new Map<string, any>();

// Setup event listeners
crawler.on('task:start', (task) => {
  taskProgress.set(task.id, { status: 'running', progress: 0, urls: [] });
});

crawler.on('urls:discovered', ({ taskId, count }) => {
  const progress = taskProgress.get(taskId);
  if (progress) {
    progress.totalUrls = count;
  }
});

crawler.on('url:complete', ({ taskId }) => {
  const progress = taskProgress.get(taskId);
  if (progress) {
    progress.progress++;
  }
});

crawler.on('task:complete', ({ taskId }) => {
  const progress = taskProgress.get(taskId);
  if (progress) {
    progress.status = 'completed';
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit crawl task
app.post('/api/crawl', async (req, res) => {
  try {
    const task: CrawlTask = req.body;
    
    if (!task.id || !task.name || !task.source) {
      return res.status(400).json({ error: 'Missing required fields: id, name, source' });
    }

    // Start crawl in background
    crawler.execute(task).catch(error => {
      console.error(`Task ${task.id} failed:`, error);
    });

    res.json({ 
      taskId: task.id, 
      status: 'started',
      message: 'Task started successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get task progress
app.get('/api/tasks/:taskId/progress', (req, res) => {
  const { taskId } = req.params;
  const progress = taskProgress.get(taskId);
  
  if (!progress) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    taskId,
    ...progress,
    percent: progress.totalUrls ? Math.round((progress.progress / progress.totalUrls) * 100) : 0
  });
});

// Get task results
app.get('/api/tasks/:taskId/results', async (req, res) => {
  try {
    const { taskId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const results = crawler.getResults(taskId, limit);
    res.json({ taskId, results, count: results.length });

  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const { taskId } = req.query;
    const stats = crawler.getStats(taskId as string | undefined);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// List active tasks
app.get('/api/tasks', (req, res) => {
  const tasks = Array.from(taskProgress.entries()).map(([id, progress]) => ({
    id,
    ...progress
  }));
  res.json({ tasks });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Crawler API running on port ${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await crawler.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await crawler.close();
  process.exit(0);
});
