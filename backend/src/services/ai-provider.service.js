import config from '../config/env.js';
import logger from '../utilities/logger.js';

// Configuration maps to distribute the stages across the 3 OpenRouter keys
const STAGE_CONFIG_MAP = {
  scenes: { keyIndex: 1, modelIndex: 1 },
  timeline: { keyIndex: 1, modelIndex: 1 },
  characters: { keyIndex: 2, modelIndex: 2 },
  continuity: { keyIndex: 2, modelIndex: 2 },
  relationships: { keyIndex: 3, modelIndex: 3 },
};

/**
 * Gets the OpenRouter API Key and Model configured for a specific stage.
 * Defaults to configuration set 1.
 */
const getStageConfig = (stage) => {
  const cfg = STAGE_CONFIG_MAP[stage] || { keyIndex: 1, modelIndex: 1 };
  const apiKey = config.ai.openrouter[`apiKey${cfg.keyIndex}`];
  const model = config.ai.openrouter[`model${cfg.modelIndex}`];
  return { apiKey, model, keyIndex: cfg.keyIndex, modelIndex: cfg.modelIndex };
};

/**
 * Helper function to execute a function with exponential backoff.
 * Retries up to 3 times for transient failures.
 */
const retryWithBackoff = async (fn, attempts = 3, initialDelay = 1000) => {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isAuthError = 
        error.status === 401 || 
        error.status === 403 || 
        error.message?.includes('API_KEY_INVALID') || 
        error.message?.includes('API key not valid') ||
        error.message?.includes('invalid API key') ||
        error.message?.includes('Unauthorized');
      
      const isSyntaxError = error instanceof SyntaxError;

      if (isAuthError) {
        logger.error(`OpenRouter Authentication Error: ${error.message}`);
        throw new Error(`OpenRouter Authentication Failed: ${error.message}`);
      }

      if (isSyntaxError) {
        logger.error(`OpenRouter JSON Syntax Error: ${error.message}`);
        throw error;
      }

      if (attempt === attempts) {
        logger.error(`OpenRouter call failed after ${attempts} attempts. Error: ${error.message}`);
        throw error;
      }

      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
        logger.warn(`OpenRouter rate-limited (attempt ${attempt}/${attempts}). Retrying in ${delay}ms...`);
      } else {
        logger.warn(`OpenRouter call failed (attempt ${attempt}/${attempts}). Retrying in ${delay}ms... Error: ${error.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

/**
 * Extracts and parses a JSON object robustly from a text response.
 * Handles markdown code fences, extra text, and unmatched leading/trailing braces.
 */
export const parseRobustJSON = (text) => {
  if (!text) return null;
  const trimmed = text.trim();
  
  // Try direct parsing first
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    // Ignore and proceed to extraction
  }
  
  // Extract JSON from markdown code blocks (e.g. ```json ... ``` or ``` ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = trimmed.match(codeBlockRegex);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (err) {
      // Ignore and try brace matching
    }
  }
  
  // Find first '{' or '[' and last '}' or ']'
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  
  let startIdx = -1;
  let endIdx = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = lastBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = lastBracket;
  }
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try {
      const jsonStr = trimmed.slice(startIdx, endIdx + 1);
      return JSON.parse(jsonStr);
    } catch (err) {
      // Ignore
    }
  }
  
  throw new SyntaxError(`Failed to parse robust JSON from response: ${text.slice(0, 100)}...`);
};

/**
 * Generates structured JSON from a text prompt via OpenRouter.
 *
 * @param {string} prompt - Prompt to pass to the model
 * @param {object} [schemaHint] - Optional JSON schema object or structural hint
 * @param {string} [stage] - Optional pipeline stage to decide key/model mapping
 * @returns {Promise<object>} Parsed JSON response
 */
export const generateJSON = async (prompt, schemaHint = null, stage = null) => {
  const { apiKey, model, keyIndex, modelIndex } = getStageConfig(stage);

  if (!apiKey) {
    throw new Error(`OpenRouter API Key ${keyIndex} is not configured. Please check your environment variables.`);
  }

  // Support groq model mapping or fallback
  let activeModel = model || 'meta-llama/llama-3.3-70b-instruct';
  if (activeModel.trim().toLowerCase() === 'groq' || activeModel.toLowerCase().includes('groq')) {
    activeModel = 'meta-llama/llama-3.3-70b-instruct';
  }

  logger.info(`Invoking OpenRouter for stage: "${stage || 'generic'}" (using Key ${keyIndex}, Model: "${activeModel}")`);

  const configuredTokens = parseInt(config.ai.openrouter.maxTokens, 10);
  let effectiveMaxTokens = !isNaN(configuredTokens) && configuredTokens > 0 ? Math.min(configuredTokens, 1500) : 1500;

  const result = await retryWithBackoff(async () => {
    let formattedPrompt = prompt;
    if (!/json/i.test(formattedPrompt)) {
      formattedPrompt += '\n\nIMPORTANT: Return the response as a valid JSON object.';
    }

    const payload = {
      model: activeModel,
      messages: [{ role: 'user', content: formattedPrompt }],
      max_tokens: effectiveMaxTokens,
    };

    // If model supports JSON format, tell it to output a JSON object
    payload.response_format = { type: 'json_object' };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SceneCraft',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      let statusError;
      try {
        const parsedErr = JSON.parse(errText);
        const errMsg = parsedErr.error?.message || `HTTP ${response.status} Error`;
        statusError = new Error(errMsg);
        statusError.status = response.status;

        // If credits or max_tokens is exceeded, automatically switch to free model or lower tokens for retry
        if (errMsg.includes('requires more credits') || errMsg.includes('max_tokens')) {
          if (activeModel !== 'openrouter/free') {
            logger.warn(`OpenRouter model "${activeModel}" credit exceeded, switching to "openrouter/free"`);
            activeModel = 'openrouter/free';
          } else {
            effectiveMaxTokens = Math.max(512, Math.floor(effectiveMaxTokens / 2));
          }
        }
      } catch (e) {
        statusError = new Error(`OpenRouter request failed with status ${response.status}: ${errText}`);
        statusError.status = response.status;
      }
      throw statusError;
    }

    const resJson = await response.json();
    const textResponse = resJson.choices?.[0]?.message?.content;
    if (!textResponse) {
      throw new Error('Received empty response from OpenRouter');
    }

    return parseRobustJSON(textResponse);
  });

  return result;
};
