import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// Add stealth plugin
puppeteerExtra.use(StealthPlugin());
export class BrowserSkill {
    browser = null;
    options;
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            viewport: { width: 1920, height: 1080 },
            ...options
        };
    }
    /**
     * Initialize browser instance
     */
    async init() {
        if (this.browser)
            return;
        const launchOptions = {
            headless: this.options.headless ? 'new' : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        };
        if (this.options.proxy) {
            launchOptions.args.push(`--proxy-server=${this.options.proxy}`);
        }
        this.browser = await puppeteerExtra.launch(launchOptions);
    }
    /**
     * Create a new page with anti-detection measures
     */
    async createPage() {
        if (!this.browser) {
            await this.init();
        }
        const page = await this.browser.newPage();
        // Set viewport
        await page.setViewport(this.options.viewport);
        // Set user agent
        if (this.options.userAgent) {
            await page.setUserAgent(this.options.userAgent);
        }
        // Set default timeout
        page.setDefaultTimeout(this.options.timeout);
        page.setDefaultNavigationTimeout(this.options.timeout);
        // Add anti-detection scripts
        await page.evaluateOnNewDocument(() => {
            // Override navigator properties
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters);
        });
        return page;
    }
    /**
     * Navigate to URL and get content
     */
    async fetch(url, options = {}) {
        const page = await this.createPage();
        try {
            // Navigate to page
            const gotoOptions = {
                waitUntil: 'networkidle2',
                timeout: this.options.timeout
            };
            await page.goto(url, gotoOptions);
            // Wait for specific element or time
            if (options.waitFor) {
                if (typeof options.waitFor === 'string') {
                    await page.waitForSelector(options.waitFor, { timeout: 5000 });
                }
                else {
                    await page.waitForTimeout(options.waitFor);
                }
            }
            // Scroll to bottom if needed
            if (options.scrollToBottom) {
                await this.scrollToBottom(page);
            }
            // Remove unwanted elements
            if (options.removeSelectors) {
                await page.evaluate((selectors) => {
                    selectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => el.remove());
                    });
                }, options.removeSelectors);
            }
            // Extract content
            const content = await this.extractContent(page, options.selector);
            return content;
        }
        finally {
            await page.close();
        }
    }
    /**
     * Extract content from page
     */
    async extractContent(page, selector) {
        const scope = selector || 'body';
        return page.evaluate((scopeSelector) => {
            const container = document.querySelector(scopeSelector) || document.body;
            // Get all links
            const links = Array.from(container.querySelectorAll('a'))
                .map(a => ({
                text: a.textContent?.trim() || '',
                href: a.href || ''
            }))
                .filter(l => l.href && !l.href.startsWith('javascript:'));
            // Get all images
            const images = Array.from(container.querySelectorAll('img'))
                .map(img => ({
                alt: img.alt || '',
                src: img.src || ''
            }))
                .filter(i => i.src);
            // Get clean text
            const clone = container.cloneNode(true);
            // Remove script and style elements
            clone.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove());
            const text = clone.textContent || '';
            const cleanText = text
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();
            return {
                url: window.location.href,
                title: document.title,
                html: container.innerHTML,
                text: cleanText,
                links,
                images
            };
        }, scope);
    }
    /**
     * Scroll to bottom of page
     */
    async scrollToBottom(page) {
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 300;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }
    /**
     * Take screenshot
     */
    async screenshot(url, path, fullPage = true) {
        const page = await this.createPage();
        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            await page.screenshot({ path, fullPage });
        }
        finally {
            await page.close();
        }
    }
    /**
     * Execute JavaScript on page
     */
    async evaluate(url, script) {
        const page = await this.createPage();
        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            return await page.evaluate(new Function(script));
        }
        finally {
            await page.close();
        }
    }
    /**
     * Batch fetch multiple URLs
     */
    async batchFetch(urls, options = {}) {
        const results = new Map();
        const delay = options.delay || 2000;
        for (const url of urls) {
            try {
                const content = await this.fetch(url, options);
                results.set(url, content);
            }
            catch (error) {
                console.error(`Failed to fetch ${url}:`, error);
            }
            // Add delay between requests
            await this.sleep(delay);
        }
        return results;
    }
    /**
     * Close browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exportdefault;
BrowserSkill;
//# sourceMappingURL=browser.js.map