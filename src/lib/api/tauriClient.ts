import { invoke } from '@tauri-apps/api/tauri';
import { readTextFile, writeTextFile, createDir, exists, removeFile } from '@tauri-apps/api/fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { Project } from '../contracts/schema';
import { Project as ProjectSchema } from '../contracts/schema';
import { isTauriEnvironment } from '../environment';
import type { DesignData } from '../../shared/contracts';

export async function createProject(name: string, description: string): Promise<Project> {
  const raw = await invoke<unknown>('create_project', { name, description });
  return ProjectSchema.parse(raw);
}

export async function getProjects(): Promise<Project[]> {
  const raw = await invoke<unknown>('get_projects');
  return ProjectSchema.array().parse(raw);
}

export async function getProject(projectId: string): Promise<Project | null> {
  const raw = await invoke<unknown>('get_project', { projectId });
  return raw ? ProjectSchema.parse(raw) : null;
}

// Persistence: save and load design data to $APPDATA/archicomm/projects/<id>.json

function validateDesignData(data: DesignData): void {
  if (!data || typeof data !== 'object') {
    throw new Error('DesignData is required');
  }
  if (!Array.isArray(data.components)) {
    throw new Error('DesignData.components must be an array');
  }
  if (!Array.isArray(data.connections)) {
    throw new Error('DesignData.connections must be an array');
  }
  if (!Array.isArray(data.layers)) {
    throw new Error('DesignData.layers must be an array');
  }
  // Backward compatibility: allow missing schemaVersion but normalize downstream
}

async function getProjectDir(): Promise<string> {
  const base = await appDataDir();
  const dir = await join(base, 'archicomm', 'projects');
  return dir;
}

async function ensureProjectDir(): Promise<void> {
  const dir = await getProjectDir();
  const existsDir = await exists(dir);
  if (!existsDir) {
    await createDir(dir, { recursive: true });
  }
}

async function getDesignFilePath(projectId: string): Promise<string> {
  const dir = await getProjectDir();
  return join(dir, `${projectId}.json`);
}

export async function saveDesign(
  projectId: string,
  data: DesignData,
  options: { retries?: number } = {}
): Promise<void> {
  validateDesignData(data);
  const payload = JSON.stringify(
    {
      schemaVersion: data.schemaVersion ?? 1,
      components: data.components,
      connections: data.connections,
      layers: data.layers || [],
      gridConfig: data.gridConfig || null,
      metadata: data.metadata || {},
      savedAt: new Date().toISOString(),
    },
    null,
    2
  );

  if (!isTauriEnvironment()) {
    // Web fallback: localStorage
    localStorage.setItem(`archicomm-project-${projectId}`, payload);
    return;
  }

  const retries = Math.max(0, options.retries ?? 2);
  let attempt = 0;
  // Retry write on failure
   
  while (true) {
    try {
      await ensureProjectDir();
      const filePath = await getDesignFilePath(projectId);
      await writeTextFile(filePath, payload);
      return;
    } catch (err) {
      if (attempt++ >= retries) throw err;
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
}

export async function loadDesign(projectId: string): Promise<DesignData | null> {
  if (!isTauriEnvironment()) {
    const raw = localStorage.getItem(`archicomm-project-${projectId}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed as DesignData;
    } catch {
      return null;
    }
  }
  try {
    const filePath = await getDesignFilePath(projectId);
    const content = await readTextFile(filePath);
    const parsed = JSON.parse(content) as DesignData;
    validateDesignData(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export interface SavedProjectMeta {
  id: string;
  path: string;
  updatedAt?: string;
}

export async function listSavedProjects(): Promise<SavedProjectMeta[]> {
  // As a lightweight approach without directory listing, rely on project metadata API when available.
  // This function can be extended to enumerate files if needed.
  const projects = await getProjects().catch(() => []);
  return Promise.all(
    projects.map(async p => ({
      id: p.id,
      path: await getDesignFilePath(p.id),
      updatedAt: p.updated_at,
    }))
  );
}

export async function deleteSavedProject(projectId: string): Promise<void> {
  if (!isTauriEnvironment()) {
    localStorage.removeItem(`archicomm-project-${projectId}`);
    return;
    }
  try {
    const filePath = await getDesignFilePath(projectId);
    await removeFile(filePath);
  } catch {/* ignore */}
}
