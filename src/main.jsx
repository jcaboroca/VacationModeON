import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/app.css'

// No StrictMode: it double-invokes effects in dev, and getRedirectResult()
// is a one-shot promise — a double call was a suspect in a lost redirect
// sign-in. Safe to drop for a personal project with no team relying on the
// extra dev-only checks.
createRoot(document.getElementById('root')).render(<App />)
