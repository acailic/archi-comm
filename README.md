# ArchiComm - Desktop Architecture Communication Platform

> A powerful desktop application for architectural design communication and team collaboration, built with React and Tauri.

![ArchiComm](https://img.shields.io/badge/Platform-Desktop-blue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB)
![Tauri](https://img.shields.io/badge/Tauri-1.8-FFC131)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6)
![Rust](https://img.shields.io/badge/Rust-Backend-000000)

## 🚀 Features

### Desktop Native
- **Native Performance**: Built with Tauri for near-native performance
- **Cross-Platform**: Runs on Windows, macOS, and Linux
- **System Integration**: Native file dialogs, notifications, and window management
- **Offline Capable**: Full functionality without internet connection

### Architecture Design
- **Interactive Canvas**: Drag-and-drop component placement with 40+ component types
- **Visual Connections**: Draw and manage connections between components
- **Component Library**: Comprehensive set of architectural components (Frontend, Backend, Database, API, Service, Integration)
- **Project Management**: Full CRUD operations for architecture projects

### Communication Tools
- **Audio Recording**: WebRTC-based audio recording with real-time transcription
- **Session Analytics**: Clarity scoring, technical depth analysis, and business focus tracking
- **Challenge System**: Built-in challenge library with learning objectives
- **Review System**: Comprehensive session review and analysis

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** with TypeScript
- **Vite 6.3.5** for blazing fast development
- **Tailwind CSS v4** for modern styling
- **Radix UI** components for consistent design system
- **Motion/Framer Motion** for smooth animations
- **React DND** for drag-and-drop functionality

### Backend
- **Rust** with Tauri framework
- **SQLx** for database operations (SQLite)
- **Tokio** for async runtime
- **Serde** for JSON serialization
- **UUID** and **Chrono** for data management

### Desktop Integration
- Native file system access
- System notifications
- Window management and controls
- Cross-platform compatibility

## 📦 Installation

### Prerequisites
- **Node.js** 18+ and npm
- **Rust** 1.70+ (install from [rustup.rs](https://rustup.rs/))
- **Tauri CLI** (installed automatically via npm)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/acailic/archi-comm.git
   cd archi-comm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the desktop application**
   ```bash
   npm start
   # or
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🎯 Usage

### Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start desktop app (default) |
| `npm run dev` | Start desktop app in development mode |
| `npm run web:dev` | Start web version for development |
| `npm run build` | Build production desktop app |
| `npm run release` | Build with all bundle formats |
| `npm run build:debug` | Build debug version |
| `npm run preview` | Build and preview debug version |

### Web Fallback
The application also supports web deployment:
```bash
npm run web:dev    # Development web server
npm run web:build  # Build for web deployment
```

### Project Structure
```
archi-comm/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── lib/               # Utilities and integrations
│   │   └── tauri.ts       # Tauri integration layer
│   └── ...
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Main Tauri application
│   │   └── dev_utils.rs   # Development utilities
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── dist/                  # Built frontend assets
└── package.json          # Node.js configuration
```

## 🔧 Configuration

### Desktop App Settings
The desktop app can be configured via `src-tauri/tauri.conf.json`:
- Window dimensions and behavior
- System permissions and security
- Bundle settings for different platforms
- Auto-updater configuration

### Development
For development, the app supports:
- Hot reload for both React and Rust code
- Debug logging and error reporting
- Sample data population in development mode
- Cross-platform development environment

## 🎨 Features in Detail

### Project Management
- Create, read, update, and delete architecture projects
- Component management with type system
- Diagram persistence and loading
- Export capabilities (JSON format)

### Component System
- **Frontend** components (React, Vue, Angular, etc.)
- **Backend** services (APIs, microservices, etc.)
- **Database** systems (SQL, NoSQL, caches)
- **Integration** points (message queues, APIs)
- **Service** layers (authentication, logging, etc.)

### Desktop Capabilities
- Native file system operations
- System notifications
- Window management (minimize, maximize, close)
- Operating system integration
- Cross-platform compatibility

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Author

**Aleksandar Ilic**
- GitHub: [@acailic](https://github.com/acailic)

## 🌟 Acknowledgments

- Built with [Tauri](https://tauri.app/) framework
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Frontend framework [React](https://reactjs.org/)

## 🚀 Roadmap

- [ ] Advanced collaboration features
- [ ] Template sharing ecosystem
- [ ] Multi-user real-time editing
- [ ] Advanced analytics and reporting
- [ ] Plugin system for extensibility
- [ ] Cloud synchronization
- [ ] Advanced export formats (PDF, PNG, SVG)

---

*ArchiComm - Making architecture communication seamless and collaborative* 🏗️✨