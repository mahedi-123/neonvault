// Template entry: loads this design's stylesheet, sets the quality flag
// before first paint, and hands its App to the shared root (src/main.jsx).
import './index.css'
import { applyQualityAttribute } from './lib/quality.js'
import App from './App.jsx'

applyQualityAttribute()

export default App
