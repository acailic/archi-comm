use simple_transcribe_rs::{transcriber, model_handler};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionConfig {
    pub model_type: String,
    pub language: Option<String>,
    pub audio_file_path: PathBuf,
    pub output_format: String,
}

impl Default for TranscriptionConfig {
    fn default() -> Self {
        Self {
            model_type: "base".to_string(),
            language: Some("en".to_string()),
            audio_file_path: PathBuf::new(),
            output_format: "text".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub confidence: Option<f32>,
    pub processing_time: Duration,
    pub language_detected: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum TranscriptionError {
    #[error("Audio file not found: {0}")]
    FileNotFound(String),
    #[error("Model loading error: {0}")]
    ModelLoadError(String),
    #[error("Transcription failed: {0}")]
    TranscriptionFailed(String),
    #[error("Invalid audio format: {0}")]
    InvalidAudioFormat(String),
    #[error("Audio conversion failed: {0}")]
    ConversionFailed(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub struct AudioTranscriber {
    config: TranscriptionConfig,
    model_loaded: bool,
}

impl AudioTranscriber {
    pub fn new(config: TranscriptionConfig) -> Self {
        Self {
            config,
            model_loaded: false,
        }
    }

    pub async fn initialize(&mut self) -> Result<(), TranscriptionError> {
        // Initialize the Whisper Base model
        match model_handler::load_model(&self.config.model_type).await {
            Ok(_) => {
                self.model_loaded = true;
                log::info!("Whisper {} model loaded successfully", self.config.model_type);
                Ok(())
            }
            Err(e) => {
                log::error!("Failed to load model: {}", e);
                Err(TranscriptionError::ModelLoadError(e.to_string()))
            }
        }
    }

    pub async fn transcribe_audio(&self, audio_path: &PathBuf) -> Result<TranscriptionResult, TranscriptionError> {
        if !self.model_loaded {
            return Err(TranscriptionError::ModelLoadError("Model not initialized".to_string()));
        }

        if !audio_path.exists() {
            return Err(TranscriptionError::FileNotFound(
                audio_path.to_string_lossy().to_string()
            ));
        }

        // Validate audio format
        self.validate_audio_format(audio_path)?;

        let start_time = std::time::Instant::now();
        let mut temp_files = Vec::new();
        
        // Convert WebM to WAV if necessary
        let processed_audio_path = if self.needs_conversion(audio_path)? {
            let converted_path = convert_webm_to_wav(audio_path).await?;
            temp_files.push(converted_path.clone());
            converted_path
        } else {
            audio_path.clone()
        };

        // Perform transcription using SimpleTranscribe-rs
        let result = match transcriber::transcribe_file(
            &processed_audio_path,
            &self.config.language.clone().unwrap_or_else(|| "en".to_string()),
        ).await {
            Ok(transcription) => {
                let processing_time = start_time.elapsed();
                
                Ok(TranscriptionResult {
                    text: transcription.text,
                    confidence: transcription.confidence,
                    processing_time,
                    language_detected: transcription.language,
                })
            }
            Err(e) => {
                log::error!("Transcription failed: {}", e);
                Err(TranscriptionError::TranscriptionFailed(e.to_string()))
            }
        };

        // Clean up temporary files
        if let Err(e) = self.cleanup_temp_files(&temp_files).await {
            log::warn!("Failed to cleanup temporary files: {}", e);
        }

        result
    }

    fn validate_audio_format(&self, audio_path: &PathBuf) -> Result<(), TranscriptionError> {
        let extension = audio_path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_lowercase());

        match extension.as_deref() {
            Some("wav") | Some("mp3") | Some("m4a") | Some("webm") | Some("ogg") | Some("flac") => Ok(()),
            Some(ext) => Err(TranscriptionError::InvalidAudioFormat(
                format!("Unsupported audio format: {}", ext)
            )),
            None => Err(TranscriptionError::InvalidAudioFormat(
                "Could not determine audio format".to_string()
            )),
        }
    }

    fn needs_conversion(&self, audio_path: &PathBuf) -> Result<bool, TranscriptionError> {
        let extension = audio_path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_lowercase());

        match extension.as_deref() {
            Some("webm") => Ok(true),
            Some("wav") | Some("mp3") | Some("m4a") | Some("ogg") | Some("flac") => Ok(false),
            _ => Ok(false),
        }
    }

    pub async fn cleanup_temp_files(&self, temp_paths: &[PathBuf]) -> Result<(), TranscriptionError> {
        for path in temp_paths {
            if path.exists() {
                if let Err(e) = tokio::fs::remove_file(path).await {
                    log::warn!("Failed to remove temporary file {:?}: {}", path, e);
                }
            }
        }
        Ok(())
    }
}

// Audio conversion functionality
pub async fn convert_webm_to_wav(webm_path: &PathBuf) -> Result<PathBuf, TranscriptionError> {
    let output_path = create_temp_wav_path(&webm_path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("audio")
    );

    log::info!("Converting WebM to WAV: {:?} -> {:?}", webm_path, output_path);

    // Use FFmpeg for conversion
    let output = tokio::process::Command::new("ffmpeg")
        .arg("-i")
        .arg(webm_path)
        .arg("-acodec")
        .arg("pcm_s16le")
        .arg("-ar")
        .arg("16000")
        .arg("-ac")
        .arg("1")
        .arg("-y") // Overwrite output file
        .arg(&output_path)
        .output()
        .await
        .map_err(|e| TranscriptionError::ConversionFailed(
            format!("Failed to execute FFmpeg: {}", e)
        ))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(TranscriptionError::ConversionFailed(
            format!("FFmpeg conversion failed: {}", stderr)
        ));
    }

    if !output_path.exists() {
        return Err(TranscriptionError::ConversionFailed(
            "Conversion completed but output file not found".to_string()
        ));
    }

    log::info!("WebM to WAV conversion completed successfully");
    Ok(output_path)
}

// Helper functions for audio processing
pub fn supported_audio_formats() -> Vec<&'static str> {
    vec!["wav", "mp3", "m4a", "webm", "ogg", "flac"]
}

pub fn create_temp_audio_path(original_name: &str) -> PathBuf {
    let temp_dir = std::env::temp_dir();
    let timestamp = chrono::Utc::now().timestamp();
    let filename = format!("archicomm_{}_{}.audio", original_name, timestamp);
    temp_dir.join(filename)
}

pub fn create_temp_wav_path(original_name: &str) -> PathBuf {
    let temp_dir = std::env::temp_dir();
    let timestamp = chrono::Utc::now().timestamp();
    let filename = format!("archicomm_{}_{}.wav", original_name, timestamp);
    temp_dir.join(filename)
}

// Audio file validation and metadata
pub async fn get_audio_info(audio_path: &PathBuf) -> Result<AudioInfo, TranscriptionError> {
    if !audio_path.exists() {
        return Err(TranscriptionError::FileNotFound(
            audio_path.to_string_lossy().to_string()
        ));
    }

    let metadata = tokio::fs::metadata(audio_path).await?;
    let file_size = metadata.len();
    
    let extension = audio_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_else(|| "unknown".to_string());

    Ok(AudioInfo {
        file_path: audio_path.clone(),
        file_size,
        format: extension,
        duration: None, // Could be enhanced with FFprobe
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioInfo {
    pub file_path: PathBuf,
    pub file_size: u64,
    pub format: String,
    pub duration: Option<Duration>,
}

// Temporary file manager
pub struct TempFileManager {
    temp_files: Vec<PathBuf>,
}

impl TempFileManager {
    pub fn new() -> Self {
        Self {
            temp_files: Vec::new(),
        }
    }

    pub fn add_temp_file(&mut self, path: PathBuf) {
        self.temp_files.push(path);
    }

    pub async fn cleanup_all(&mut self) -> Result<(), TranscriptionError> {
        for path in &self.temp_files {
            if path.exists() {
                if let Err(e) = tokio::fs::remove_file(path).await {
                    log::warn!("Failed to remove temporary file {:?}: {}", path, e);
                }
            }
        }
        self.temp_files.clear();
        Ok(())
    }

    pub fn get_temp_files(&self) -> &[PathBuf] {
        &self.temp_files
    }
}

impl Drop for TempFileManager {
    fn drop(&mut self) {
        // Best effort cleanup in destructor
        for path in &self.temp_files {
            if path.exists() {
                if let Err(e) = std::fs::remove_file(path) {
                    log::warn!("Failed to remove temporary file {:?} in Drop: {}", path, e);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transcription_config_default() {
        let config = TranscriptionConfig::default();
        assert_eq!(config.model_type, "base");
        assert_eq!(config.language, Some("en".to_string()));
        assert_eq!(config.output_format, "text");
    }

    #[test]
    fn test_supported_audio_formats() {
        let formats = supported_audio_formats();
        assert!(formats.contains(&"wav"));
        assert!(formats.contains(&"webm"));
        assert!(formats.contains(&"mp3"));
    }

    #[test]
    fn test_audio_format_validation() {
        let config = TranscriptionConfig::default();
        let transcriber = AudioTranscriber::new(config);
        
        let wav_path = PathBuf::from("test.wav");
        assert!(transcriber.validate_audio_format(&wav_path).is_ok());
        
        let webm_path = PathBuf::from("test.webm");
        assert!(transcriber.validate_audio_format(&webm_path).is_ok());
        
        let invalid_path = PathBuf::from("test.txt");
        assert!(transcriber.validate_audio_format(&invalid_path).is_err());
    }

    #[test]
    fn test_needs_conversion() {
        let config = TranscriptionConfig::default();
        let transcriber = AudioTranscriber::new(config);
        
        let webm_path = PathBuf::from("test.webm");
        assert!(transcriber.needs_conversion(&webm_path).unwrap());
        
        let wav_path = PathBuf::from("test.wav");
        assert!(!transcriber.needs_conversion(&wav_path).unwrap());
        
        let mp3_path = PathBuf::from("test.mp3");
        assert!(!transcriber.needs_conversion(&mp3_path).unwrap());
    }

    #[test]
    fn test_temp_file_manager() {
        let mut manager = TempFileManager::new();
        assert_eq!(manager.get_temp_files().len(), 0);
        
        let temp_path = PathBuf::from("/tmp/test.wav");
        manager.add_temp_file(temp_path.clone());
        assert_eq!(manager.get_temp_files().len(), 1);
        assert_eq!(manager.get_temp_files()[0], temp_path);
    }

    #[test]
    fn test_temp_path_generation() {
        let path1 = create_temp_wav_path("test");
        let path2 = create_temp_wav_path("test");
        
        // Paths should be different due to timestamp
        assert_ne!(path1, path2);
        assert!(path1.to_string_lossy().contains("archicomm_test_"));
        assert!(path1.to_string_lossy().ends_with(".wav"));
    }
}