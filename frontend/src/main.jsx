import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'
import queryClient from './lib/queryClient.js'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const app = (
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster richColors position="top-right" closeButton />
  </QueryClientProvider>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {googleClientId
      ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
      : app}
  </StrictMode>,
)
