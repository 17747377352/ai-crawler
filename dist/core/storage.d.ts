export interface CrawlRecord {
    id?: number;
    taskId: string;
    url: string;
    title?: string;
    content?: string;
    extractedData?: string;
    status: 'pending' | 'crawling' | 'completed' | 'failed';
    error?: string;
    createdAt: string;
    updatedAt: string;
}
export interface TaskConfig {
    id?: number;
    taskId: string;
    name: string;
    config: string;
    status: 'active' | 'paused' | 'completed';
    createdAt: string;
    lastRun?: string;
}
export declare class Storage {
    private db;
    private dbPath;
    constructor(dataDir?: string);
    private initTables;
    insertRecord(record: Omit<CrawlRecord, 'id' | 'createdAt' | 'updatedAt'>): number;
    updateStatus(url: string, status: CrawlRecord['status'], error?: string): void;
    getRecordsByTask(taskId: string, limit?: number): CrawlRecord[];
    isUrlCrawled(url: string, taskId: string): boolean;
    markUrlCrawled(url: string, taskId: string): void;
    saveTaskConfig(config: Omit<TaskConfig, 'id' | 'createdAt'>): void;
    getTaskConfig(taskId: string): TaskConfig | undefined;
    getActiveTasks(): TaskConfig[];
    getStats(taskId?: string): {
        total: number;
        pending: number;
        crawling: number;
        completed: number;
        failed: number;
    };
    cleanup(days?: number): number;
    close(): void;
}
export default Storage;
//# sourceMappingURL=storage.d.ts.map