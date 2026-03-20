/**
 * WebSerp skill wrapper - Multi-engine search functionality
 */
import { execSync } from 'child_process';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  engine: string;
}

export interface SearchResponse {
  query: string;
  numberOfResults: number;
  results: SearchResult[];
  suggestions: string[];
  unresponsiveEngines: string[];
}

export interface SearchOptions {
  engines?: string[];
  maxResults?: number;
  timeout?: number;
  proxy?: string;
  verbose?: boolean;
}

export class WebSerpSkill {
  private defaultOptions: SearchOptions;

  constructor(options: SearchOptions = {}) {
    this.defaultOptions = {
      engines: ['google', 'brave', 'duckduckgo'],
      maxResults: 10,
      timeout: 10,
      verbose: false,
      ...options
    };
  }

  /**
   * Search using webserp CLI
   */
  async search(query: string, options?: Partial<SearchOptions>): Promise<SearchResponse> {
    const opts = { ...this.defaultOptions, ...options };
    
    const args: string[] = [];
    
    if (opts.engines && opts.engines.length > 0) {
      args.push('--engines', opts.engines.join(','));
    }
    
    if (opts.maxResults) {
      args.push('--max-results', opts.maxResults.toString());
    }
    
    if (opts.timeout) {
      args.push('--timeout', opts.timeout.toString());
    }
    
    if (opts.proxy) {
      args.push('--proxy', opts.proxy);
    }
    
    if (opts.verbose) {
      args.push('--verbose');
    }

    try {
      const command = `webserp "${query.replace(/"/g, '\\"')}" ${args.join(' ')}`;
      const output = execSync(command, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const result = JSON.parse(output);
      return this.normalizeResponse(result);
    } catch (error) {
      console.error('WebSerp search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for URLs only (no content extraction)
   */
  async searchUrls(query: string, options?: Partial<SearchOptions>): Promise<string[]> {
    const response = await this.search(query, options);
    return response.results.map(r => r.url);
  }

  /**
   * Search with content extraction for specific domains
   */
  async searchWithFilter(
    query: string, 
    domainFilter: string | string[],
    options?: Partial<SearchOptions>
  ): Promise<SearchResult[]> {
    const response = await this.search(query, options);
    const domains = Array.isArray(domainFilter) ? domainFilter : [domainFilter];
    
    return response.results.filter(r => 
      domains.some(d => r.url.includes(d))
    );
  }

  /**
   * Batch search multiple queries
   */
  async batchSearch(queries: string[], options?: Partial<SearchOptions>): Promise<Map<string, SearchResponse>> {
    const results = new Map<string, SearchResponse>();
    
    for (const query of queries) {
      try {
        const response = await this.search(query, options);
        results.set(query, response);
      } catch (error) {
        console.error(`Failed to search for "${query}":`, error);
        results.set(query, {
          query,
          numberOfResults: 0,
          results: [],
          suggestions: [],
          unresponsiveEngines: []
        });
      }
      
      // Add delay between requests
      await this.delay(1000);
    }
    
    return results;
  }

  /**
   * Check if webserp is installed
   */
  isAvailable(): boolean {
    try {
      execSync('which webserp', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private normalizeResponse(raw: any): SearchResponse {
    return {
      query: raw.query || '',
      numberOfResults: raw.number_of_results || 0,
      results: (raw.results || []).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || '',
        engine: r.engine || 'unknown'
      })),
      suggestions: raw.suggestions || [],
      unresponsiveEngines: raw.unresponsive_engines || []
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default WebSerpSkill;
