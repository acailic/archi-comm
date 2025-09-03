
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  // Disable right-click context menu in production Tauri build
  if (typeof window !== 'undefined' && window.__TAURI__) {
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // Handle window controls for macOS
    document.addEventListener('DOMContentLoaded', () => {
      const appElement = document.getElementById('root');
      if (appElement) {
        appElement.style.borderRadius = '8px';
      }
    });
  }

  createRoot(document.getElementById("root")!).render(<App />);
  