# Tauri Backend Setup

## Overview

This project uses Tauri to create a desktop application with a Rust backend and React frontend. The Tauri backend provides native desktop functionality and acts as a bridge between the web-based UI and the operating system.

## Prerequisites

Before running the application, ensure you have the following installed:

1. **Rust**: Install from [rustup.rs](https://rustup.rs/)
2. **Node.js**: Version 16 or higher
3. **System Dependencies**:
   - **Windows**: Microsoft C++ Build Tools or Visual Studio with C++ support
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Linux**: `build-essential`, `curl`, `wget`, `file`, `libssl-dev`, `libgtk-3-dev`, `librsvg2-dev`

## Project Structure

```
archicomm/
├── src/                     # React frontend source
│   ├── components/         # React components
│   ├── services/          # Tauri API integration
│   └── hooks/             # React hooks for Tauri
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs        # Main Tauri application
│   │   └── dev_utils.rs   # Development utilities
│   ├── Cargo.toml         # Rust dependencies
│   ├── tauri.conf.json    # Tauri configuration
│   └── icons/             # Application icons
├── package.json           # Node.js dependencies
└── vite.config.ts         # Vite configuration
```

## Available Scripts

### Development

```bash
# Install dependencies
npm install

# Start development server (React + Tauri)
npm run tauri:dev
```

### Build

```bash
# Build for production
npm run tauri:build
```

### Icon Generation

```bash
# Generate icons from a source image
npm run tauri:icon path/to/your/icon.png
```

## Tauri Backend Features

### Core Functionality

The Rust backend provides the following APIs:

#### Project Management
- `create_project(name, description)` - Create a new project
- `get_projects()` - Get all projects
- `get_project(project_id)` - Get specific project
- `update_project(project_id, updates)` - Update project details
- `delete_project(project_id)` - Delete a project

#### Component Management
- `add_component(project_id, name, type, description)` - Add component to project
- `update_component(project_id, component_id, updates)` - Update component
- `remove_component(project_id, component_id)` - Remove component

#### Diagram Management
- `save_diagram(project_id, elements)` - Save diagram elements
- `load_diagram(project_id)` - Load diagram elements
- `save_connections(project_id, connections)` - Save diagram connections
- `load_connections(project_id)` - Load diagram connections

#### Utility Functions
- `get_app_version()` - Get application version
- `show_in_folder(path)` - Open file location in system file manager
- `export_project_data(project_id)` - Export project as JSON

#### Development Commands (Debug mode only)
- `populate_sample_data()` - Populate app with sample projects for testing

### Data Models

The backend uses the following primary data structures:

```rust
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub status: ProjectStatus,
    pub components: Vec<Component>,
}

pub struct Component {
    pub id: String,
    pub name: String,
    pub component_type: ComponentType,
    pub description: String,
    pub dependencies: Vec<String>,
    pub status: ComponentStatus,
    pub metadata: HashMap<String, String>,
}
```

## Frontend Integration

### React Hooks

The project includes custom React hooks for easy integration:

```typescript
// Project management
const { projects, loading, createProject, updateProject } = useProjects();

// Individual project
const { project, addComponent, updateComponent } = useProject(projectId);

// Diagram management
const { elements, connections, saveDiagram } = useDiagram(projectId);

// Utilities
const { appVersion, showInFolder, exportProject } = useUtilities();
```

### API Services

Direct API access is available through service classes:

```typescript
import { ProjectAPI, ComponentAPI, DiagramAPI } from './services/tauri';

// Create a new project
const project = await ProjectAPI.createProject('My Project', 'Description');

// Add a component
const component = await ComponentAPI.addComponent(
  project.id, 
  'Frontend', 
  ComponentType.Frontend, 
  'React application'
);
```

## Configuration

### Tauri Configuration (`src-tauri/tauri.conf.json`)

Key configuration options:

- **Window settings**: Size, decorations, resizability
- **Security**: File system access, dialog permissions
- **Build settings**: Icon paths, bundle configuration
- **Development**: Dev server URL and build commands

### Permissions

The application has the following permissions enabled:
- File system access (scoped to app directories)
- Dialog boxes (open, save, message)
- Clipboard access
- Notification support
- Window management
- OS information access

## Development Tips

### Debugging

1. **Rust logs**: Use `log::info!()` in Rust code and check the console
2. **Frontend debugging**: Use browser dev tools in Tauri dev mode
3. **State inspection**: The backend state is held in memory during development

### Testing

1. **Rust tests**: Run `cargo test` in the `src-tauri` directory
2. **Frontend tests**: Standard React testing tools work normally
3. **Sample data**: Use `populate_sample_data()` command in dev mode

### Building for Production

The build process:
1. Builds the React frontend with Vite
2. Compiles the Rust backend
3. Packages everything into platform-specific installers

### Platform-Specific Notes

- **macOS**: May require code signing for distribution
- **Windows**: Can generate MSI installer or portable executable
- **Linux**: Generates AppImage and DEB packages

## Troubleshooting

### Common Issues

1. **Build fails**: Ensure all system dependencies are installed
2. **API calls fail**: Check that Tauri commands are properly registered
3. **Icons missing**: Run `npm run tauri:icon` to generate required icon formats

### Performance

- The backend uses in-memory storage for development
- For production, consider adding persistent storage (SQLite integration is prepared)
- Large diagrams should be optimized on the frontend to reduce serialization overhead

## Future Enhancements

Planned backend improvements:
- SQLite database integration for persistence
- File-based project storage
- Real-time collaboration features
- Plugin system for extensions
- Advanced export formats (PDF, SVG, etc.)