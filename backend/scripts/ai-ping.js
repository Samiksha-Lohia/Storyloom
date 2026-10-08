import { generateJSON } from '../src/services/ai-provider.service.js';
import { buildTextEmbedding } from '../src/analysis/local-analyzer.js';
import logger from '../src/utilities/logger.js';

async function main() {
  logger.info('Starting AI Ping test...');
  
  try {
    logger.info('Testing generateJSON...');
    const testPrompt = 'Respond with a JSON object containing a "status" field set to "success" and a "message" field saying hello.';
    const schemaHint = {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING' },
        message: { type: 'STRING' }
      },
      required: ['status', 'message']
    };
    
    const jsonResult = await generateJSON(testPrompt, schemaHint);
    logger.info(`generateJSON result: ${JSON.stringify(jsonResult)}`);
    
    if (jsonResult && jsonResult.status === 'success') {
      logger.info('✓ generateJSON test passed!');
    } else {
      throw new Error('generateJSON did not return the expected JSON format');
    }
    
    logger.info('Testing buildTextEmbedding (local)...');
    const embedding = buildTextEmbedding('SceneCraft AI Ping');
    logger.info(`buildTextEmbedding result: array of size ${embedding.length}`);
    
    if (Array.isArray(embedding) && embedding.length > 0) {
      logger.info('✓ buildTextEmbedding test passed!');
    } else {
      throw new Error('buildTextEmbedding did not return a valid array');
    }
    
    logger.info('=== All AI Ping tests passed successfully! ===');
    process.exit(0);
  } catch (error) {
    logger.error(`AI Ping test failed: ${error.message}`);
    process.exit(1);
  }
}

main();
