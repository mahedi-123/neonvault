import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { TEMPLATES, readTemplate } from './shell/templates.js'
import { mountSwitcher } from './shell/switcher.js'
import { bootstrap } from './shared/lib/boot.js'
import { track } from './shared/lib/api.js'

// Static hosts without SPA rewrites (artifact previews) build with hash routing.
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter

// Every design lives in src/templates/<id>/ as a complete, self-contained app.
// Only the chosen one is downloaded and mounted; the switcher reloads into another.
const id = readTemplate()
const template = TEMPLATES.find((t) => t.id === id)
document.documentElement.dataset.template = id

// The design's code and the backend handshake (live catalog + session) load in parallel.
Promise.all([template.load(), bootstrap()]).then(([{ default: App }]) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Router>
        <App />
      </Router>
    </StrictMode>,
  )
  mountSwitcher(id, (next) => track('template_switch', { template: next }))
})
