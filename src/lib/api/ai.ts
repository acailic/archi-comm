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
    // Try to use configured OpenAI first
    const config = await aiConfigService.loadConfig();
    
    if (config.openai.enabled && config.openai.apiKey) {
      if (!isTauri()) {
        throw new Error('AI provider calls are only available in the desktop application to protect API keys.');
      }
      const response = await callOpenAI(config.openai.apiKey, solutionText);
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

// Call OpenAI directly (simplified)
export async function callOpenAIProvider(
  config: AIConfig, 
  prompt: string
): Promise<AIResponse> {
  if (!isTauri()) {
    throw new Error('AI provider calls are only available in the desktop application to protect API keys.');
  }
  
  if (!config.openai.enabled || !config.openai.apiKey) {
    throw new Error('OpenAI is not configured or enabled');
  }

  return callOpenAI(config.openai.apiKey, prompt);
}

// Simplified OpenAI API implementation
async function callOpenAI(
  apiKey: string, 
  prompt: string
): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: createReviewPrompt(prompt) }],
      temperature: 0.7,
      max_tokens: 1000
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

// Utility function to check if AI is available
export async function isAIAvailable(): Promise<boolean> {
  try {
    const config = await aiConfigService.loadConfig();
    return config.openai.enabled && config.openai.apiKey !== '';
  } catch (error) {
    return false;
  }
}

