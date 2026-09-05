import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// No <StrictMode> here — its dev-only double-invoke of effects breaks
// @react-google-maps/api's <Marker> rendering (confirmed in the broker+driver app:
// same code renders every marker correctly in a production build, which never
// double-invokes effects). Only affects the dev-server experience.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)

// Remove the boot splash (index.html) once React has painted. loaderGif.gif loops
// infinitely on its own (no artificial minimum hold needed) — it just keeps animating
// for as long as this is shown.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash')
    if (splash) {
      splash.classList.add('fade-out')
      setTimeout(() => splash.remove(), 550)
    }
  })
})
