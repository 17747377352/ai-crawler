/**
 * Simple HTTP fetcher - no browser required
 * For servers without Chrome
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface FetchResult {
  url: string;
  title: string;
  text: string;
  html: string;
  links: { href: string; text: string }[];
}

export class SimpleFetcher {
  private defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
  };

  async fetch(url: string): Promise<FetchResult> {
    try {
      const response = await axios.get(url, {
        headers: this.defaultHeaders,
        timeout: 30000,
        maxRedirects: 5,
        responseType: 'text',
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract title
      const title = $('title').text().trim() || 'No title';

      // Remove script and style tags
      $('script, style, nav, header, footer, aside').remove();

      // Extract main content
      let text = '';
      const mainContent = $('main, article, .content, #content, [role="main"]').first();
      if (mainContent.length) {
        text = mainContent.text();
      } else {
        text = $('body').text();
      }

      // Clean up text
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
        .substring(0, 50000); // Limit size

      // Extract links
      const links: { href: string; text: string }[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const linkText = $(el).text().trim();
        if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
          try {
            const absoluteUrl = new URL(href, url).href;
            links.push({ href: absoluteUrl, text: linkText });
          } catch {
            // Invalid URL, skip
          }
        }
      });

      return {
        url,
        title,
        text,
        html,
        links,
      };
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(): Promise<void> {
    // Nothing to close for simple fetcher
  }
}
