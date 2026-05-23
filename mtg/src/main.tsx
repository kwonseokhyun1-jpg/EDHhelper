import { GoogleOAuthProvider } from '@react-oauth/google'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { googleClientId } from './lib/google-auth'
import { firebaseEnabled } from './lib/firebase'

const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

createRoot(document.getElementById('root')!).render(
  googleClientId && !firebaseEnabled ? (
    <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
  ) : (
    app
  ),
)
