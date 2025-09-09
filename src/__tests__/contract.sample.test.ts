import { describe, it, expect } from 'vitest';
import { Project } from '../lib/contracts/schema';

describe('Rust -> FE contract (sample payload)', () => {
  it('validates Project shape and timestamps', () => {
    const sample = {
      id: '123',
      name: 'Sample',
      description: 'Desc',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'Planning',
      components: [],
    };
    const parsed = Project.parse(sample);
    expect(parsed.name).toBe('Sample');
  });
});
