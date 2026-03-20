/**
 * AI Parser - Extract structured data from content using LLM
 */
import OpenAI from 'openai';

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

export class AIParser {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey?: string, model: string = 'kimi-k2.5') {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.moonshot.cn/v1'
    });
    this.defaultModel = model;
  }

  /**
   * Extract structured data from content
   */
  async extract(content: string, options: ExtractOptions): Promise<Record<string, any>> {
    const fields = options.fields;
    
    const systemPrompt = `You are a data extraction assistant. Extract the following fields from the provided content.
Return ONLY a valid JSON object with the requested fields.

Fields to extract:
${fields.map(f => `- ${f.name}: ${f.description}${f.required ? ' (required)' : ''}`).join('\n')}

Rules:
1. Return valid JSON only, no markdown formatting
2. Use null for missing optional fields
3. Be concise but accurate
4. If content is insufficient, return best effort results`;

    const userPrompt = `Extract data from this content:\n\n${content.substring(0, 8000)}`;

    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1,
        response_format: { type: 'json_object' }
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('Empty response from AI');
      }

      return JSON.parse(result);
    } catch (error) {
      console.error('AI extraction failed:', error);
      
      // Return empty fields on error
      return fields.reduce((acc, field) => {
        acc[field.name] = field.required ? 'ERROR: Extraction failed' : null;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  /**
   * Summarize content
   */
  async summarize(content: string, maxLength: number = 500): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Summarize the following content in ${maxLength} characters or less. Be concise and capture the key points.`
          },
          { role: 'user', content: content.substring(0, 10000) }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return response.choices[0]?.message?.content || 'Summary failed';
    } catch (error) {
      console.error('Summarization failed:', error);
      return 'Summary failed';
    }
  }

  /**
   * Extract entities (people, organizations, locations, etc.)
   */
  async extractEntities(content: string): Promise<{
    people: string[];
    organizations: string[];
    locations: string[];
    dates: string[];
    keywords: string[];
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Extract entities from the content. Return JSON with these fields:
- people: array of person names
- organizations: array of company/organization names
- locations: array of place names
- dates: array of dates mentioned
- keywords: array of key topics (max 10)`
          },
          { role: 'user', content: content.substring(0, 8000) }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('Empty response');
      }

      return JSON.parse(result);
    } catch (error) {
      console.error('Entity extraction failed:', error);
      return { people: [], organizations: [], locations: [], dates: [], keywords: [] };
    }
  }

  /**
   * Classify content into categories
   */
  async classify(content: string, categories: string[]): Promise<{
    category: string;
    confidence: number;
    reasoning: string;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Classify the content into one of these categories: ${categories.join(', ')}.
Return JSON with: category (string), confidence (0-1), reasoning (string)`
          },
          { role: 'user', content: content.substring(0, 5000) }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('Empty response');
      }

      return JSON.parse(result);
    } catch (error) {
      console.error('Classification failed:', error);
      return { category: 'unknown', confidence: 0, reasoning: 'Classification failed' };
    }
  }
}

export default AIParser;
