import { ReviewResp as ReviewRespSchema, type ReviewResp } from '../contracts/schema';
import { invoke } from '@tauri-apps/api/tauri';

export async function reviewSolution(taskId: string, solutionText: string): Promise<ReviewResp> {
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

