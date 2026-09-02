import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { applyQualityAttribute } from './lib/quality.js'

// Before the first paint: the stylesheet needs to know whether this machine
// can afford backdrop blur and perpetual background animation, and finding
// out after React has mounted means a low-end device renders the expensive
// version once anyway.
applyQualityAttribute()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)