import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ReactModal from 'react-modal';
import { AppStateProvider } from './AppState.jsx';




ReactModal.setAppElement('#root');

// Register the service worker — required for the app to be installable as a PWA
// (the browser only fires `beforeinstallprompt` once an SW with a fetch handler
// is active). Registered after load so it never competes with initial rendering.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>

    <AppStateProvider>
      <App />
    </AppStateProvider>

  </StrictMode>

  ,
)
