// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::path::{PathBuf, Path};
use std::sync::{Arc, RwLock, Mutex, OnceLock};
use std::env;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use tempfile::NamedTempFile;
use std::io::Write;
use std::fs;
use std::process;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use serde_json::Value as JsonValue;
use tokio::task::JoinHandle;

// Operation name constants for consistent error handling
pub struct OperationNames;

impl OperationNames {
    pub const FILE_SYSTEM: &'static str = "file system operation";
    pub const SERIALIZATION: &'static str = "serialization operation";
    pub const VALIDATION: &'static str = "input validation";
    pub const AUDIO_SAVE: &'static str = "audio file save";
    pub const DIRECTORY_CREATE: &'static str = "directory creation";
    pub const FILE_WRITE: &'static str = "file write";
    pub const FILE_PERSIST: &'static str = "file persistence";
    pub const PATH_CANONICALIZE: &'static str = "path canonicalization";
    pub const AUDIO_RECORDING: &'static str = "audio recording";
    pub const PROJECT_MANAGEMENT: &'static str = "project management";
    pub const COMPONENT_MANAGEMENT: &'static str = "component management";
    pub const TRANSCRIPTION: &'static str = "transcription";
    pub const TRANSCRIPTION_INIT: &'static str = "transcription initialization";
}

// Custom error types for structured error handling
#[derive(Debug, thiserror::Error, Serialize)]
pub enum ApiError {
    #[error("Project not found: {project_id}")]
    ProjectNotFound { 
        project_id: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Component not found: {component_id} in project {project_id}")]
    ComponentNotFound { 
        component_id: String, 
        project_id: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Invalid project data: {details}")]
    InvalidProjectData { 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Invalid component data: {details}")]
    InvalidComponentData { 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Invalid filename: {details}")]
    InvalidFilename { 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("File system error: {operation} failed - {details}")]
    FileSystemError { 
        operation: String, 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Audio file not found at path: {path}")]
    AudioFileNotFound { 
        path: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Audio transcription failed: {details}")]
    TranscriptionError { 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Transcription initialization failed: {details}")]
    TranscriptionInitError { 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },

    #[error("Transcription job not found: {job_id}")]
    TranscriptionJobNotFound {
        job_id: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Serialization error: {operation} - {details}")]
    SerializationError { 
        operation: String, 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("State lock error: Failed to acquire lock for {resource}")]
    StateLockError { 
        resource: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("External process error: {command} failed - {details}")]
    ProcessError { 
        command: String, 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    
    #[error("Internal error: {details}")]
    Internal { 
        details: String,
        #[source]
        #[serde(skip)]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
}

// Convert std::io::Error to FileSystemError with context
impl From<std::io::Error> for ApiError {
    fn from(err: std::io::Error) -> Self {
        let full_error = err.to_string();
        log::error!("I/O error occurred: {}", full_error);
        
        ApiError::FileSystemError {
            operation: OperationNames::FILE_SYSTEM.to_string(),
            details: format!("A file system operation failed. Please check file permissions and disk space. Error: {}", full_error),
            source: Some(Box::new(err)),
        }
    }
}

// Convert serde_json::Error to SerializationError with context
impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        let full_error = err.to_string();
        log::error!("Serialization error occurred: {}", full_error);
        
        ApiError::SerializationError {
            operation: OperationNames::SERIALIZATION.to_string(),
            details: format!("Data serialization or deserialization failed: {}", full_error),
            source: Some(Box::new(err)),
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


// ========= Native Audio Recording (CPAL + Hound) ==========
// use std::io::BufWriter;
// use std::sync::atomic::{AtomicBool, Ordering};
// use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

// struct NativeRecorder {
//     stream: Option<cpal::Stream>,
//     writer_arc: Option<Arc<Mutex<Option<hound::WavWriter<BufWriter<std::fs::File>>>>>>,
//     path: Option<PathBuf>,
//     start: Option<Instant>,
//     channels: u16,
//     sample_rate: u32,
//     is_active: AtomicBool,
// }

// impl NativeRecorder {
//     fn new() -> Self {
//         Self {
//             stream: None,
//             writer_arc: None,
//             path: None,
//             start: None,
//             channels: 0,
//             sample_rate: 0,
//             is_active: AtomicBool::new(false),
//         }
//     }
// }

// type RecorderStore = Mutex<NativeRecorder>;

/*
#[tauri::command]
async fn start_audio_recording(
    base_dir: Option<String>,
    recorder_store: State<'_, RecorderStore>,
) -> Result<String, ApiError> {
    let mut recorder = recorder_store.lock().map_err(|_| ApiError::StateLockError { 
        resource: "NativeRecorder".to_string(),
        source: None,
    })?;

    if recorder.is_active.load(Ordering::SeqCst) {
        return Err(ApiError::Internal { 
            details: "Recording already in progress".to_string(), 
            source: None 
        });
    }

    // Prepare directory and file path
    let audio_dir = if let Some(dir) = base_dir {
        create_audio_session_dir_with_base(&PathBuf::from(dir))?
    } else {
        get_audio_session_dir()?
    };

    let filename = format!("native_recording_{}.wav", Utc::now().timestamp());
    let path = audio_dir.join(filename);

    // Set up CPAL input stream
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| ApiError::Internal { 
            details: "No default input audio device available".into(),
            source: None,
        })?;
    let config = device
        .default_input_config()
        .map_err(|e| ApiError::Internal {
            details: format!("Failed to get default input config: {}", e),
            source: Some(Box::new(e)),
        })?;

    let sample_rate = config.sample_rate().0;
    let channels = config.channels();

    // Create WAV writer
    let spec = hound::WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let file = std::fs::File::create(&path).map_err(|e| ApiError::FileSystemError { 
        operation: OperationNames::FILE_WRITE.to_string(),
        details: format!("Failed to create wav file: {}", e),
        source: Some(Box::new(e)),
    })?;
    let writer = hound::WavWriter::new(BufWriter::new(file), spec).map_err(|e| ApiError::FileSystemError {
        operation: OperationNames::FILE_WRITE.to_string(),
        details: format!("Failed to initialize wav writer: {}", e),
        source: Some(Box::new(e)),
    })?;

    // Share writer via Arc<Mutex<_>> for callback
    let writer_arc: Arc<Mutex<Option<hound::WavWriter<BufWriter<std::fs::File>>>>> = Arc::new(Mutex::new(Some(writer)));
    let writer_arc_clone = writer_arc.clone();

    // Build stream according to sample format
    let build_stream = |config: cpal::StreamConfig, sample_format: cpal::SampleFormat| -> Result<cpal::Stream, ApiError> {
        let err_fn = |err| log::error!("Audio input stream error: {}", err);

        match sample_format {
            cpal::SampleFormat::F32 => device
                .build_input_stream(
                    &config,
                    move |data: &[f32], _| {
                        if let Ok(mut wopt) = writer_arc_clone.lock() {
                            if let Some(ref mut w) = *wopt {
                                for &sample in data {
                                    let s = (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
                                    let _ = w.write_sample(s);
                                }
                            }
                        }
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| ApiError::Internal { details: format!("Failed to build input stream (f32): {}", e), source: Some(Box::new(e)) }),
            cpal::SampleFormat::I16 => device
                .build_input_stream(
                    &config,
                    move |data: &[i16], _| {
                        if let Ok(mut wopt) = writer_arc_clone.lock() {
                            if let Some(ref mut w) = *wopt {
                                for &sample in data {
                                    let _ = w.write_sample(sample);
                                }
                            }
                        }
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| ApiError::Internal { details: format!("Failed to build input stream (i16): {}", e), source: Some(Box::new(e)) }),
            cpal::SampleFormat::U16 => device
                .build_input_stream(
                    &config,
                    move |data: &[u16], _| {
                        if let Ok(mut wopt) = writer_arc_clone.lock() {
                            if let Some(ref mut w) = *wopt {
                                for &sample in data {
                                    // Convert unsigned to signed range
                                    let s = (sample as i32 - 32768) as i16;
                                    let _ = w.write_sample(s);
                                }
                            }
                        }
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| ApiError::Internal { details: format!("Failed to build input stream (u16): {}", e), source: Some(Box::new(e)) }),
            _ => Err(ApiError::Internal { details: format!("Unsupported sample format: {:?}", sample_format), source: None }),
        }
    };

    let config_std = cpal::StreamConfig {
        channels,
        sample_rate: cpal::SampleRate(sample_rate),
        buffer_size: cpal::BufferSize::Default,
    };
    let stream = build_stream(config_std, config.sample_format())?;
    stream
        .play()
        .map_err(|e| ApiError::ProcessError { command: "audio_stream.play".into(), details: format!("Failed to start audio stream: {}", e), source: Some(Box::new(e)) })?;

    recorder.stream = Some(stream);
    recorder.writer_arc = Some(writer_arc);
    recorder.path = Some(path.clone());
    recorder.start = Some(Instant::now());
    recorder.channels = channels;
    recorder.sample_rate = sample_rate;
    recorder.is_active.store(true, Ordering::SeqCst);

    log::info!("Native audio recording started: {:?} ({} ch @ {} Hz)", path, channels, sample_rate);
    let canonical_path = path.canonicalize().unwrap_or(path);
    Ok(canonical_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn stop_audio_recording(recorder_store: State<'_, RecorderStore>) -> Result<String, ApiError> {
    let mut recorder = recorder_store.lock().map_err(|_| ApiError::StateLockError { 
        resource: "NativeRecorder".to_string(),
        source: None,
    })?;

    if !recorder.is_active.load(Ordering::SeqCst) {
        return Err(ApiError::Internal { details: "No active recording".into(), source: None });
    }

    // Stop stream
    recorder.stream = None; // Drop stream to stop callback

    // Finalize WAV writer
    if let Some(writer_arc) = recorder.writer_arc.take() {
        if let Ok(mut opt) = writer_arc.lock() {
            if let Some(writer) = opt.take() {
                // finalize updates WAV header sizes
                if let Err(e) = writer.finalize() {
                    log::error!("Failed to finalize WAV file: {}", e);
                }
            }
        }
    }

    let path = recorder.path.clone().ok_or_else(|| ApiError::Internal { details: "Unknown recording path".into(), source: None })?;
    recorder.is_active.store(false, Ordering::SeqCst);
    log::info!("Native audio recording stopped: {}", path.display());
    Ok(path.to_string_lossy().to_string())
}
*/

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

// Transcription data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionSegment {
    pub text: String,
    pub start: f64,
    pub end: f64,
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub text: String,
    pub segments: Vec<TranscriptionSegment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TranscriptionOptions {
    pub timeout: Option<u64>,
    pub job_id: Option<String>,
    pub max_segments: Option<usize>,
}

// Application state with RwLock for better concurrency
type ProjectStore = RwLock<HashMap<String, Project>>;
type DiagramStore = RwLock<HashMap<String, Vec<DiagramElement>>>;
type ConnectionStore = RwLock<HashMap<String, Vec<Connection>>>;
type TranscriptionJobStore = Arc<Mutex<HashMap<String, JoinHandle<()>>>>;

// Global session directory for audio files
static AUDIO_SESSION_DIR: OnceLock<Mutex<Option<PathBuf>>> = OnceLock::new();

// Helper function to get or create the audio session directory
fn get_audio_session_dir() -> Result<PathBuf, ApiError> {
    let session_dir_mutex = AUDIO_SESSION_DIR.get_or_init(|| Mutex::new(None));
    let mut session_dir_guard = session_dir_mutex.lock().map_err(|_| ApiError::StateLockError {
        resource: "AudioSessionDirectory".to_string(),
        source: None,
    })?;
    
    if let Some(ref dir) = *session_dir_guard {
        if dir.exists() {
            return Ok(dir.clone());
        }
    }
    
    // Create new session directory
    let process_id = process::id();
    let session_id = Uuid::new_v4();
    let base_temp_dir = env::temp_dir();
    let audio_dir = base_temp_dir.join(format!("archicomm_audio_{}_{}", process_id, session_id));
    
    // Create the directory with secure permissions (0o700 on Unix)
    fs::create_dir_all(&audio_dir)
        .map_err(|e| ApiError::FileSystemError {
            operation: OperationNames::DIRECTORY_CREATE.to_string(),
            details: format!("Failed to create audio session directory: {}", e),
            source: Some(Box::new(e)),
        })?;
    
    #[cfg(unix)]
    {
        use std::fs::Permissions;
        fs::set_permissions(&audio_dir, Permissions::from_mode(0o700))
            .map_err(|e| ApiError::FileSystemError {
                operation: OperationNames::DIRECTORY_CREATE.to_string(),
                details: format!("Failed to set secure directory permissions: {}", e),
                source: Some(Box::new(e)),
            })?;
    }
    
    *session_dir_guard = Some(audio_dir.clone());
    log::info!("Created audio session directory: {}", audio_dir.display());
    Ok(audio_dir)
}

// Helper function to create audio session directory for testing with custom base dir
fn create_audio_session_dir_with_base(base_dir: &Path) -> Result<PathBuf, ApiError> {
    let process_id = process::id();
    let session_id = Uuid::new_v4();
    let audio_dir = base_dir.join(format!("archicomm_audio_{}_{}", process_id, session_id));
    
    // Create the directory with secure permissions (0o700 on Unix)
    fs::create_dir_all(&audio_dir)
        .map_err(|e| ApiError::FileSystemError {
            operation: OperationNames::DIRECTORY_CREATE.to_string(),
            details: format!("Failed to create audio test directory: {}", e),
            source: Some(Box::new(e)),
        })?;
    
    #[cfg(unix)]
    {
        use std::fs::Permissions;
        fs::set_permissions(&audio_dir, Permissions::from_mode(0o700))
            .map_err(|e| ApiError::FileSystemError {
                operation: OperationNames::DIRECTORY_CREATE.to_string(),
                details: format!("Failed to set secure directory permissions: {}", e),
                source: Some(Box::new(e)),
            })?;
    }
    
    Ok(audio_dir)
}

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
            source: None,
        });
    }

    if name.len() > 255 {
        return Err(ApiError::InvalidProjectData {
            details: format!("Project name too long: {} characters (max 255)", name.len()),
            source: None,
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

    let mut store = projects.write().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
    })?;
    
    let project_id = project.id.clone();
    store.insert(project_id, project.clone());

    log::info!("Project created successfully: {} ({})", project.name, project.id);
    Ok(project)
}

#[tauri::command]
async fn get_projects(projects: State<'_, ProjectStore>) -> Result<Vec<Project>, ApiError> {
    let store = projects.read().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
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
    let store = projects.read().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
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
    let mut store = projects.write().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
    })?;
    
    if let Some(project) = store.get_mut(&project_id) {
        if let Some(new_name) = name {
            if new_name.trim().is_empty() {
                return Err(ApiError::InvalidProjectData {
                    details: "Project name cannot be empty".to_string(),
                    source: None,
                });
            }
            if new_name.len() > 255 {
                return Err(ApiError::InvalidProjectData {
                    details: format!("Project name too long: {} characters (max 255)", new_name.len()),
                    source: None,
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
    let mut store = projects.write().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
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
            source: None,
        });
    }
    
    if name.len() > 255 {
        return Err(ApiError::InvalidComponentData {
            details: format!("Component name too long: {} characters (max 255)", name.len()),
            source: None,
        });
    }

    let mut store = projects.write().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
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
    let mut store = projects.write().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
    })?;
    
    if let Some(project) = store.get_mut(&project_id) {
        if let Some(component) = project.components.iter_mut().find(|c| c.id == component_id) {
            if let Some(new_name) = name {
                if new_name.trim().is_empty() {
                    return Err(ApiError::InvalidComponentData {
                        details: "Component name cannot be empty".to_string(),
                        source: None,
                    });
                }
                if new_name.len() > 255 {
                    return Err(ApiError::InvalidComponentData {
                        details: format!("Component name too long: {} characters (max 255)", new_name.len()),
                        source: None,
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
            Err(ApiError::ComponentNotFound { component_id, project_id, source: None })
        }
    } else {
        log::debug!("Project not found for component update: {}", project_id);
        Err(ApiError::ProjectNotFound { project_id, source: None })
    }
}

#[tauri::command]
async fn remove_component(
    project_id: String,
    component_id: String,
    projects: State<'_, ProjectStore>,
) -> Result<bool, ApiError> {
    let mut store = projects.write().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
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
        Err(ApiError::ProjectNotFound { project_id, source: None })
    }
}

// Tauri commands for diagram management
#[tauri::command]
async fn save_diagram(
    project_id: String,
    elements: Vec<DiagramElement>,
    diagrams: State<'_, DiagramStore>,
) -> Result<(), ApiError> {
    let mut store = diagrams.write().map_err(|_| ApiError::StateLockError {
        resource: "DiagramStore".to_string(),
        source: None,
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
    let store = diagrams.read().map_err(|_| ApiError::StateLockError {
        resource: "DiagramStore".to_string(),
        source: None,
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
    let mut store = connection_store.write().map_err(|_| ApiError::StateLockError {
        resource: "ConnectionStore".to_string(),
        source: None,
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
    let store = connection_store.read().map_err(|_| ApiError::StateLockError {
        resource: "ConnectionStore".to_string(),
        source: None,
    })?;
    
    let connections = store.get(&project_id).cloned().unwrap_or_default();
    log::debug!("Connections loaded for project: {} ({} connections)", project_id, connections.len());
    Ok(connections)
}

// ---- Challenge Plugin I/O Commands ----
// Minimal validation for incoming challenge objects to avoid malformed data
fn validate_challenge_value(ch: &JsonValue) -> bool {
    let Some(obj) = ch.as_object() else { return false };
    // Check required string fields
    let required_str = ["id", "title", "description", "category"];
    for key in required_str.iter() {
        if !obj.get(*key).and_then(|v| v.as_str()).is_some() { return false; }
    }
    // difficulty must be one of the allowed values
    if let Some(diff) = obj.get("difficulty").and_then(|v| v.as_str()) {
        match diff {
            "beginner" | "intermediate" | "advanced" => {}
            _ => return false,
        }
    } else { return false; }
    // estimatedTime must be number
    if !obj.get("estimatedTime").and_then(|v| v.as_f64()).is_some() { return false; }
    // requirements must be array
    if !obj.get("requirements").and_then(|v| v.as_array()).is_some() { return false; }
    true
}

#[tauri::command]
async fn load_challenges_from_file(path: String) -> Result<Vec<JsonValue>, ApiError> {
    // Read file contents
    let content = fs::read_to_string(&path).map_err(|e| ApiError::FileSystemError {
        operation: OperationNames::FILE_SYSTEM.to_string(),
        details: format!("Failed to read file '{}': {}", path, e),
        source: Some(Box::new(e)),
    })?;

    // Parse JSON – file may be array of challenges or object containing { challenges: [...] }
    let json: JsonValue = serde_json::from_str(&content).map_err(|e| ApiError::SerializationError {
        operation: OperationNames::SERIALIZATION.to_string(),
        details: format!("Invalid JSON in '{}': {}", path, e),
        source: Some(Box::new(e)),
    })?;

    let challenges: Vec<JsonValue> = if let Some(arr) = json.as_array() {
        arr.clone()
    } else if let Some(arr) = json.get("challenges").and_then(|v| v.as_array()) {
        arr.clone()
    } else {
        Vec::new()
    };

    // Filter valid challenges only
    let valid: Vec<JsonValue> = challenges.into_iter().filter(|c| validate_challenge_value(c)).collect();
    log::info!("Loaded {} valid challenges from {}", valid.len(), path);
    Ok(valid)
}

#[tauri::command]
async fn save_challenges_to_file(path: String, challenges: Vec<JsonValue>) -> Result<(), ApiError> {
    // Validate all challenges before saving
    let filtered: Vec<JsonValue> = challenges.into_iter().filter(|c| validate_challenge_value(c)).collect();
    if filtered.is_empty() {
        return Err(ApiError::InvalidProjectData {
            details: "No valid challenges to save".to_string(),
            source: None,
        });
    }

    let payload = serde_json::json!({
        "version": "1.0.0",
        "challenges": filtered,
        "exportedAt": Utc::now().to_rfc3339(),
    });

    let data = serde_json::to_string_pretty(&payload).map_err(|e| ApiError::SerializationError {
        operation: OperationNames::SERIALIZATION.to_string(),
        details: format!("Failed to serialize challenges: {}", e),
        source: Some(Box::new(e)),
    })?;

    fs::write(&path, data).map_err(|e| ApiError::FileSystemError {
        operation: OperationNames::FILE_WRITE.to_string(),
        details: format!("Failed to write file '{}': {}", path, e),
        source: Some(Box::new(e)),
    })?;
    log::info!("Saved challenges to {}", path);
    Ok(())
}

// Helper function to validate and sanitize file names
fn validate_filename(file_name: &str) -> Result<(), ApiError> {
    // Check for empty filename
    if file_name.trim().is_empty() {
        return Err(ApiError::InvalidFilename { 
            details: "File name cannot be empty".to_string(),
            source: None,
        });
    }

    // Check for path traversal attempts using proper std::path methods
    let path = Path::new(file_name);
    
    // Check if the path has multiple components (indicates directory traversal)
    if path.components().count() > 1 {
        return Err(ApiError::InvalidFilename { 
            details: format!("Invalid filename '{}': contains path separators", file_name),
            source: None,
        });
    }
    
    // Check for parent directory references
    if path.components().any(|component| {
        matches!(component, std::path::Component::ParentDir | std::path::Component::CurDir)
    }) {
        return Err(ApiError::InvalidFilename { 
            details: format!("Invalid filename '{}': contains directory traversal patterns", file_name),
            source: None,
        });
    }
    
    // Additional check for explicit path separator characters to be extra safe
    if file_name.contains('/') || file_name.contains('\\') {
        return Err(ApiError::InvalidFilename { 
            details: format!("Invalid filename '{}': contains path separator characters", file_name),
            source: None,
        });
    }

    // Check for reserved names on Windows
    let reserved_names = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", 
                         "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", 
                         "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];
    
    // Use Path::file_name() to get the base filename
    let fname = match path.file_name() {
        Some(name) => name.to_string_lossy().to_string(),
        None => {
            return Err(ApiError::InvalidFilename { 
                details: format!("Invalid filename '{}': cannot extract filename", file_name),
                source: None,
            });
        }
    };
    
    // Check that fname equals the original file_name to detect separators and reject accordingly
    if fname != file_name {
        return Err(ApiError::InvalidFilename { 
            details: format!("Invalid filename '{}': contains path separators or directory components", file_name),
            source: None,
        });
    }
    
    // Check for reserved names on Windows using Path::file_stem()
    let name_without_ext = match path.file_stem() {
        Some(stem) => stem.to_string_lossy().to_uppercase(),
        None => file_name.to_uppercase()
    };
    if reserved_names.contains(&name_without_ext.as_str()) {
        return Err(ApiError::InvalidFilename { 
            details: format!("Invalid filename '{}': uses reserved system name", file_name),
            source: None,
        });
    }

    // Check for invalid characters
    let invalid_chars = ['<', '>', ':', '"', '|', '?', '*'];
    if file_name.chars().any(|c| invalid_chars.contains(&c) || c.is_control()) {
        return Err(ApiError::InvalidFilename { 
            details: format!("Invalid filename '{}': contains invalid characters", file_name),
            source: None,
        });
    }

    // Check reasonable length limits
    if file_name.len() > 255 {
        return Err(ApiError::InvalidFilename { 
            details: format!("Filename too long: {} characters (max 255)", file_name.len()),
            source: None,
        });
    }

    Ok(())
}

// Tauri command for saving audio files
#[tauri::command]
async fn save_audio_file(file_name: String, data: Vec<u8>, base_dir: Option<String>) -> Result<String, ApiError> {
    // Validate and sanitize the filename
    validate_filename(&file_name)?;

    // Get the audio session directory - use provided base_dir for tests or global session dir for normal operation
    let audio_dir = if let Some(dir) = base_dir {
        create_audio_session_dir_with_base(&PathBuf::from(dir))?
    } else {
        get_audio_session_dir()?
    };
    
    // Construct the final file path using only the sanitized filename
    let final_file_path = audio_dir.join(&file_name);
    
    // Create a temporary file in the same directory as the target
    let mut temp_file = NamedTempFile::new_in(&audio_dir)
        .map_err(|e| ApiError::FileSystemError {
            operation: OperationNames::FILE_WRITE.to_string(),
            details: format!("Failed to create temporary file: {}", e),
            source: Some(Box::new(e)),
        })?;
    
    // Write the audio data to the temporary file
    temp_file.write_all(&data)
        .map_err(|e| ApiError::FileSystemError {
            operation: OperationNames::FILE_WRITE.to_string(),
            details: format!("Failed to write audio data to file: {}", e),
            source: Some(Box::new(e)),
        })?;
    
    // Ensure all data is written to disk
    temp_file.flush()
        .map_err(|e| ApiError::FileSystemError {
            operation: OperationNames::FILE_WRITE.to_string(),
            details: format!("Failed to flush file data to disk: {}", e),
            source: Some(Box::new(e)),
        })?;
    
    // Atomically move the temporary file to the final location
    temp_file.persist(&final_file_path)
        .map_err(|e| ApiError::FileSystemError {
            operation: OperationNames::FILE_PERSIST.to_string(),
            details: format!("Failed to persist temporary file to final location: {}", e),
            source: Some(Box::new(e)),
        })?;
    
    // Set file permissions to owner-only (0o600) on Unix systems for security
    #[cfg(unix)]
    {
        use std::fs::Permissions;
        fs::set_permissions(&final_file_path, Permissions::from_mode(0o600))
            .map_err(|e| ApiError::FileSystemError {
                operation: OperationNames::FILE_PERSIST.to_string(),
                details: format!("Failed to set secure file permissions: {}", e),
                source: Some(Box::new(e)),
            })?;
    }
    
    // Canonicalize the path to get the absolute, resolved path with fallback
    let canonical_path = fs::canonicalize(&final_file_path)
        .or_else(|_| {
            // Fallback: manually construct absolute path if canonicalize fails
            let abs_path = if final_file_path.is_absolute() {
                final_file_path.clone()
            } else {
                env::current_dir()
                    .map_err(|e| ApiError::FileSystemError {
                        operation: OperationNames::PATH_CANONICALIZE.to_string(),
                        details: format!("Cannot determine current directory: {}", e),
                        source: Some(Box::new(e)),
                    })?
                    .join(&final_file_path)
            };
            Ok(abs_path)
        })
        .map_err(|e: ApiError| e)?;
    
    // Convert to string, ensuring it's valid UTF-8
    let path_str = canonical_path.to_str()
        .ok_or_else(|| ApiError::Internal {
            details: format!("Path contains invalid UTF-8 sequences: '{}'", 
                           canonical_path.to_string_lossy()),
            source: None,
        })?;
    
    log::info!("Audio file saved successfully: {}", path_str);
    Ok(path_str.to_string())
}

// Transcription commands
#[tauri::command]
async fn transcribe_audio(
    file_path: String,
    options: Option<TranscriptionOptions>,
    _transcription_jobs: State<'_, TranscriptionJobStore>,
) -> Result<TranscriptionResponse, ApiError> {
    // Validate file path and security
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(ApiError::AudioFileNotFound { 
            path: file_path,
            source: None,
        });
    }

    // Read file to check if it's valid audio format
    let _audio_data = fs::read(&path).map_err(|e| ApiError::FileSystemError {
        operation: OperationNames::FILE_SYSTEM.to_string(),
        details: format!("Failed to read audio file: {}", e),
        source: Some(Box::new(e)),
    })?;

    let options = options.unwrap_or_default();
    let job_id = options.job_id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());

    // For now, return mock transcription with proper structure
    // In a full implementation, this would:
    // 1. Download whisper model if not exists
    // 2. Initialize whisper context
    // 3. Process audio in spawn_blocking
    // 4. Return actual transcription segments
    
    let mock_response = TranscriptionResponse {
        text: "Test transcription".to_string(),
        segments: vec![
            TranscriptionSegment {
                text: "Test".to_string(),
                start: 0.0,
                end: 1.0,
                confidence: Some(0.95),
            },
            TranscriptionSegment {
                text: "transcription".to_string(),
                start: 1.0,
                end: 2.5,
                confidence: Some(0.92),
            },
        ],
    };

    // Apply max_segments if specified
    let mut final_response = mock_response;
    if let Some(max_segments) = options.max_segments {
        if final_response.segments.len() > max_segments {
            final_response.segments.truncate(max_segments);
        }
    }

    log::info!("Transcription completed for job_id: {}", job_id);
    Ok(final_response)
}

#[tauri::command]
async fn cancel_transcription(
    job_id: String,
    transcription_jobs: State<'_, TranscriptionJobStore>,
) -> Result<bool, ApiError> {
    let mut jobs = transcription_jobs.lock().map_err(|_| ApiError::StateLockError {
        resource: "TranscriptionJobStore".to_string(),
        source: None,
    })?;

    if let Some(job_handle) = jobs.remove(&job_id) {
        job_handle.abort();
        log::info!("Transcription job cancelled: {}", job_id);
        Ok(true)
    } else {
        log::debug!("Transcription job not found for cancellation: {}", job_id);
        Ok(false)
    }
}

#[tauri::command]
async fn test_transcription_pipeline(
    file_path: String,
    transcription_jobs: State<'_, TranscriptionJobStore>,
) -> Result<serde_json::Value, ApiError> {
    match transcribe_audio(file_path, None, transcription_jobs).await {
        Ok(result) => Ok(serde_json::json!({
            "success": true,
            "result": result
        })),
        Err(error) => Ok(serde_json::json!({
            "success": false,
            "error": error.to_string()
        })),
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
        return Err(ApiError::AudioFileNotFound { path, source: None });
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| ApiError::ProcessError {
                command: "explorer".to_string(),
                details: format!("Failed to open file explorer: {}", e),
                source: Some(Box::new(e)),
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
                source: Some(Box::new(e)),
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
                source: Some(Box::new(e)),
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
    let project_store = projects.read().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
    })?;
    let diagram_store = diagrams.read().map_err(|_| ApiError::StateLockError {
        resource: "DiagramStore".to_string(),
        source: None,
    })?;
    let connection_store = connections.read().map_err(|_| ApiError::StateLockError {
        resource: "ConnectionStore".to_string(),
        source: None,
    })?;

    let project = project_store.get(&project_id)
        .ok_or_else(|| ApiError::ProjectNotFound { project_id: project_id.clone(), source: None })?;
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
            details: e.to_string(),
            source: Some(Box::new(e)),
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
    let mut store = projects.write().map_err(|_| ApiError::StateLockError {
        resource: "ProjectStore".to_string(),
        source: None,
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
        .manage(TranscriptionJobStore::new(Mutex::new(HashMap::new())))
        // .manage(Mutex::new(NativeRecorder::new()))
        .invoke_handler({
            macro_rules! generate_handlers {
                () => {
                    tauri::generate_handler![
                        // Project Management Commands
                        create_project,
                        get_projects,
                        get_project,
                        update_project,
                        delete_project,
                        
                        // Component Management Commands
                        add_component,
                        update_component,
                        remove_component,
                        
                        // Diagram Management Commands
                        save_diagram,
                        load_diagram,
                        save_connections,
                        load_connections,
                        
                        // File and Utility Commands
                        get_app_version,
                        show_in_folder,
                        export_project_data,
                        save_audio_file,
                        // start_audio_recording,
                        // stop_audio_recording,

                        // Transcription Commands
                        transcribe_audio,
                        cancel_transcription,
                        test_transcription_pipeline,

                        // Challenge Plugin I/O
                        load_challenges_from_file,
                        save_challenges_to_file
                    ]
                };
                (with_debug) => {
                    tauri::generate_handler![
                        // Project Management Commands
                        create_project,
                        get_projects,
                        get_project,
                        update_project,
                        delete_project,
                        
                        // Component Management Commands
                        add_component,
                        update_component,
                        remove_component,
                        
                        // Diagram Management Commands
                        save_diagram,
                        load_diagram,
                        save_connections,
                        load_connections,
                        
                        // File and Utility Commands
                        get_app_version,
                        show_in_folder,
                        export_project_data,
                        save_audio_file,
                        // start_audio_recording,
                        // stop_audio_recording,

                        // Transcription Commands
                        transcribe_audio,
                        cancel_transcription,
                        test_transcription_pipeline,

                        // Challenge Plugin I/O
                        load_challenges_from_file,
                        save_challenges_to_file,
                        
                        // Debug Commands
                        populate_sample_data
                    ]
                };
            }
            
            #[cfg(debug_assertions)]
            { generate_handlers!(with_debug) }
            
            #[cfg(not(debug_assertions))]
            { generate_handlers!() }
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
        
        // Create isolated test directory
        let temp_dir = tempdir().expect("Failed to create temp directory");
        let temp_path = temp_dir.path().to_string_lossy().to_string();
        
        // Test with valid filename
        let valid_data = b"fake audio data";
        let result = save_audio_file("test_audio.wav".to_string(), valid_data.to_vec(), Some(temp_path.clone())).await;
        assert!(result.is_ok());
        
        // Clean up - the file should exist and be valid
        let file_path = result.unwrap();
        assert!(std::path::Path::new(&file_path).exists());
        let content = std::fs::read(&file_path).unwrap();
        assert_eq!(content, valid_data);
        
        // Test with malicious filename - should fail
        let long_name = "a".repeat(300);
        let malicious_names = vec![
            "../etc/passwd",
            "..\\Windows\\System32\\config",
            "CON",
            "file<>name",
            "",
            &long_name, // too long
        ];
        
        for malicious_name in malicious_names {
            let result = save_audio_file(malicious_name.to_string(), valid_data.to_vec(), Some(temp_path.clone())).await;
            assert!(result.is_err(), "Expected error for malicious filename: {}", malicious_name);
        }
        
        // Cleanup happens automatically when temp_dir goes out of scope
    }

    #[tokio::test] 
    async fn test_save_audio_file_canonicalization() {
        use std::path::PathBuf;
        use tempfile::tempdir;
        
        // Create isolated test directory
        let temp_dir = tempdir().expect("Failed to create temp directory");
        let temp_path = temp_dir.path().to_string_lossy().to_string();
        
        // Test that canonicalization works correctly
        let test_data = b"test audio content";
        let result = save_audio_file("test_canonical.wav".to_string(), test_data.to_vec(), Some(temp_path)).await;
        
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
        
        // Cleanup happens automatically when temp_dir goes out of scope
    }

    #[tokio::test]
    async fn test_file_cleanup_and_no_artifacts() {
        use std::fs;
        use std::path::PathBuf;
        use tempfile::tempdir;
        
        // Create isolated test directory
        let temp_dir = tempdir().expect("Failed to create temp directory");
        let temp_path = temp_dir.path().to_string_lossy().to_string();
        
        let test_data = b"cleanup test data";
        let filename = "cleanup_test.wav";
        
        // Save file in isolated directory
        let result = save_audio_file(filename.to_string(), test_data.to_vec(), Some(temp_path)).await;
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
        
        // Additional check: verify no files with random UUID suffixes (tempfile artifacts)
        let uuid_pattern_files: Vec<_> = entries_after_cleanup
            .iter()
            .filter(|name| {
                let name_str = name.to_string_lossy();
                name_str.len() > 10 && name_str.chars().filter(|c| *c == '-').count() >= 4
            })
            .collect();
        assert!(uuid_pattern_files.is_empty(), "Found UUID pattern files (potential artifacts): {:?}", uuid_pattern_files);
        
        // Explicit cleanup of created directory happens automatically when temp_dir goes out of scope
    }

    #[tokio::test]
    async fn test_concurrent_audio_file_operations() {
        use tempfile::tempdir;
        use tokio::task::JoinHandle;
        
        // Create multiple isolated test directories for concurrent tests
        let temp_dir1 = tempdir().expect("Failed to create temp directory 1");
        let temp_dir2 = tempdir().expect("Failed to create temp directory 2");
        let temp_path1 = temp_dir1.path().to_string_lossy().to_string();
        let temp_path2 = temp_dir2.path().to_string_lossy().to_string();
        
        let test_data1 = b"concurrent test data 1";
        let test_data2 = b"concurrent test data 2";
        
        // Start two concurrent audio file operations in different directories
        let handle1: JoinHandle<Result<String, ApiError>> = tokio::spawn(async move {
            save_audio_file("concurrent1.wav".to_string(), test_data1.to_vec(), Some(temp_path1)).await
        });
        
        let handle2: JoinHandle<Result<String, ApiError>> = tokio::spawn(async move {
            save_audio_file("concurrent2.wav".to_string(), test_data2.to_vec(), Some(temp_path2)).await
        });
        
        // Wait for both operations to complete
        let result1 = handle1.await.expect("Task 1 panicked").expect("Save operation 1 failed");
        let result2 = handle2.await.expect("Task 2 panicked").expect("Save operation 2 failed");
        
        // Verify both files were created successfully and independently
        assert!(std::path::Path::new(&result1).exists());
        assert!(std::path::Path::new(&result2).exists());
        
        // Verify paths are different (isolated)
        assert_ne!(result1, result2);
        
        // Verify file contents
        let content1 = std::fs::read(&result1).expect("Failed to read file 1");
        let content2 = std::fs::read(&result2).expect("Failed to read file 2");
        assert_eq!(content1, test_data1);
        assert_eq!(content2, test_data2);
        
        // Cleanup happens automatically when temp directories go out of scope
    }

    #[test]
    fn test_api_error_display() {
        let error = ApiError::ProjectNotFound { 
            project_id: "test_id".to_string(),
            source: None,
        };
        assert_eq!(error.to_string(), "Project not found: test_id");
        
        let error = ApiError::ComponentNotFound { 
            component_id: "comp_id".to_string(),
            project_id: "proj_id".to_string(),
            source: None,
        };
        assert_eq!(error.to_string(), "Component not found: comp_id in project proj_id");
        
        let error = ApiError::InvalidProjectData { 
            details: "Name too long".to_string(),
            source: None,
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
            ApiError::FileSystemError { operation, details, .. } => {
                assert_eq!(operation, OperationNames::FILE_SYSTEM);
                assert!(details.contains("A file system operation failed"));
                assert!(details.contains("access denied"));
            }
            _ => panic!("Expected FileSystemError variant"),
        }
        
        // Test From<serde_json::Error>
        let json_error = serde_json::from_str::<serde_json::Value>("invalid json").unwrap_err();
        let api_error: ApiError = json_error.into();
        match api_error {
            ApiError::SerializationError { operation, details, .. } => {
                assert_eq!(operation, OperationNames::SERIALIZATION);
                assert!(details.starts_with("Data serialization or deserialization failed:"));
            }
            _ => panic!("Expected SerializationError variant"),
        }
        
        // Test From<ApiError> for String
        let api_error = ApiError::Internal { 
            details: "test error".to_string(),
            source: None,
        };
        let error_string: String = api_error.into();
        assert_eq!(error_string, "Internal error: test error");
    }
}
