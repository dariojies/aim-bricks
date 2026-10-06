import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Cada petición a la API lleva el token de la sesión: el servidor ya no se fía
// del userId que mande la pantalla. Si la sesión ya no vale (caducada o de antes
// de este cambio), se cierra y se pide entrar otra vez.
const fetchOriginal = window.fetch.bind(window)
let avisado = false
window.fetch = async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
  const deLaApi = /\/api\//.test(url) && (url.startsWith('/') || url.startsWith(window.location.origin) || url.startsWith('http://localhost:3000'))
  const token = localStorage.getItem('aim_bricks_token')
  if (deLaApi && token) {
    const cabeceras = new Headers(init.headers || (entrada instanceof Request ? entrada.headers : undefined))
    if (!cabeceras.has('Authorization')) cabeceras.set('Authorization', `Bearer ${token}`)
    init = { ...init, headers: cabeceras }
  }
  const res = await fetchOriginal(entrada, init)
  if (res.status === 401 && deLaApi && !/\/api\/auth\/(login|register)/.test(url) && localStorage.getItem('aim_bricks_user') && !avisado) {
    avisado = true
    localStorage.removeItem('aim_bricks_user')
    localStorage.removeItem('aim_bricks_token')
    alert('Tu sesión ha caducado. Vuelve a entrar.')
    window.location.replace('/app?login=1')
  }
  return res
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
