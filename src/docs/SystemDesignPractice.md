# System Design Practice Guide

This desktop app (Tauri + React) helps you practice system design interviews by working through “Tasks” (prompts), drafting solutions, sketching diagrams, and requesting AI reviews.

## Core Concepts
- Task: A self-contained interview prompt with metadata, hints, and optional assets.
- Solution: Your written answer and optional diagram created in-app.
- Review: Automated feedback from an AI provider (rubric-driven, not authoritative).

## Task Plugin How‑To
Recommended structure (file-based plugins):
```
src/
  lib/
    tasks/
      index.ts            # exports an array of Task
      schema.ts           # Task type/interface
      plugins/
        url-shortener/
          task.json       # metadata + prompt
          assets/
            diagram.png   # optional images
```

Example `task.json`:
```json
{
  "id": "sd-url-shortener",
  "title": "URL Shortener at Scale",
  "difficulty": "medium",
  "tags": ["api", "db", "caching", "throughput"],
  "prompt": "Design a URL shortener supporting 1B URLs and 100k rps...",
  "acceptanceCriteria": [
    "High-level architecture and components",
    "APIs and storage design",
    "Scaling, consistency, availability tradeoffs"
  ],
  "hints": ["Base62 IDs", "Hot cache + cold store"],
  "assets": ["./assets/diagram.png"]
}
```
Example `schema.ts`:
```ts
export type Task = {
  id: string; title: string; difficulty: 'easy'|'medium'|'hard';
  tags: string[]; prompt: string; acceptanceCriteria: string[];
  hints?: string[]; assets?: string[];
};
```
Example `index.ts`:
```ts
import urlShortener from './plugins/url-shortener/task.json';
import type { Task } from './schema';
export const tasks: Task[] = [urlShortener];
```
After adding a plugin folder with `task.json`, export it from `index.ts`. Run `npm run dev` and the task appears in the selector.

## AI Review Integration
Keep API keys out of the frontend. Add a Tauri command that proxies requests.

1) Add Rust deps in `src-tauri/Cargo.toml`:
```
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```
2) Add a command in `src-tauri/src/main.rs`:
```rust
#[derive(serde::Deserialize)]
struct ReviewReq { task_id: String, solution_text: String }
#[derive(serde::Serialize)]
struct ReviewResp { summary: String, strengths: Vec<String>, risks: Vec<String>, score: u8 }

#[tauri::command]
async fn ai_review(req: ReviewReq) -> Result<ReviewResp, String> {
  let key = std::env::var("OPENAI_API_KEY").map_err(|_| "Missing OPENAI_API_KEY")?;
  let body = serde_json::json!({
    "model": "gpt-4o-mini",
    "messages": [
      {"role":"system","content":"You are a senior system design interviewer. Evaluate against clarity, correctness, scalability, reliability, and tradeoffs. Return concise feedback."},
      {"role":"user","content": format!("Task: {}\nSolution:\n{}", req.task_id, req.solution_text)}
    ]
  });
  let client = reqwest::Client::new();
  let resp = client.post("https://api.openai.com/v1/chat/completions")
    .bearer_auth(key).json(&body).send().await.map_err(|e| e.to_string())?;
  let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
  let text = json["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string();
  Ok(ReviewResp { summary: text, strengths: vec![], risks: vec![], score: 0 })
}
```
3) Register handler in `tauri::generate_handler![..., ai_review, ...]`.
4) Frontend usage:
```ts
import { invoke } from '@tauri-apps/api/tauri';
const res = await invoke<ReviewResp>('ai_review', { req: { taskId, solutionText } });
```
5) Set key securely at runtime (don’t commit):
- macOS/Linux: `OPENAI_API_KEY=sk-... npm run dev`
- Windows (PowerShell): `$env:OPENAI_API_KEY='sk-...'; npm run dev`

Security tips: don’t log prompts/keys, add timeouts, and rate-limit requests. Consider Anthropic or local inference by swapping the endpoint in the same command.

## Suggested Practice Flow
1) Pick a Task → read acceptance criteria.
2) Draft Solution → outline, API, data model, scaling plan.
3) Diagram → use the canvas; save with the project.
4) AI Review → refine using feedback; iterate and compare to rubric.

