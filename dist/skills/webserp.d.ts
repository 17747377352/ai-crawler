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
export declare class WebSerpSkill {
    private defaultOptions;
    constructor(options?: SearchOptions);
    /**
     * Search using webserp CLI
     */
    search(query: string, options?: Partial<SearchOptions>): Promise<SearchResponse>;
    /**
     * Search for URLs only (no content extraction)
     */
    searchUrls(query: string, options?: Partial<SearchOptions>): Promise<string[]>;
    /**
     * Search with content extraction for specific domains
     */
    searchWithFilter(query: string, domainFilter: string | string[], options?: Partial<SearchOptions>): Promise<SearchResult[]>;
    /**
     * Batch search multiple queries
     */
    batchSearch(queries: string[], options?: Partial<SearchOptions>): Promise<Map<string, SearchResponse>>;
    /**
     * Check if webserp is installed
     */
    isAvailable(): boolean;
    private normalizeResponse;
    private delay;
}
export default WebSerpSkill;
//# sourceMappingURL=webserp.d.ts.map