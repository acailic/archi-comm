// Development utilities for testing and debugging
#![allow(dead_code)]

use crate::{Project, Component, ComponentType, ComponentStatus, ProjectStatus};
use chrono::Utc;
use std::collections::HashMap;
use uuid::Uuid;

/// Create sample data for development and testing
pub fn create_sample_project() -> Project {
    let mut metadata = HashMap::new();
    metadata.insert("framework".to_string(), "React".to_string());
    metadata.insert("language".to_string(), "TypeScript".to_string());

    let components = vec![
        Component {
            id: Uuid::new_v4().to_string(),
            name: "User Interface".to_string(),
            component_type: ComponentType::Frontend,
            description: "React-based user interface with Tailwind CSS styling".to_string(),
            dependencies: vec!["API Gateway".to_string()],
            status: ComponentStatus::InProgress,
            metadata: metadata.clone(),
        },
        Component {
            id: Uuid::new_v4().to_string(),
            name: "API Gateway".to_string(),
            component_type: ComponentType::Api,
            description: "RESTful API for handling client requests".to_string(),
            dependencies: vec!["Database".to_string()],
            status: ComponentStatus::Done,
            metadata: HashMap::new(),
        },
        Component {
            id: Uuid::new_v4().to_string(),
            name: "Database".to_string(),
            component_type: ComponentType::Database,
            description: "PostgreSQL database for data persistence".to_string(),
            dependencies: vec![],
            status: ComponentStatus::Done,
            metadata: HashMap::new(),
        },
        Component {
            id: Uuid::new_v4().to_string(),
            name: "Authentication Service".to_string(),
            component_type: ComponentType::Service,
            description: "JWT-based authentication and authorization service".to_string(),
            dependencies: vec!["Database".to_string()],
            status: ComponentStatus::Testing,
            metadata: HashMap::new(),
        },
    ];

    Project {
        id: Uuid::new_v4().to_string(),
        name: "ArchiComm Sample Project".to_string(),
        description: "A sample architecture project demonstrating the platform capabilities".to_string(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        status: ProjectStatus::InProgress,
        components,
    }
}

/// Create multiple sample projects for testing
pub fn create_sample_projects() -> Vec<Project> {
    vec![
        create_sample_project(),
        Project {
            id: Uuid::new_v4().to_string(),
            name: "E-commerce Platform".to_string(),
            description: "Microservices-based e-commerce platform".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            status: ProjectStatus::Planning,
            components: vec![
                Component {
                    id: Uuid::new_v4().to_string(),
                    name: "Product Catalog".to_string(),
                    component_type: ComponentType::Service,
                    description: "Service for managing product information".to_string(),
                    dependencies: vec![],
                    status: ComponentStatus::NotStarted,
                    metadata: HashMap::new(),
                },
                Component {
                    id: Uuid::new_v4().to_string(),
                    name: "Payment Gateway".to_string(),
                    component_type: ComponentType::Integration,
                    description: "Integration with external payment providers".to_string(),
                    dependencies: vec!["User Service".to_string()],
                    status: ComponentStatus::NotStarted,
                    metadata: HashMap::new(),
                },
            ],
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sample_project_creation() {
        let project = create_sample_project();
        assert!(!project.id.is_empty());
        assert_eq!(project.name, "ArchiComm Sample Project");
        assert_eq!(project.components.len(), 4);
        assert!(matches!(project.status, ProjectStatus::InProgress));
    }

    #[test]
    fn test_multiple_projects_creation() {
        let projects = create_sample_projects();
        assert_eq!(projects.len(), 2);
        assert!(projects.iter().all(|p| !p.id.is_empty()));
    }
}