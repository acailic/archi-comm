import { ReviewResp as ReviewRespSchema, type ReviewResp } from '../contracts/schema';
import { aiConfigService } from '@/lib/services/AIConfigService';
import { DEFAULT_SETTINGS } from '../types/AIConfig';
import { isTauri } from '@/lib/platform/tauri';

// AI API Response interface for different providers
interface AIResponse {
  content: string;
  model?: string;
}

export async function reviewSolution(taskId: string, solutionText: string): Promise<ReviewResp> {
  if (!isTauri()) {
    throw new Error(
      'AI provider calls are only available in the desktop application to protect API keys.'
    );
  }

  const config = await aiConfigService.loadConfig();

  if (!config.openai.enabled || !config.openai.apiKey) {
    throw new Error('OpenAI is not configured or enabled');
  }

  const response = await callOpenAI(config.openai.apiKey, solutionText);
  return parseAIResponse(response.content);
}

// Simplified OpenAI API implementation
async function callOpenAI(apiKey: string, prompt: string): Promise<AIResponse> {
  const config = await aiConfigService.loadConfig();
  const settings = {
    temperature: DEFAULT_SETTINGS.temperature,
    maxTokens: DEFAULT_SETTINGS.maxTokens,
    ...config,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: createReviewPrompt(prompt) }],
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model,
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
export function parseAIResponse(content: string): ReviewResp {
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
    score: 75, // Default score for plain text responses
  });
}

// Utility function to check if AI is available
export async function isAIAvailable(): Promise<boolean> {
  const config = await aiConfigService.loadConfig();
  return config.openai.enabled && config.openai.apiKey !== '';
}
