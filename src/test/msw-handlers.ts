import { http, HttpResponse } from 'msw';

// Centralized MSW handlers used during Vitest runs.
// Keep responses minimal and deterministic for stability.
export const handlers = [
  // Mock OpenAI Chat Completions used by AI config/tests
  http.post('https://api.openai.com/v1/chat/completions', async () => {
    return HttpResponse.json({
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content:
              '{"summary":"Mock review","strengths":[],"risks":[],"score":90}',
          },
        },
      ],
    });
  }),

  // Mock challenges endpoint used in web mode when fetching scenarios
  http.get('/api/challenges', async () => {
    return HttpResponse.json([]);
  }),
  http.post('/api/challenges', async () => {
    return HttpResponse.json([]);
  }),
];

