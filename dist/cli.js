/**
 * CLI entry point for AI Crawler
 */
import { Command } from 'commander';
import { Crawler } from './core/crawler.js';
import { readFileSync } from 'fs';
const program = new Command();
program
    .name('ai-crawler')
    .description('AI-powered web crawler')
    .version('1.0.0');
// Run task from config file
program
    .command('run')
    .description('Run a crawl task from config file')
    .argument('<config>', 'Path to task config file (YAML or JSON)')
    .option('-d, --data-dir <dir>', 'Data directory', './data')
    .option('-v, --verbose', 'Verbose output')
    .action(async (configPath, options) => {
    const crawler = new Crawler(options.dataDir);
    try {
        // Load config
        const configContent = readFileSync(configPath, 'utf-8');
        const task = configPath.endsWith('.yaml') || configPath.endsWith('.yml')
            ? require('js-yaml').load(configContent)
            : JSON.parse(configContent);
        console.log(`🚀 Starting task: ${task.name}`);
        console.log(`📄 Description: ${task.description || 'N/A'}`);
        console.log(`🔍 Source: ${task.source}`);
        console.log('');
        // Setup event listeners
        crawler.on('task:start', (t) => console.log(`✅ Task started: ${t.name}`));
        crawler.on('urls:discovered', ({ count }) => console.log(`🔗 Discovered ${count} URLs`));
        crawler.on('url:start', ({ url, progress }) => console.log(`⏳ [${progress}] Crawling: ${url}`));
        crawler.on('url:complete', ({ url }) => console.log(`✓ Completed: ${url}`));
        crawler.on('url:error', ({ url, error }) => console.log(`✗ Error on ${url}: ${error}`));
        crawler.on('url:skipped', ({ url, reason }) => console.log(`⏭ Skipped ${url}: ${reason}`));
        // Execute
        const results = await crawler.execute(task);
        console.log('');
        console.log('📊 Results:');
        console.log(`  Total: ${results.length}`);
        console.log(`  Success: ${results.filter(r => r.status === 'success').length}`);
        console.log(`  Failed: ${results.filter(r => r.status === 'failed').length}`);
        // Show sample
        if (results.length > 0) {
            console.log('');
            console.log('📝 Sample result:');
            const sample = results[0];
            console.log(`  Title: ${sample.title}`);
            console.log(`  URL: ${sample.url}`);
            console.log(`  Extracted: ${JSON.stringify(sample.extractedData, null, 2)}`);
        }
    }
    catch (error) {
        console.error('❌ Task failed:', error);
        process.exit(1);
    }
    finally {
        await crawler.close();
    }
});
// Quick search command
program
    .command('search')
    .description('Quick search and extract')
    .argument('<query>', 'Search query')
    .option('-n, --max-results <n>', 'Max results', '5')
    .option('-d, --data-dir <dir>', 'Data directory', './data')
    .action(async (query, options) => {
    const task = {
        id: `search-${Date.now()}`,
        name: `Search: ${query}`,
        source: 'search',
        searchQuery: query,
        options: {
            maxPages: parseInt(options.maxResults),
            useBrowser: true,
            delay: 2000
        }
    };
    const crawler = new Crawler(options.dataDir);
    try {
        console.log(`🔍 Searching: ${query}`);
        crawler.on('url:complete', ({ url }) => console.log(`✓ ${url}`));
        crawler.on('url:error', ({ url, error }) => console.log(`✗ ${url}: ${error}`));
        const results = await crawler.execute(task);
        console.log('');
        console.log(`Found ${results.length} results`);
        for (const result of results) {
            console.log('');
            console.log(`📄 ${result.title}`);
            console.log(`   ${result.url}`);
            if (result.extractedData?.summary) {
                console.log(`   ${result.extractedData.summary}`);
            }
        }
    }
    catch (error) {
        console.error('❌ Search failed:', error);
        process.exit(1);
    }
    finally {
        await crawler.close();
    }
});
// Stats command
program
    .command('stats')
    .description('Show crawl statistics')
    .option('-t, --task <taskId>', 'Task ID filter')
    .option('-d, --data-dir <dir>', 'Data directory', './data')
    .action(async (options) => {
    const crawler = new Crawler(options.dataDir);
    try {
        const stats = crawler.getStats(options.task);
        console.log('📊 Crawl Statistics');
        console.log('==================');
        console.log(`Total:    ${stats.total}`);
        console.log(`Pending:  ${stats.pending}`);
        console.log(`Crawling: ${stats.crawling}`);
        console.log(`Completed:${stats.completed}`);
        console.log(`Failed:   ${stats.failed}`);
    }
    catch (error) {
        console.error('❌ Failed to get stats:', error);
        process.exit(1);
    }
    finally {
        await crawler.close();
    }
});
// Cleanup command
program
    .command('cleanup')
    .description('Clean up old records')
    .option('-d, --days <days>', 'Delete records older than N days', '30')
    .option('--data-dir <dir>', 'Data directory', './data')
    .action(async (options) => {
    const crawler = new Crawler(options.dataDir);
    try {
        const deleted = crawler.cleanup(parseInt(options.days));
        console.log(`🗑 Deleted ${deleted} old records`);
    }
    catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
    finally {
        await crawler.close();
    }
});
program.parse();
//# sourceMappingURL=cli.js.map