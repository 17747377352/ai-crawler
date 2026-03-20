/**
 * Core crawler engine - orchestrates search, browser, and AI parsing
 */
import { WebSerpSkill } from '../skills/webserp.js';
import { BrowserSkill } from '../skills/browser.js';
import { Storage } from './storage.js';
import { AIParser } from './parser.js';
import { EventEmitter } from 'events';
export class Crawler extends EventEmitter {
    storage;
    webserp;
    browser;
    parser;
    activeTasks = new Map();
    constructor(dataDir = './data') {
        super();
        this.storage = new Storage(dataDir);
        this.webserp = new WebSerpSkill();
        this.browser = new BrowserSkill();
        this.parser = new AIParser();
    }
    /**
     * Execute a crawl task
     */
    async execute(task) {
        if (this.activeTasks.get(task.id)) {
            throw new Error(`Task ${task.id} is already running`);
        }
        this.activeTasks.set(task.id, true);
        this.emit('task:start', task);
        try {
            // Save task config
            this.storage.saveTaskConfig({
                taskId: task.id,
                name: task.name,
                config: JSON.stringify(task),
                status: 'active',
                lastRun: new Date().toISOString()
            });
            // Get URLs to crawl
            const urls = await this.getUrls(task);
            this.emit('urls:discovered', { taskId: task.id, count: urls.length });
            // Crawl each URL
            const results = [];
            const maxPages = task.options?.maxPages || 10;
            const delay = task.options?.delay || 2000;
            for (let i = 0; i < Math.min(urls.length, maxPages); i++) {
                const url = urls[i];
                if (!this.activeTasks.get(task.id)) {
                    this.emit('task:stopped', task);
                    break;
                }
                // Check if already crawled
                if (this.storage.isUrlCrawled(url, task.id)) {
                    this.emit('url:skipped', { taskId: task.id, url, reason: 'already_crawled' });
                    continue;
                }
                this.emit('url:start', { taskId: task.id, url, progress: `${i + 1}/${Math.min(urls.length, maxPages)}` });
                try {
                    const result = await this.crawlUrl(url, task);
                    results.push(result);
                    // Store result
                    this.storage.insertRecord({
                        taskId: task.id,
                        url: result.url,
                        title: result.title,
                        content: result.content,
                        extractedData: JSON.stringify(result.extractedData),
                        status: result.status === 'success' ? 'completed' : 'failed',
                        error: result.error
                    });
                    // Mark as crawled
                    this.storage.markUrlCrawled(url, task.id);
                    this.emit('url:complete', { taskId: task.id, url, success: true });
                }
                catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    this.emit('url:error', { taskId: task.id, url, error: errorMsg });
                    this.storage.insertRecord({
                        taskId: task.id,
                        url,
                        status: 'failed',
                        error: errorMsg
                    });
                }
                // Delay between requests
                if (i < Math.min(urls.length, maxPages) - 1) {
                    await this.sleep(delay);
                }
            }
            // Update task status
            this.storage.saveTaskConfig({
                taskId: task.id,
                name: task.name,
                config: JSON.stringify(task),
                status: 'completed',
                lastRun: new Date().toISOString()
            });
            this.emit('task:complete', { taskId: task.id, results });
            return results;
        }
        finally {
            this.activeTasks.delete(task.id);
        }
    }
    /**
     * Get URLs from search or direct list
     */
    async getUrls(task) {
        if (task.source === 'urls' && task.urls) {
            return task.urls;
        }
        if (task.source === 'search' && task.searchQuery) {
            const response = await this.webserp.search(task.searchQuery, {
                maxResults: task.options?.maxPages || 10
            });
            return response.results.map(r => r.url);
        }
        if (task.source === 'sitemap' && task.sitemapUrl) {
            return await this.parseSitemap(task.sitemapUrl);
        }
        return [];
    }
    /**
     * Crawl a single URL
     */
    async crawlUrl(url, task) {
        const useBrowser = task.options?.useBrowser !== false;
        let content;
        let title;
        let links = [];
        if (useBrowser) {
            // Use browser automation
            const pageContent = await this.browser.fetch(url, {
                selector: task.selectors?.content,
                scrollToBottom: true,
                removeSelectors: ['nav', 'header', 'footer', 'aside', '.ads', '.cookie-banner']
            });
            content = pageContent.text;
            title = pageContent.title;
            links = pageContent.links.map(l => l.href);
        }
        else {
            // Use simple HTTP fetch (not implemented, fallback to browser)
            const pageContent = await this.browser.fetch(url);
            content = pageContent.text;
            title = pageContent.title;
            links = pageContent.links.map(l => l.href);
        }
        // AI extraction
        const extractedData = await this.parser.extract(content, {
            fields: task.extractFields || [
                { name: 'summary', description: 'Brief summary of the content', required: true },
                { name: 'key_points', description: 'Key points from the content', required: false }
            ]
        });
        return {
            taskId: task.id,
            url,
            title,
            content: content.substring(0, 10000), // Limit content size
            extractedData,
            links,
            status: 'success',
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Parse sitemap XML
     */
    async parseSitemap(sitemapUrl) {
        try {
            const pageContent = await this.browser.fetch(sitemapUrl);
            const xml = pageContent.html;
            // Extract URLs from sitemap
            const urlMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
            return Array.from(urlMatches).map(m => m[1]).filter(url => url.startsWith('http'));
        }
        catch (error) {
            console.error('Failed to parse sitemap:', error);
            return [];
        }
    }
    /**
     * Stop a running task
     */
    stop(taskId) {
        this.activeTasks.delete(taskId);
        this.emit('task:stopping', { taskId });
    }
    /**
     * Get task statistics
     */
    getStats(taskId) {
        return this.storage.getStats(taskId);
    }
    /**
     * Get task results
     */
    getResults(taskId, limit = 100) {
        return this.storage.getRecordsByTask(taskId, limit);
    }
    /**
     * Cleanup old records
     */
    cleanup(days = 30) {
        return this.storage.cleanup(days);
    }
    /**
     * Close all resources
     */
    async close() {
        await this.browser.close();
        this.storage.close();
    }
}
//# sourceMappingURL=crawler.js.map