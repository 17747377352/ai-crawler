/**
 * Browser skill wrapper - Browser automation using Puppeteer
 */
import puppeteer, { Browser, Page, GoToOptions } from 'puppeteer';

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
  links: { text: string; href: string }[];
  images: { alt: string; src: string }[];
}

export interface ExtractOptions {
  selector?: string;
  waitFor?: string | number;
  scrollToBottom?: boolean;
  removeSelectors?: string[];
}

export class BrowserSkill {
  private browser: Browser | null = null;
  private options: BrowserOptions;

  constructor(options: BrowserOptions = {}) {
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
  async init(): Promise<void> {
    if (this.browser) return;

    const launchOptions: any = {
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

    this.browser = await puppeteer.launch(launchOptions);
  }

  /**
   * Create a new page with anti-detection measures
   */
  async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser!.newPage();

    // Set viewport
    await page.setViewport(this.options.viewport!);

    // Set user agent
    if (this.options.userAgent) {
      await page.setUserAgent(this.options.userAgent);
    }

    // Set default timeout
    page.setDefaultTimeout(this.options.timeout!);
    page.setDefaultNavigationTimeout(this.options.timeout!);

    return page;
  }

  /**
   * Navigate to URL and get content
   */
  async fetch(url: string, options: ExtractOptions = {}): Promise<PageContent> {
    const page = await this.createPage();

    try {
      // Navigate to page
      const gotoOptions: GoToOptions = {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      };

      await page.goto(url, gotoOptions);

      // Wait for specific element or time
      if (options.waitFor) {
        if (typeof options.waitFor === 'string') {
          await page.waitForSelector(options.waitFor, { timeout: 5000 });
        } else {
          await new Promise(resolve => setTimeout(resolve, Number(options.waitFor)));
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

    } finally {
      await page.close();
    }
  }

  /**
   * Extract content from page
   */
  private async extractContent(page: Page, selector?: string): Promise<PageContent> {
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
      const clone = container.cloneNode(true) as HTMLElement;
      
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
  private async scrollToBottom(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
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
  async screenshot(url: string, path: string, fullPage: boolean = true): Promise<void> {
    const page = await this.createPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.screenshot({ path, fullPage });
    } finally {
      await page.close();
    }
  }

  /**
   * Execute JavaScript on page
   */
  async evaluate<T>(url: string, script: string): Promise<T> {
    const page = await this.createPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      return await page.evaluate(new Function(script) as () => T);
    } finally {
      await page.close();
    }
  }

  /**
   * Batch fetch multiple URLs
   */
  async batchFetch(urls: string[], options: ExtractOptions & { delay?: number } = {}): Promise<Map<string, PageContent>> {
    const results = new Map<string, PageContent>();
    const delay = options.delay || 2000;

    for (const url of urls) {
      try {
        const content = await this.fetch(url, options);
        results.set(url, content);
      } catch (error) {
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
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BrowserSkill;