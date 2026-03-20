/**
 * Browser skill wrapper - Browser automation using Puppeteer
 */
import { Page } from 'puppeteer';
export interface BrowserOptions {
    headless?: boolean;
    proxy?: string;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
    timeout?: number;
}
export interface PageContent {
    url: string;
    title: string;
    html: string;
    text: string;
    links: {
        text: string;
        href: string;
    }[];
    images: {
        alt: string;
        src: string;
    }[];
}
export interface ExtractOptions {
    selector?: string;
    waitFor?: string | number;
    scrollToBottom?: boolean;
    removeSelectors?: string[];
}
export declare class BrowserSkill {
    private browser;
    private options;
    constructor(options?: BrowserOptions);
    /**
     * Initialize browser instance
     */
    init(): Promise<void>;
    /**
     * Create a new page with anti-detection measures
     */
    createPage(): Promise<Page>;
    /**
     * Navigate to URL and get content
     */
    fetch(url: string, options?: ExtractOptions): Promise<PageContent>;
    /**
     * Extract content from page
     */
    private extractContent;
    /**
     * Scroll to bottom of page
     */
    private scrollToBottom;
    /**
     * Take screenshot
     */
    screenshot(url: string, path: string, fullPage?: boolean): Promise<void>;
    /**
     * Execute JavaScript on page
     */
    evaluate<T>(url: string, script: string): Promise<T>;
    /**
     * Batch fetch multiple URLs
     */
    batchFetch(urls: string[], options?: ExtractOptions & {
        delay?: number;
    }): Promise<Map<string, PageContent>>;
    /**
     * Close browser
     */
    close(): Promise<void>;
    private sleep;
}
//# sourceMappingURL=browser.d.ts.map