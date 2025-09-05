import { Project, Project as ProjectSchema } from '../contracts/schema';
import { invoke } from '@tauri-apps/api/tauri';

export async function createProject(name: string, description: string): Promise<Project> {
  const raw = await invoke<any>('create_project', { name, description });
  return ProjectSchema.parse(raw);
}

export async function getProjects(): Promise<Project[]> {
  const raw = await invoke<any>('get_projects');
  return ProjectSchema.array().parse(raw);
}

export async function getProject(projectId: string): Promise<Project | null> {
  const raw = await invoke<any>('get_project', { projectId });
  return raw ? ProjectSchema.parse(raw) : null;
}

