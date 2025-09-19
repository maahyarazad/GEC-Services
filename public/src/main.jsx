import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ReactModal from 'react-modal';
import { AppStateProvider } from './AppState.jsx';




ReactModal.setAppElement('#root');
createRoot(document.getElementById('root')).render(
  <StrictMode>

    <AppStateProvider>
      <App />
    </AppStateProvider>

  </StrictMode>

  ,
)
