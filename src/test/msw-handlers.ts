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

  // Generic placeholder assets used in dev/test data
  http.get('/api/placeholder/:w/:h', async ({ params }) => {
    const { w = '300', h = '200' } = params as Record<string, string>;
    // Return a tiny SVG placeholder to avoid binary handling
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#888">${w}x${h}</text></svg>`;
    return new HttpResponse(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
  }),

  // Fallback for any other /api/* calls during tests
  http.all(/\/api\/.*/i, async () => {
    return HttpResponse.json({}, { status: 200 });
  }),
];
