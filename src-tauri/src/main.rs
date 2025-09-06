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
use tempfile::NamedTempFile;
use std::io::Write;

// Custom error types for structured error handling
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Project not found: {project_id}")]
    ProjectNotFound { project_id: String },
    
    #[error("Component not found: {component_id} in project {project_id}")]
    ComponentNotFound { component_id: String, project_id: String },
    
    #[error("Invalid project data: {details}")]
    InvalidProjectData { details: String },
    
    #[error("Invalid component data: {details}")]
    InvalidComponentData { details: String },
    
    #[error("File system error: {operation} failed - {source}")]
    FileSystemError { operation: String, source: std::io::Error },
    
    #[error("Audio file not found at path: {path}")]
    AudioFileNotFound { path: String },
    
    #[error("Audio transcription failed: {details}")]
    TranscriptionError { details: String },
    
    #[error("Transcription initialization failed: {details}")]
    TranscriptionInitError { details: String },
    
    #[error("Serialization error: {operation} - {source}")]
    SerializationError { operation: String, source: serde_json::Error },
    
    #[error("State lock error: Failed to acquire lock for {resource}")]
    StateLockError { resource: String },
    
    #[error("External process error: {command} failed - {details}")]
    ProcessError { command: String, details: String },
    
    #[error("Internal error: {details}")]
    Internal { details: String },
}

impl From<std::io::Error> for ApiError {
    fn from(err: std::io::Error) -> Self {
        ApiError::FileSystemError {
            operation: "unknown".to_string(),
            source: err,
        }
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        ApiError::SerializationError {
            operation: "unknown".to_string(),
            source: err,
        }
    }
}

// Convert ApiError to String for Tauri compatibility
impl From<ApiError> for String {
    fn from(err: ApiError) -> Self {
        err.to_string()
    }
}

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
) -> Result<Project, ApiError> {
    // Validate project data
    if name.trim().is_empty() {
        return Err(ApiError::InvalidProjectData {
            details: "Project name cannot be empty".to_string(),
        });
    }

    if name.len() > 255 {
        return Err(ApiError::InvalidProjectData {
            details: format!("Project name too long: {} characters (max 255)", name.len()),
        });
    }

    let project = Project {
        id: Uuid::new_v4().to_string(),
        name: name.trim().to_string(),
        description: description.trim().to_string(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        status: ProjectStatus::Planning,
        components: Vec::new(),
    };

    let mut store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    let project_id = project.id.clone();
    store.insert(project_id, project.clone());

    log::info!("Project created successfully: {} ({})", project.name, project.id);
    Ok(project)
}

#[tauri::command]
async fn get_projects(projects: State<'_, ProjectStore>) -> Result<Vec<Project>, ApiError> {
    let store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    let all_projects: Vec<Project> = store.values().cloned().collect();
    log::debug!("Retrieved {} projects", all_projects.len());
    Ok(all_projects)
}

#[tauri::command]
async fn get_project(
    project_id: String,
    projects: State<'_, ProjectStore>,
) -> Result<Option<Project>, ApiError> {
    let store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    let project = store.get(&project_id).cloned();
    if project.is_some() {
        log::debug!("Retrieved project: {}", project_id);
    } else {
        log::debug!("Project not found: {}", project_id);
    }
    Ok(project)
}

#[tauri::command]
async fn update_project(
    project_id: String,
    name: Option<String>,
    description: Option<String>,
    status: Option<ProjectStatus>,
    projects: State<'_, ProjectStore>,
) -> Result<Option<Project>, ApiError> {
    let mut store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    if let Some(project) = store.get_mut(&project_id) {
        if let Some(new_name) = name {
            if new_name.trim().is_empty() {
                return Err(ApiError::InvalidProjectData {
                    details: "Project name cannot be empty".to_string(),
                });
            }
            if new_name.len() > 255 {
                return Err(ApiError::InvalidProjectData {
                    details: format!("Project name too long: {} characters (max 255)", new_name.len()),
                });
            }
            project.name = new_name.trim().to_string();
        }
        if let Some(new_description) = description {
            project.description = new_description.trim().to_string();
        }
        if let Some(new_status) = status {
            project.status = new_status;
        }
        project.updated_at = Utc::now();
        
        log::info!("Project updated successfully: {} ({})", project.name, project.id);
        Ok(Some(project.clone()))
    } else {
        log::debug!("Project not found for update: {}", project_id);
        Ok(None)
    }
}

#[tauri::command]
async fn delete_project(
    project_id: String,
    projects: State<'_, ProjectStore>,
) -> Result<bool, ApiError> {
    let mut store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    let removed = store.remove(&project_id);
    let success = removed.is_some();
    
    if success {
        log::info!("Project deleted successfully: {}", project_id);
    } else {
        log::debug!("Project not found for deletion: {}", project_id);
    }
    
    Ok(success)
}

// Tauri commands for component management
#[tauri::command]
async fn add_component(
    project_id: String,
    name: String,
    component_type: ComponentType,
    description: String,
    projects: State<'_, ProjectStore>,
) -> Result<Option<Component>, ApiError> {
    // Validate component data
    if name.trim().is_empty() {
        return Err(ApiError::InvalidComponentData {
            details: "Component name cannot be empty".to_string(),
        });
    }
    
    if name.len() > 255 {
        return Err(ApiError::InvalidComponentData {
            details: format!("Component name too long: {} characters (max 255)", name.len()),
        });
    }

    let mut store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    if let Some(project) = store.get_mut(&project_id) {
        let component = Component {
            id: Uuid::new_v4().to_string(),
            name: name.trim().to_string(),
            component_type,
            description: description.trim().to_string(),
            dependencies: Vec::new(),
            status: ComponentStatus::NotStarted,
            metadata: HashMap::new(),
        };
        
        project.components.push(component.clone());
        project.updated_at = Utc::now();
        
        log::info!("Component added successfully: {} to project {}", component.name, project_id);
        Ok(Some(component))
    } else {
        log::debug!("Project not found for component addition: {}", project_id);
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
) -> Result<Option<Component>, ApiError> {
    let mut store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    if let Some(project) = store.get_mut(&project_id) {
        if let Some(component) = project.components.iter_mut().find(|c| c.id == component_id) {
            if let Some(new_name) = name {
                if new_name.trim().is_empty() {
                    return Err(ApiError::InvalidComponentData {
                        details: "Component name cannot be empty".to_string(),
                    });
                }
                if new_name.len() > 255 {
                    return Err(ApiError::InvalidComponentData {
                        details: format!("Component name too long: {} characters (max 255)", new_name.len()),
                    });
                }
                component.name = new_name.trim().to_string();
            }
            if let Some(new_description) = description {
                component.description = new_description.trim().to_string();
            }
            if let Some(new_status) = status {
                component.status = new_status;
            }
            if let Some(new_dependencies) = dependencies {
                component.dependencies = new_dependencies;
            }
            
            project.updated_at = Utc::now();
            log::info!("Component updated successfully: {} in project {}", component.name, project_id);
            Ok(Some(component.clone()))
        } else {
            log::debug!("Component not found for update: {} in project {}", component_id, project_id);
            Err(ApiError::ComponentNotFound { component_id, project_id })
        }
    } else {
        log::debug!("Project not found for component update: {}", project_id);
        Err(ApiError::ProjectNotFound { project_id })
    }
}

#[tauri::command]
async fn remove_component(
    project_id: String,
    component_id: String,
    projects: State<'_, ProjectStore>,
) -> Result<bool, ApiError> {
    let mut store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    if let Some(project) = store.get_mut(&project_id) {
        let initial_len = project.components.len();
        project.components.retain(|c| c.id != component_id);
        project.updated_at = Utc::now();
        
        let success = project.components.len() < initial_len;
        if success {
            log::info!("Component removed successfully: {} from project {}", component_id, project_id);
        } else {
            log::debug!("Component not found for removal: {} in project {}", component_id, project_id);
        }
        
        Ok(success)
    } else {
        log::debug!("Project not found for component removal: {}", project_id);
        Err(ApiError::ProjectNotFound { project_id })
    }
}

// Tauri commands for diagram management
#[tauri::command]
async fn save_diagram(
    project_id: String,
    elements: Vec<DiagramElement>,
    diagrams: State<'_, DiagramStore>,
) -> Result<(), ApiError> {
    let mut store = diagrams.lock().map_err(|_| ApiError::StateLockError {
        resource: "DiagramStore".to_string(),
    })?;
    
    store.insert(project_id.clone(), elements);
    log::debug!("Diagram saved successfully for project: {}", project_id);
    Ok(())
}

#[tauri::command]
async fn load_diagram(
    project_id: String,
    diagrams: State<'_, DiagramStore>,
) -> Result<Vec<DiagramElement>, ApiError> {
    let store = diagrams.lock().map_err(|_| ApiError::StateLockError {
        resource: "DiagramStore".to_string(),
    })?;
    
    let elements = store.get(&project_id).cloned().unwrap_or_default();
    log::debug!("Diagram loaded for project: {} ({} elements)", project_id, elements.len());
    Ok(elements)
}

#[tauri::command]
async fn save_connections(
    project_id: String,
    connections: Vec<Connection>,
    connection_store: State<'_, ConnectionStore>,
) -> Result<(), ApiError> {
    let mut store = connection_store.lock().map_err(|_| ApiError::StateLockError {
        resource: "ConnectionStore".to_string(),
    })?;
    
    store.insert(project_id.clone(), connections);
    log::debug!("Connections saved successfully for project: {}", project_id);
    Ok(())
}

#[tauri::command]
async fn load_connections(
    project_id: String,
    connection_store: State<'_, ConnectionStore>,
) -> Result<Vec<Connection>, ApiError> {
    let store = connection_store.lock().map_err(|_| ApiError::StateLockError {
        resource: "ConnectionStore".to_string(),
    })?;
    
    let connections = store.get(&project_id).cloned().unwrap_or_default();
    log::debug!("Connections loaded for project: {} ({} connections)", project_id, connections.len());
    Ok(connections)
}

// Helper function to validate and sanitize file names
fn validate_filename(file_name: &str) -> Result<(), ApiError> {
    // Check for empty filename
    if file_name.is_empty() {
        return Err(ApiError::InvalidProjectData { 
            details: "File name cannot be empty".to_string() 
        });
    }

    // Check for path traversal attempts
    if file_name.contains("..") || file_name.contains('/') || file_name.contains('\\') {
        return Err(ApiError::InvalidProjectData { 
            details: format!("Invalid filename '{}': contains path traversal characters", file_name) 
        });
    }

    // Check for reserved names on Windows
    let reserved_names = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", 
                         "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", 
                         "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];
    
    let name_without_ext = file_name.split('.').next().unwrap_or("").to_uppercase();
    if reserved_names.contains(&name_without_ext.as_str()) {
        return Err(ApiError::InvalidProjectData { 
            details: format!("Invalid filename '{}': uses reserved system name", file_name) 
        });
    }

    // Check for invalid characters
    let invalid_chars = ['<', '>', ':', '"', '|', '?', '*'];
    if file_name.chars().any(|c| invalid_chars.contains(&c) || c.is_control()) {
        return Err(ApiError::InvalidProjectData { 
            details: format!("Invalid filename '{}': contains invalid characters", file_name) 
        });
    }

    // Check reasonable length limits
    if file_name.len() > 255 {
        return Err(ApiError::InvalidProjectData { 
            details: format!("Filename too long: {} characters (max 255)", file_name.len()) 
        });
    }

    Ok(())
}

// Tauri command for saving audio files
#[tauri::command]
async fn save_audio_file(file_name: String, data: Vec<u8>) -> Result<String, ApiError> {
    // Validate and sanitize the filename
    validate_filename(&file_name)?;

    // Get the system temporary directory
    let temp_dir = env::temp_dir();
    
    // Create a subdirectory for archicomm audio files
    let audio_dir = temp_dir.join("archicomm_audio");
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&audio_dir)
        .map_err(|e| ApiError::FileSystemError {
            operation: "create audio directory".to_string(),
            source: e,
        })?;
    
    // Construct the final file path using only the sanitized filename
    let final_file_path = audio_dir.join(&file_name);
    
    // Create a temporary file in the same directory as the target
    let mut temp_file = NamedTempFile::new_in(&audio_dir)
        .map_err(|e| ApiError::FileSystemError {
            operation: "create temporary file".to_string(),
            source: e,
        })?;
    
    // Write the audio data to the temporary file
    temp_file.write_all(&data)
        .map_err(|e| ApiError::FileSystemError {
            operation: "write audio data".to_string(),
            source: e,
        })?;
    
    // Ensure all data is written to disk
    temp_file.flush()
        .map_err(|e| ApiError::FileSystemError {
            operation: "flush temporary file".to_string(),
            source: e,
        })?;
    
    // Atomically move the temporary file to the final location
    temp_file.persist(&final_file_path)
        .map_err(|e| ApiError::FileSystemError {
            operation: format!("persist file '{}'", file_name),
            source: e.error,
        })?;
    
    // Canonicalize the path to get the absolute, resolved path
    let canonical_path = fs::canonicalize(&final_file_path)
        .map_err(|e| ApiError::FileSystemError {
            operation: format!("canonicalize path for '{}'", file_name),
            source: e,
        })?;
    
    // Convert to string, ensuring it's valid UTF-8
    let path_str = canonical_path.to_str()
        .ok_or_else(|| ApiError::Internal {
            details: format!("Path contains invalid UTF-8 sequences: '{}'", 
                           canonical_path.to_string_lossy())
        })?;
    
    log::info!("Audio file saved successfully: {}", path_str);
    Ok(path_str.to_string())
}

// Tauri command for audio transcription
#[tauri::command]
async fn transcribe_audio(file_path: String) -> Result<TranscriptionResponse, ApiError> {
    let audio_path = PathBuf::from(&file_path);
    
    if !audio_path.exists() {
        log::error!("Audio file not found at path: {}", file_path);
        return Err(ApiError::AudioFileNotFound { path: file_path });
    }

    let config = transcription::TranscriptionConfig {
        model: transcription::Model::Base,
        // language field is removed as per plan
    };

    let mut transcriber = transcription::AudioTranscriber::new(config);
    if let Err(e) = transcriber.initialize() {
        log::error!("Failed to initialize transcriber: {}", e);
        return Err(ApiError::TranscriptionInitError {
            details: format!("Transcriber initialization failed: {}", e),
        });
    }

    match transcriber.transcribe_audio(&file_path) {
        Ok(result) => {
            log::info!("Transcription successful for file: {}", file_path);
            // simple_transcribe_rs does not provide segments, so we return an empty vec
            let response = TranscriptionResponse {
                text: result.text,
                segments: vec![],
            };
            Ok(response)
        }
        Err(e) => {
            log::error!("Transcription failed for file: {}: {}", file_path, e);
            Err(ApiError::TranscriptionError {
                details: format!("Transcription processing failed for '{}': {}", 
                               audio_path.file_name().unwrap_or_default().to_string_lossy(), 
                               e),
            })
        }
    }
}


// Utility commands
#[tauri::command]
async fn get_app_version() -> Result<String, ApiError> {
    Ok("0.2.0".to_string())
}

#[tauri::command]
async fn show_in_folder(path: String) -> Result<(), ApiError> {
    // Validate the path exists
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(ApiError::AudioFileNotFound { path });
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| ApiError::ProcessError {
                command: "explorer".to_string(),
                details: format!("Failed to open file explorer: {}", e),
            })?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| ApiError::ProcessError {
                command: "open".to_string(),
                details: format!("Failed to open Finder: {}", e),
            })?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path_buf.parent().unwrap_or_else(|| std::path::Path::new("/")))
            .spawn()
            .map_err(|e| ApiError::ProcessError {
                command: "xdg-open".to_string(),
                details: format!("Failed to open file manager: {}", e),
            })?;
    }

    log::info!("Successfully opened folder for path: {}", path);
    Ok(())
}

#[tauri::command]
async fn export_project_data(
    project_id: String,
    projects: State<'_, ProjectStore>,
    diagrams: State<'_, DiagramStore>,
    connections: State<'_, ConnectionStore>,
) -> Result<String, ApiError> {
    let project_store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    let diagram_store = diagrams.lock().map_err(|_| ApiError::StateLockError {
        resource: "DiagramStore".to_string(),
    })?;
    let connection_store = connections.lock().map_err(|_| ApiError::StateLockError {
        resource: "ConnectionStore".to_string(),
    })?;

    let project = project_store.get(&project_id)
        .ok_or_else(|| ApiError::ProjectNotFound { project_id: project_id.clone() })?;
    let diagram_elements = diagram_store.get(&project_id).cloned().unwrap_or_default();
    let diagram_connections = connection_store.get(&project_id).cloned().unwrap_or_default();

    let export_data = serde_json::json!({
        "project": project,
        "diagram_elements": diagram_elements,
        "connections": diagram_connections,
        "exported_at": Utc::now()
    });

    let json_string = serde_json::to_string_pretty(&export_data)
        .map_err(|e| ApiError::SerializationError {
            operation: "export project data".to_string(),
            source: e,
        })?;

    log::info!("Project data exported successfully: {}", project_id);
    Ok(json_string)
}

#[cfg(debug_assertions)]
#[tauri::command]
async fn populate_sample_data(
    projects: State<'_, ProjectStore>,
) -> Result<Vec<Project>, ApiError> {
    let sample_projects = dev_utils::create_sample_projects();
    let mut store = projects.lock().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
    })?;
    
    let mut result = Vec::new();
    for project in sample_projects {
        let project_id = project.id.clone();
        store.insert(project_id, project.clone());
        result.push(project);
    }
    
    log::info!("Sample data populated successfully: {} projects", result.len());
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

    #[test]
    fn test_validate_filename_security() {
        // Test path traversal attempts
        assert!(validate_filename("../evil").is_err());
        assert!(validate_filename("..\\evil").is_err());
        assert!(validate_filename("evil/../file").is_err());
        assert!(validate_filename("/etc/passwd").is_err());
        assert!(validate_filename("C:\\Windows\\System32\\config").is_err());
        
        // Test reserved Windows names
        assert!(validate_filename("CON").is_err());
        assert!(validate_filename("con.txt").is_err());
        assert!(validate_filename("PRN").is_err());
        assert!(validate_filename("AUX").is_err());
        assert!(validate_filename("NUL").is_err());
        assert!(validate_filename("COM1").is_err());
        assert!(validate_filename("LPT1").is_err());
        
        // Test invalid characters
        assert!(validate_filename("file<name").is_err());
        assert!(validate_filename("file>name").is_err());
        assert!(validate_filename("file:name").is_err());
        assert!(validate_filename("file\"name").is_err());
        assert!(validate_filename("file|name").is_err());
        assert!(validate_filename("file?name").is_err());
        assert!(validate_filename("file*name").is_err());
        
        // Test control characters
        assert!(validate_filename("file\x00name").is_err());
        assert!(validate_filename("file\x1fname").is_err());
        
        // Test empty filename
        assert!(validate_filename("").is_err());
        assert!(validate_filename("   ").is_err());
        
        // Test filename too long
        let long_name = "a".repeat(256);
        assert!(validate_filename(&long_name).is_err());
        
        // Test valid filenames
        assert!(validate_filename("valid_file.txt").is_ok());
        assert!(validate_filename("audio_recording_123.wav").is_ok());
        assert!(validate_filename("file-with-dashes.mp3").is_ok());
        assert!(validate_filename("file with spaces.webm").is_ok());
    }

    #[tokio::test]
    async fn test_save_audio_file_security() {
        use tempfile::tempdir;
        
        // Test with valid filename
        let valid_data = b"fake audio data";
        let result = save_audio_file("test_audio.wav".to_string(), valid_data.to_vec()).await;
        assert!(result.is_ok());
        
        // Clean up - the file should exist and be valid
        let file_path = result.unwrap();
        assert!(std::path::Path::new(&file_path).exists());
        let content = std::fs::read(&file_path).unwrap();
        assert_eq!(content, valid_data);
        
        // Clean up
        std::fs::remove_file(&file_path).ok();
        
        // Test with malicious filename - should fail
        let malicious_names = vec![
            "../etc/passwd",
            "..\\Windows\\System32\\config",
            "CON",
            "file<>name",
            "",
            "a".repeat(300), // too long
        ];
        
        for malicious_name in malicious_names {
            let result = save_audio_file(malicious_name.to_string(), valid_data.to_vec()).await;
            assert!(result.is_err(), "Expected error for malicious filename: {}", malicious_name);
        }
    }

    #[tokio::test] 
    async fn test_save_audio_file_canonicalization() {
        use std::path::PathBuf;
        
        // Test that canonicalization works correctly
        let test_data = b"test audio content";
        let result = save_audio_file("test_canonical.wav".to_string(), test_data.to_vec()).await;
        
        assert!(result.is_ok());
        let canonical_path = result.unwrap();
        
        // Verify path is absolute
        let path_buf = PathBuf::from(&canonical_path);
        assert!(path_buf.is_absolute());
        
        // Verify file exists and has correct content
        assert!(path_buf.exists());
        let content = std::fs::read(&path_buf).unwrap();
        assert_eq!(content, test_data);
        
        // Verify path is properly UTF-8 encoded
        assert!(canonical_path.is_ascii() || canonical_path.chars().all(|c| !c.is_control()));
        
        // Clean up
        std::fs::remove_file(&path_buf).ok();
    }

    #[tokio::test]
    async fn test_file_cleanup_and_no_artifacts() {
        use std::fs;
        use std::path::PathBuf;
        
        let test_data = b"cleanup test data";
        let filename = "cleanup_test.wav";
        
        // Save file
        let result = save_audio_file(filename.to_string(), test_data.to_vec()).await;
        assert!(result.is_ok());
        
        let file_path = result.unwrap();
        let path_buf = PathBuf::from(&file_path);
        
        // Verify file exists
        assert!(path_buf.exists());
        
        // Get directory and check for temporary artifacts
        let dir = path_buf.parent().unwrap();
        let entries_before_cleanup: Vec<_> = fs::read_dir(dir)
            .unwrap()
            .map(|e| e.unwrap().file_name())
            .collect();
        
        // Remove the file
        fs::remove_file(&path_buf).unwrap();
        
        // Verify no temp files left behind
        let entries_after_cleanup: Vec<_> = fs::read_dir(dir)
            .unwrap()
            .map(|e| e.unwrap().file_name())
            .collect();
        
        // Should be one fewer file (the one we removed)
        assert_eq!(entries_after_cleanup.len(), entries_before_cleanup.len() - 1);
        
        // No temporary files should remain (no files starting with .tmp)
        let temp_files: Vec<_> = entries_after_cleanup
            .iter()
            .filter(|name| name.to_string_lossy().starts_with(".tmp"))
            .collect();
        assert!(temp_files.is_empty(), "Found temporary files: {:?}", temp_files);
    }

    #[test]
    fn test_api_error_display() {
        let error = ApiError::ProjectNotFound { 
            project_id: "test_id".to_string() 
        };
        assert_eq!(error.to_string(), "Project not found: test_id");
        
        let error = ApiError::ComponentNotFound { 
            component_id: "comp_id".to_string(),
            project_id: "proj_id".to_string()
        };
        assert_eq!(error.to_string(), "Component not found: comp_id in project proj_id");
        
        let error = ApiError::InvalidProjectData { 
            details: "Name too long".to_string() 
        };
        assert_eq!(error.to_string(), "Invalid project data: Name too long");
    }

    #[test]
    fn test_api_error_from_conversions() {
        use std::io::ErrorKind;
        
        // Test From<std::io::Error>
        let io_error = std::io::Error::new(ErrorKind::PermissionDenied, "access denied");
        let api_error: ApiError = io_error.into();
        match api_error {
            ApiError::FileSystemError { operation, source } => {
                assert_eq!(operation, "unknown");
                assert_eq!(source.kind(), ErrorKind::PermissionDenied);
            }
            _ => panic!("Expected FileSystemError variant"),
        }
        
        // Test From<serde_json::Error>
        let json_error = serde_json::from_str::<serde_json::Value>("invalid json").unwrap_err();
        let api_error: ApiError = json_error.into();
        match api_error {
            ApiError::SerializationError { operation, source: _ } => {
                assert_eq!(operation, "unknown");
            }
            _ => panic!("Expected SerializationError variant"),
        }
        
        // Test From<ApiError> for String
        let api_error = ApiError::Internal { 
            details: "test error".to_string() 
        };
        let error_string: String = api_error.into();
        assert_eq!(error_string, "Internal error: test error");
    }
}
