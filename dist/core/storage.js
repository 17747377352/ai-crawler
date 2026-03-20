/**
 * Storage module - SQLite database operations for crawler data
 */
import Database from 'better-sqlite3';
import { join } from 'path';
export class Storage {
    db;
    dbPath;
    constructor(dataDir = './data') {
        this.dbPath = join(dataDir, 'crawler.db');
        this.db = new Database(this.dbPath);
        this.initTables();
    }
    initTables() {
        // Crawl results table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS crawl_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        title TEXT,
        content TEXT,
        extracted_data TEXT,
        status TEXT DEFAULT 'pending',
        error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Task configurations table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_run TEXT
      )
    `);
        // URL deduplication table for incremental crawling
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS crawled_urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        task_id TEXT NOT NULL,
        first_crawled TEXT DEFAULT CURRENT_TIMESTAMP,
        last_crawled TEXT DEFAULT CURRENT_TIMESTAMP,
        crawl_count INTEGER DEFAULT 1
      )
    `);
        // Create indexes
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_crawl_records_task_id ON crawl_records(task_id);
      CREATE INDEX IF NOT EXISTS idx_crawl_records_status ON crawl_records(status);
      CREATE INDEX IF NOT EXISTS idx_crawled_urls_task_id ON crawled_urls(task_id);
    `);
    }
    // Insert or update crawl record
    insertRecord(record) {
        const stmt = this.db.prepare(`
      INSERT INTO crawl_records (task_id, url, title, content, extracted_data, status, error, updated_at)
      VALUES (@taskId, @url, @title, @content, @extractedData, @status, @error, CURRENT_TIMESTAMP)
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        extracted_data = excluded.extracted_data,
        status = excluded.status,
        error = excluded.error,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `);
        const result = stmt.get(record);
        return result.id;
    }
    // Update record status
    updateStatus(url, status, error) {
        const stmt = this.db.prepare(`
      UPDATE crawl_records 
      SET status = @status, error = @error, updated_at = CURRENT_TIMESTAMP
      WHERE url = @url
    `);
        stmt.run({ url, status, error });
    }
    // Get records by task
    getRecordsByTask(taskId, limit = 100) {
        const stmt = this.db.prepare(`
      SELECT 
        id,
        task_id as taskId,
        url,
        title,
        content,
        extracted_data as extractedData,
        status,
        error,
        created_at as createdAt,
        updated_at as updatedAt
      FROM crawl_records 
      WHERE task_id = @taskId 
      ORDER BY created_at DESC 
      LIMIT @limit
    `);
        return stmt.all({ taskId, limit });
    }
    // Check if URL was already crawled
    isUrlCrawled(url, taskId) {
        const stmt = this.db.prepare(`
      SELECT 1 FROM crawled_urls WHERE url = @url AND task_id = @taskId
    `);
        return !!stmt.get({ url, taskId });
    }
    // Mark URL as crawled
    markUrlCrawled(url, taskId) {
        const stmt = this.db.prepare(`
      INSERT INTO crawled_urls (url, task_id, first_crawled, last_crawled, crawl_count)
      VALUES (@url, @taskId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(url) DO UPDATE SET
        last_crawled = CURRENT_TIMESTAMP,
        crawl_count = crawl_count + 1
    `);
        stmt.run({ url, taskId });
    }
    // Save task configuration
    saveTaskConfig(config) {
        const stmt = this.db.prepare(`
      INSERT INTO task_configs (task_id, name, config, status, created_at, last_run)
      VALUES (@taskId, @name, @config, @status, CURRENT_TIMESTAMP, @lastRun)
      ON CONFLICT(task_id) DO UPDATE SET
        name = excluded.name,
        config = excluded.config,
        status = excluded.status,
        last_run = excluded.last_run
    `);
        stmt.run(config);
    }
    // Get task configuration
    getTaskConfig(taskId) {
        const stmt = this.db.prepare(`
      SELECT 
        id,
        task_id as taskId,
        name,
        config,
        status,
        created_at as createdAt,
        last_run as lastRun
      FROM task_configs 
      WHERE task_id = @taskId
    `);
        return stmt.get({ taskId });
    }
    // Get all active tasks
    getActiveTasks() {
        const stmt = this.db.prepare(`
      SELECT 
        id,
        task_id as taskId,
        name,
        config,
        status,
        created_at as createdAt,
        last_run as lastRun
      FROM task_configs 
      WHERE status = 'active'
    `);
        return stmt.all();
    }
    // Get statistics
    getStats(taskId) {
        let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'crawling' THEN 1 ELSE 0 END) as crawling,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM crawl_records
    `;
        const params = {};
        if (taskId) {
            query += ' WHERE task_id = @taskId';
            params.taskId = taskId;
        }
        const stmt = this.db.prepare(query);
        return stmt.get(params);
    }
    // Delete old records
    cleanup(days = 30) {
        const stmt = this.db.prepare(`
      DELETE FROM crawl_records 
      WHERE updated_at < datetime('now', '-' || @days || ' days')
    `);
        const result = stmt.run({ days });
        return result.changes;
    }
    // Close database connection
    close() {
        this.db.close();
    }
}
export default Storage;
//# sourceMappingURL=storage.js.map