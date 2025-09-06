// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::fs;
use std::env;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// Development utilities
#[cfg(debug_assertions)]
mod dev_utils;

// Audio transcription module
mod transcription;

// Data structures for transcription
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionSegment {
    pub text: String,
    pub start: i64,
    pub end: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub text: String,
    pub segments: Vec<TranscriptionSegment>,
}

// Data structures for the application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub status: ProjectStatus,
    pub components: Vec<Component>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProjectStatus {
    Planning,
    InProgress,
    Review,
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Component {
    pub id: String,
    pub name: String,
    pub component_type: ComponentType,
    pub description: String,
    pub dependencies: Vec<String>,
    pub status: ComponentStatus,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComponentType {
    Frontend,
    Backend,
    Database,
    Api,
    Service,
    Integration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComponentStatus {
    NotStarted,
    InProgress,
    Testing,
    Done,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagramElement {
    pub id: String,
    pub element_type: String,
    pub position: Position,
    pub properties: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub connection_type: String,
    pub properties: HashMap<String, String>,
}

// Application state
type ProjectStore = Mutex<HashMap<String, Project>>;
type DiagramStore = Mutex<HashMap<String, Vec<DiagramElement>>>;
type ConnectionStore = Mutex<HashMap<String, Vec<Connection>>>;

// Tauri commands for project management
#[tauri::command]
async fn create_project(
    name: String,
    description: String,
    projects: State<'_, ProjectStore>,
) -> Result<Project, String> {
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        status: ProjectStatus::Planning,
        components: Vec::new(),
    };

    let mut store = projects.lock().unwrap();
    let project_id = project.id.clone();
    store.insert(project_id, project.clone());

    Ok(project)
}

#[tauri::command]
async fn get_projects(projects: State<'_, ProjectStore>) -> Result<Vec<Project>, String> {
    let store = projects.lock().unwrap();
    Ok(store.values().cloned().collect())
}

#[tauri::command]
async fn get_project(
    project_id: String,
    projects: State<'_, ProjectStore>,
) -> Result<Option<Project>, String> {
    let store = projects.lock().unwrap();
    Ok(store.get(&project_id).cloned())
}

#[tauri::command]
async fn update_project(
    project_id: String,
    name: Option<String>,
    description: Option<String>,
    status: Option<ProjectStatus>,
    projects: State<'_, ProjectStore>,
) -> Result<Option<Project>, String> {
    let mut store = projects.lock().unwrap();
    
    if let Some(project) = store.get_mut(&project_id) {
        if let Some(new_name) = name {
            project.name = new_name;
        }
        if let Some(new_description) = description {
            project.description = new_description;
        }
        if let Some(new_status) = status {
            project.status = new_status;
        }
        project.updated_at = Utc::now();
        
        Ok(Some(project.clone()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn delete_project(
    project_id: String,
    projects: State<'_, ProjectStore>,
) -> Result<bool, String> {
    let mut store = projects.lock().unwrap();
    Ok(store.remove(&project_id).is_some())
}

// Tauri commands for component management
#[tauri::command]
async fn add_component(
    project_id: String,
    name: String,
    component_type: ComponentType,
    description: String,
    projects: State<'_, ProjectStore>,
) -> Result<Option<Component>, String> {
    let mut store = projects.lock().unwrap();
    
    if let Some(project) = store.get_mut(&project_id) {
        let component = Component {
            id: Uuid::new_v4().to_string(),
            name,
            component_type,
            description,
            dependencies: Vec::new(),
            status: ComponentStatus::NotStarted,
            metadata: HashMap::new(),
        };
        
        project.components.push(component.clone());
        project.updated_at = Utc::now();
        
        Ok(Some(component))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn update_component(
    project_id: String,
    component_id: String,
    name: Option<String>,
    description: Option<String>,
    status: Option<ComponentStatus>,
    dependencies: Option<Vec<String>>,
    projects: State<'_, ProjectStore>,
) -> Result<Option<Component>, String> {
    let mut store = projects.lock().unwrap();
    
    if let Some(project) = store.get_mut(&project_id) {
        if let Some(component) = project.components.iter_mut().find(|c| c.id == component_id) {
            if let Some(new_name) = name {
                component.name = new_name;
            }
            if let Some(new_description) = description {
                component.description = new_description;
            }
            if let Some(new_status) = status {
                component.status = new_status;
            }
            if let Some(new_dependencies) = dependencies {
                component.dependencies = new_dependencies;
            }
            
            project.updated_at = Utc::now();
            Ok(Some(component.clone()))
        } else {
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn remove_component(
    project_id: String,
    component_id: String,
    projects: State<'_, ProjectStore>,
) -> Result<bool, String> {
    let mut store = projects.lock().unwrap();
    
    if let Some(project) = store.get_mut(&project_id) {
        let initial_len = project.components.len();
        project.components.retain(|c| c.id != component_id);
        project.updated_at = Utc::now();
        
        Ok(project.components.len() < initial_len)
    } else {
        Ok(false)
    }
}

// Tauri commands for diagram management
#[tauri::command]
async fn save_diagram(
    project_id: String,
    elements: Vec<DiagramElement>,
    diagrams: State<'_, DiagramStore>,
) -> Result<(), String> {
    let mut store = diagrams.lock().unwrap();
    store.insert(project_id, elements);
    Ok(())
}

#[tauri::command]
async fn load_diagram(
    project_id: String,
    diagrams: State<'_, DiagramStore>,
) -> Result<Vec<DiagramElement>, String> {
    let store = diagrams.lock().unwrap();
    Ok(store.get(&project_id).cloned().unwrap_or_default())
}

#[tauri::command]
async fn save_connections(
    project_id: String,
    connections: Vec<Connection>,
    connection_store: State<'_, ConnectionStore>,
) -> Result<(), String> {
    let mut store = connection_store.lock().unwrap();
    store.insert(project_id, connections);
    Ok(())
}

#[tauri::command]
async fn load_connections(
    project_id: String,
    connection_store: State<'_, ConnectionStore>,
) -> Result<Vec<Connection>, String> {
    let store = connection_store.lock().unwrap();
    Ok(store.get(&project_id).cloned().unwrap_or_default())
}

// Tauri command for saving audio files
#[tauri::command]
async fn save_audio_file(file_name: String, data: Vec<u8>) -> Result<String, String> {
    // Get the system temporary directory
    let temp_dir = env::temp_dir();
    
    // Create a subdirectory for archicomm audio files
    let audio_dir = temp_dir.join("archicomm_audio");
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&audio_dir)
        .map_err(|e| format!("Failed to create audio directory: {}", e))?;
    
    // Construct the full file path
    let file_path = audio_dir.join(&file_name);
    
    // Write the audio data to the file
    fs::write(&file_path, data)
        .map_err(|e| format!("Failed to write audio file '{}': {}", file_name, e))?;
    
    // Return the full file path as a string
    file_path.to_string_lossy().to_string().into()
}

// Tauri command for audio transcription
#[tauri::command]
async fn transcribe_audio(file_path: String) -> Result<TranscriptionResponse, String> {
    let config = transcription::TranscriptionConfig {
        model_type: "base".to_string(),
        language: Some("en".to_string()),
        audio_file_path: PathBuf::new(),
        output_format: "text".to_string(),
    };

    let mut transcriber = transcription::AudioTranscriber::new(config);
    if let Err(e) = transcriber.initialize().await {
        return Err(format!("Failed to initialize transcriber: {}", e));
    }

    let audio_path = PathBuf::from(file_path);
    match transcriber.transcribe_audio(&audio_path).await {
        Ok(result) => {
            // simple_transcribe_rs does not provide segments, so we return an empty vec
            let response = TranscriptionResponse {
                text: result.text,
                segments: vec![],
            };
            Ok(response)
        }
        Err(e) => Err(e.to_string()),
    }
}


// Utility commands
#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok("0.2.0".to_string())
}

#[tauri::command]
async fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(std::path::Path::new(&path).parent().unwrap_or_else(|| std::path::Path::new("/")))
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn export_project_data(
    project_id: String,
    projects: State<'_, ProjectStore>,
    diagrams: State<'_, DiagramStore>,
    connections: State<'_, ConnectionStore>,
) -> Result<String, String> {
    let project_store = projects.lock().unwrap();
    let diagram_store = diagrams.lock().unwrap();
    let connection_store = connections.lock().unwrap();

    let project = project_store.get(&project_id);
    let diagram_elements = diagram_store.get(&project_id).cloned().unwrap_or_default();
    let diagram_connections = connection_store.get(&project_id).cloned().unwrap_or_default();

    let export_data = serde_json::json!({
        "project": project,
        "diagram_elements": diagram_elements,
        "connections": diagram_connections,
        "exported_at": Utc::now()
    });

    serde_json::to_string_pretty(&export_data).map_err(|e| e.to_string())
}

#[cfg(debug_assertions)]
#[tauri::command]
async fn populate_sample_data(
    projects: State<'_, ProjectStore>,
) -> Result<Vec<Project>, String> {
    let sample_projects = dev_utils::create_sample_projects();
    let mut store = projects.lock().unwrap();
    
    let mut result = Vec::new();
    for project in sample_projects {
        let project_id = project.id.clone();
        store.insert(project_id, project.clone());
        result.push(project);
    }
    
    Ok(result)
}

fn main() {
    // Initialize logging
    env_logger::init();
    log::info!("Starting ArchiComm Desktop Application");

    tauri::Builder::default()
        .manage(ProjectStore::default())
        .manage(DiagramStore::default())
        .manage(ConnectionStore::default())
        .invoke_handler({
            #[cfg(debug_assertions)]
            {
                tauri::generate_handler![
                    // Project management
                    create_project,
                    get_projects,
                    get_project,
                    update_project,
                    delete_project,
                    // Component management
                    add_component,
                    update_component,
                    remove_component,
                    // Diagram management
                    save_diagram,
                    load_diagram,
                    save_connections,
                    load_connections,
                    // Utility commands
                    get_app_version,
                    show_in_folder,
                    export_project_data,
                    // Transcription commands
                    save_audio_file,
                    transcribe_audio,
                    // Debug commands
                    populate_sample_data,
                ]
            }
            #[cfg(not(debug_assertions))]
            {
                tauri::generate_handler![
                    // Project management
                    create_project,
                    get_projects,
                    get_project,
                    update_project,
                    delete_project,
                    // Component management
                    add_component,
                    update_component,
                    remove_component,
                    // Diagram management
                    save_diagram,
                    load_diagram,
                    save_connections,
                    load_connections,
                    // Utility commands
                    get_app_version,
                    show_in_folder,
                    export_project_data,
                    // Transcription commands
                    save_audio_file,
                    transcribe_audio,
                ]
            }
        })
        .setup(|_app| {
            log::info!("ArchiComm application setup completed");
            
            // You can add additional setup logic here
            // For example, initializing the database, loading configuration, etc.
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn project_serialization_contract() {
        let p = Project {
            id: "id1".into(),
            name: "Name".into(),
            description: "Desc".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            status: ProjectStatus::Planning,
            components: vec![],
        };
        let s = serde_json::to_string(&p).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["name"], json!("Name"));
        assert!(v["created_at"].as_str().unwrap().contains('T'));
        assert_eq!(v["status"], json!("Planning"));
    }
}
