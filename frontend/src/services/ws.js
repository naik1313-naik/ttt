const wsHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'
const WS_BASE = (import.meta.env.VITE_WS_BASE || `${wsProtocol}://${wsHost}:8000`) + '/ws'

let socket
let listeners = new Set()

export function connectWS() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return socket
  socket = new WebSocket(WS_BASE)
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      listeners.forEach((fn) => fn(msg))
    } catch {}
  }
  socket.onclose = () => {
    setTimeout(connectWS, 2000)
  }
  return socket
}

export function onWSMessage(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
