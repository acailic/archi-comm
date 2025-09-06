import { ReviewResp as ReviewRespSchema, type ReviewResp } from '../contracts/schema';
import { invoke } from '@tauri-apps/api/tauri';
import { aiConfigService } from '../services/AIConfigService';
import { AIProvider, AIConfig } from '../types/AIConfig';
import { isTauri } from '../tauri';

// AI API Response interface for different providers
interface AIResponse {
  content: string;
  model?: string;
}

export async function reviewSolution(taskId: string, solutionText: string): Promise<ReviewResp> {
  try {
    // Try to use configured AI provider first
    const provider = await aiConfigService.getDefaultProvider();
    const config = await aiConfigService.loadConfig();
    
    if (provider && config[provider].enabled && config[provider].apiKey) {
      if (!isTauri()) {
        throw new Error('AI provider calls are only available in the desktop application to protect API keys.');
      }
      const response = await callAIProvider(provider, config, solutionText);
      return parseAIResponse(response.content);
    }
  } catch (error) {
    console.warn('Failed to use configured AI provider, falling back to Tauri backend:', error);
  }

  // Fallback to existing Tauri backend implementation
  const raw = await invoke<any>('ai_review', { req: { task_id: taskId, solution_text: solutionText } });
  
  // Accept either our shaped response or a raw OpenAI content string
  if (raw && typeof raw === 'object' && 'summary' in raw) {
    return ReviewRespSchema.parse(raw);
  }
  if (raw && typeof raw === 'string') {
    return ReviewRespSchema.parse({ summary: raw, strengths: [], risks: [], score: 0 });
  }
  // Fallback for unexpected shapes
  return ReviewRespSchema.parse({ summary: String(raw ?? ''), strengths: [], risks: [], score: 0 });
}

// Call AI provider directly
export async function callAIProvider(
  provider: AIProvider, 
  config: AIConfig, 
  prompt: string
): Promise<AIResponse> {
  if (!isTauri()) {
    throw new Error('AI provider calls are only available in the desktop application to protect API keys.');
  }
  
  const providerConfig = config[provider];
  
  if (!providerConfig.enabled || !providerConfig.apiKey) {
    throw new Error(`${provider} is not configured or enabled`);
  }

  switch (provider) {
    case AIProvider.OPENAI:
      return callOpenAI(providerConfig.apiKey, providerConfig.selectedModel, prompt, providerConfig.settings);
    
    case AIProvider.GEMINI:
      return callGemini(providerConfig.apiKey, providerConfig.selectedModel, prompt, providerConfig.settings);
    
    case AIProvider.CLAUDE:
      return callClaude(providerConfig.apiKey, providerConfig.selectedModel, prompt, providerConfig.settings);
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// OpenAI API implementation
async function callOpenAI(
  apiKey: string, 
  model: string, 
  prompt: string, 
  settings: any
): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: createReviewPrompt(prompt) }],
      temperature: settings.temperature || 0.7,
      max_tokens: settings.maxTokens || 2000,
      top_p: settings.topP || 1,
      frequency_penalty: settings.frequencyPenalty || 0,
      presence_penalty: settings.presencePenalty || 0
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model
  };
}

// Gemini API implementation
async function callGemini(
  apiKey: string, 
  model: string, 
  prompt: string, 
  settings: any
): Promise<AIResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: createReviewPrompt(prompt) }]
        }],
        generationConfig: {
          temperature: settings.temperature || 0.7,
          maxOutputTokens: settings.maxTokens || 2000,
          topP: settings.topP || 1,
          topK: settings.topK || 40
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return {
    content,
    model
  };
}

// Claude API implementation
async function callClaude(
  apiKey: string, 
  model: string, 
  prompt: string, 
  settings: any
): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: settings.maxTokens || 2000,
      temperature: settings.temperature || 0.7,
      top_p: settings.topP || 1,
      messages: [{ 
        role: 'user', 
        content: createReviewPrompt(prompt) 
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  
  return {
    content,
    model: data.model
  };
}

// Create a review prompt for solution analysis
function createReviewPrompt(solutionText: string): string {
  return `Please analyze this solution and provide a structured review. 

Solution to review:
${solutionText}

Please provide your response in the following JSON format:
{
  "summary": "A brief summary of the solution quality and main points",
  "strengths": ["List", "of", "solution", "strengths"],
  "risks": ["List", "of", "potential", "risks", "or", "issues"],
  "score": 85
}

The score should be between 0-100 representing the overall quality of the solution.`;
}

// Parse AI response and extract review information
function parseAIResponse(content: string): ReviewResp {
  try {
    // Try to parse as JSON first
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return ReviewRespSchema.parse(parsed);
    }
  } catch (error) {
    console.warn('Failed to parse AI response as JSON:', error);
  }

  // Fallback: create review from plain text
  return ReviewRespSchema.parse({
    summary: content.slice(0, 500), // Limit summary length
    strengths: [],
    risks: [],
    score: 75 // Default score for plain text responses
  });
}

// Utility function to get configured AI provider
export async function getConfiguredProvider(): Promise<AIProvider | null> {
  return aiConfigService.getDefaultProvider();
}

// Utility function to check if AI is available
export async function isAIAvailable(): Promise<boolean> {
  try {
    const provider = await getConfiguredProvider();
    return provider !== null;
  } catch (error) {
    return false;
  }
}

