export interface ExtractField {
    name: string;
    description: string;
    selector?: string;
    required?: boolean;
}
export interface ExtractOptions {
    fields: ExtractField[];
    model?: string;
    temperature?: number;
}
export declare class AIParser {
    private client;
    private defaultModel;
    constructor(apiKey?: string, model?: string);
    /**
     * Extract structured data from content
     */
    extract(content: string, options: ExtractOptions): Promise<Record<string, any>>;
    /**
     * Summarize content
     */
    summarize(content: string, maxLength?: number): Promise<string>;
    /**
     * Extract entities (people, organizations, locations, etc.)
     */
    extractEntities(content: string): Promise<{
        people: string[];
        organizations: string[];
        locations: string[];
        dates: string[];
        keywords: string[];
    }>;
    /**
     * Classify content into categories
     */
    classify(content: string, categories: string[]): Promise<{
        category: string;
        confidence: number;
        reasoning: string;
    }>;
}
export default AIParser;
//# sourceMappingURL=parser.d.ts.map