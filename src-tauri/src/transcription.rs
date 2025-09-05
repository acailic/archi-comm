use simple_transcribe_rs::{transcriber, model_handler};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;

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

        // Perform transcription using SimpleTranscribe-rs
        match transcriber::transcribe_file(
            audio_path,
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
        }
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

// Helper functions for audio processing
pub fn supported_audio_formats() -> Vec<&'static str> {
    vec!["wav", "mp3", "m4a", "webm", "ogg", "flac"]
}

pub fn create_temp_audio_path(original_name: &str) -> PathBuf {
    let temp_dir = std::env::temp_dir();
    let timestamp = chrono::Utc::now().timestamp();
    let filename = format!("{}_{}.audio", original_name, timestamp);
    temp_dir.join(filename)
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
}