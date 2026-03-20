/**
 * WebSerp skill wrapper - Multi-engine search functionality
 */
import { execSync } from 'child_process';
export class WebSerpSkill {
    defaultOptions;
    constructor(options = {}) {
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
    async search(query, options) {
        const opts = { ...this.defaultOptions, ...options };
        const args = [];
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
        }
        catch (error) {
            console.error('WebSerp search failed:', error);
            throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Search for URLs only (no content extraction)
     */
    async searchUrls(query, options) {
        const response = await this.search(query, options);
        return response.results.map(r => r.url);
    }
    /**
     * Search with content extraction for specific domains
     */
    async searchWithFilter(query, domainFilter, options) {
        const response = await this.search(query, options);
        const domains = Array.isArray(domainFilter) ? domainFilter : [domainFilter];
        return response.results.filter(r => domains.some(d => r.url.includes(d)));
    }
    /**
     * Batch search multiple queries
     */
    async batchSearch(queries, options) {
        const results = new Map();
        for (const query of queries) {
            try {
                const response = await this.search(query, options);
                results.set(query, response);
            }
            catch (error) {
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
    isAvailable() {
        try {
            execSync('which webserp', { stdio: 'pipe' });
            return true;
        }
        catch {
            return false;
        }
    }
    normalizeResponse(raw) {
        return {
            query: raw.query || '',
            numberOfResults: raw.number_of_results || 0,
            results: (raw.results || []).map((r) => ({
                title: r.title || '',
                url: r.url || '',
                content: r.content || '',
                engine: r.engine || 'unknown'
            })),
            suggestions: raw.suggestions || [],
            unresponsiveEngines: raw.unresponsive_engines || []
        };
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
export default WebSerpSkill;
//# sourceMappingURL=webserp.js.map