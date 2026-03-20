import { EventEmitter } from 'events';
export interface CrawlTask {
    id: string;
    name: string;
    description?: string;
    source: 'search' | 'urls' | 'sitemap';
    searchQuery?: string;
    urls?: string[];
    sitemapUrl?: string;
    selectors?: {
        title?: string;
        content?: string;
        links?: string;
    };
    extractFields?: {
        name: string;
        description: string;
        selector?: string;
        required?: boolean;
    }[];
    options?: {
        maxPages?: number;
        depth?: number;
        delay?: number;
        useBrowser?: boolean;
        respectRobots?: boolean;
        proxy?: string;
    };
}
export interface CrawlResult {
    taskId: string;
    url: string;
    title: string;
    content: string;
    extractedData: Record<string, any>;
    links: string[];
    status: 'success' | 'failed';
    error?: string;
    timestamp: string;
}
export declare class Crawler extends EventEmitter {
    private storage;
    private webserp;
    private browser;
    private parser;
    private activeTasks;
    constructor(dataDir?: string);
    /**
     * Execute a crawl task
     */
    execute(task: CrawlTask): Promise<CrawlResult[]>;
    /**
     * Get URLs from search or direct list
     */
    private getUrls;
    /**
     * Crawl a single URL
     */
    private crawlUrl;
    /**
     * Parse sitemap XML
     */
    private parseSitemap;
    /**
     * Stop a running task
     */
    stop(taskId: string): void;
    /**
     * Get task statistics
     */
    getStats(taskId?: string): {
        total: number;
        pending: number;
        crawling: number;
        completed: number;
        failed: number;
    };
    /**
     * Get task results
     */
    getResults(taskId: string, limit?: number): import("./storage.js").CrawlRecord[];
    /**
     * Cleanup old records
     */
    cleanup(days?: number): number;
    /**
     * Close all resources
     */
    close(): Promise<void>;
    private sleep;
}
//# sourceMappingURL=crawler.d.ts.map