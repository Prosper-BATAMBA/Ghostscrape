// offscreen.js
// Runs inside the hidden offscreen document (a real DOM context).
// Chrome does NOT suspend offscreen documents for inactivity the way it
// suspends MV3 service workers, so this is where the WebSocket lives.
// background.js never touches `ws` directly anymore — it only exchanges
// chrome.runtime messages with this document.

const SERVER_URL = 'ws://localhost:8000/ws/extension'

let ws = null
let connId = 0
let reconnectTimer = null
let reconnectAttempts = 0
const RECONNECT_DELAYS = [200, 500, 1000, 2000, 3000, 5000]
const MAX_RECONNECT_DELAY = 5000
const PING_INTERVAL_MS = 15000
let pingTimer = null

function nextDelay() {
  const d = reconnectAttempts < RECONNECT_DELAYS.length
    ? RECONNECT_DELAYS[reconnectAttempts]
    : MAX_RECONNECT_DELAY
  reconnectAttempts++
  return d
}

function notifyBackground(type, payload) {
  chrome.runtime.sendMessage({ source: 'gs-offscreen', type, ...payload }).catch(() => {})
}

function connect() {
  clearTimeout(reconnectTimer)
  reconnectTimer = null

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  const id = ++connId
  const socket = new WebSocket(SERVER_URL)
  ws = socket

  socket.onopen = () => {
    if (connId !== id) { socket.close(); return }
    reconnectAttempts = 0
    console.log('[GS Offscreen] WS connected')
    notifyBackground('WS_STATUS', { connected: true })

    clearInterval(pingTimer)
    pingTimer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'PING' }))
      }
    }, PING_INTERVAL_MS)
  }

  socket.onmessage = (event) => {
    if (connId !== id) return
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'PING') {
        socket.send(JSON.stringify({ type: 'PONG' }))
        return
      }
      if (msg.type === 'PONG') return
      notifyBackground('WS_MESSAGE', { payload: msg })
    } catch (e) {
      console.error('[GS Offscreen] Invalid message:', e)
    }
  }

  socket.onclose = () => {
    if (connId !== id) return
    console.log('[GS Offscreen] WS closed, scheduling reconnect')
    ws = null
    clearInterval(pingTimer)
    notifyBackground('WS_STATUS', { connected: false })
    reconnectTimer = setTimeout(connect, nextDelay())
  }

  socket.onerror = () => {
    try { socket.close() } catch (e) {}
  }
}

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
    return true
  }
  return false
}

// Listen for instructions relayed from background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== 'gs-offscreen') return

  if (msg.type === 'SEND_TO_SERVER') {
    const ok = send(msg.payload)
    sendResponse({ ok })
    return true
  }

  if (msg.type === 'FORCE_RECONNECT') {
    reconnectAttempts = 0
    if (ws) { try { ws.close() } catch (e) {} }
    ws = null
    connect()
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'GET_STATUS') {
    sendResponse({ connected: !!ws && ws.readyState === WebSocket.OPEN })
    return true
  }
})

connect()
