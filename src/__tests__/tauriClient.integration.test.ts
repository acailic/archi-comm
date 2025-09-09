import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/tauri';
import { createProject, getProjects, getProject } from '../lib/api/tauriClient';

const iso = () => new Date().toISOString();

beforeEach(() => {
  vi.resetAllMocks();
});

describe('tauriClient integration (contracts)', () => {
  it('createProject validates response against schema', async () => {
    (invoke as any).mockResolvedValue({
      id: 'p1',
      name: 'N',
      description: 'D',
      created_at: iso(),
      updated_at: iso(),
      status: 'Planning',
      components: [],
    });
    const p = await createProject('N', 'D');
    expect(p.id).toBe('p1');
  });

  it('getProjects validates array', async () => {
    (invoke as any).mockResolvedValue([
      {
        id: 'p1',
        name: 'A',
        description: 'D',
        created_at: iso(),
        updated_at: iso(),
        status: 'Planning',
        components: [],
      },
      {
        id: 'p2',
        name: 'B',
        description: 'E',
        created_at: iso(),
        updated_at: iso(),
        status: 'Review',
        components: [],
      },
    ]);
    const arr = await getProjects();
    expect(arr).toHaveLength(2);
    expect(arr[1].status).toBe('Review');
  });

  it('getProject returns null for empty', async () => {
    (invoke as any).mockResolvedValue(null);
    const p = await getProject('missing');
    expect(p).toBeNull();
  });

  it('throws on invalid payloads', async () => {
    (invoke as any).mockResolvedValue({ id: 1 });
    await expect(createProject('x', 'y')).rejects.toBeTruthy();
  });
});
