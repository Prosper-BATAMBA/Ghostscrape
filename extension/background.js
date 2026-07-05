// background.js (MV3 service worker)
// This worker can be suspended by Chrome at any time after ~30s idle.
// It must NOT own the WebSocket. All persistent-connection logic lives in
// offscreen.js, running inside a chrome.offscreen document (a real DOM
// context that Chrome does not suspend the way it suspends this worker).
//
// background.js's job: keep an offscreen document alive, relay messages
// between content scripts (chrome.runtime.connect ports) and the offscreen
// document (chrome.runtime.sendMessage), and hold the small bits of state
// that need to survive a SW restart via chrome.storage.session.

const OFFSCREEN_URL = 'offscreen.html'

let contentPorts = {}
let pendingQueue = []
let activeMode = null
let dashboardTabId = null
let wsConnected = false
let currentSessionId = null

let creatingOffscreen = null // promise guard against parallel createDocument calls

// ---------------------------------------------------------------------
// Offscreen document lifecycle
// ---------------------------------------------------------------------

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  })
  return contexts.length > 0
}

// Chrome's offscreen API requires a "reason" enum. WebSocket-keepalive isn't
// its own reason, so we use a stable generic one. This is a documented
// pattern for persistent-connection use cases.
const OFFSCREEN_REASON = (function () {
  var reasons = chrome.offscreen.Reason
  var preferred = [
    reasons.WEB_RTC,
    reasons.BLOBS,
    reasons.DOM_PARSER,
    reasons.WORKER,
  ]
  for (var i = 0; i < preferred.length; i++) {
    if (preferred[i]) return preferred[i]
  }
  return 'WEB_RTC'
})()

async function ensureOffscreen() {
  if (await hasOffscreenDocument()) return
  if (creatingOffscreen) { await creatingOffscreen; return }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [OFFSCREEN_REASON],
    justification: 'Maintain a persistent WebSocket connection to the GhostScrape backend',
  }).catch((e) => {
    if (!String(e).includes('Only a single offscreen')) {
      console.error('[GS BG] Failed to create offscreen document:', e)
    }
  })

  try { await creatingOffscreen } finally { creatingOffscreen = null }
}

function sendToOffscreen(msg) {
  return chrome.runtime.sendMessage({ target: 'gs-offscreen', ...msg }).catch((e) => {
    console.warn('[GS BG] sendToOffscreen failed (offscreen not ready yet):', e.message)
  })
}

async function sendToServer(data) {
  await ensureOffscreen()
  await sendToOffscreen({ type: 'SEND_TO_SERVER', payload: data })
}

// ---------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------

function setBadge(connected) {
  const color = connected ? '#22c55e' : '#ef4444'
  const text = connected ? 'ON' : 'OFF'
  try {
    chrome.action.setBadgeBackgroundColor({ color })
    chrome.action.setBadgeText({ text })
  } catch (e) {}
}

// ---------------------------------------------------------------------
// Content port <-> server message handling
// ---------------------------------------------------------------------

function sendToContentPort(msg) {
  Object.values(contentPorts).forEach(function (port) {
    try { port.postMessage(msg) } catch (e) {
      console.error('[GS BG] Failed to postMessage to port:', e)
    }
  })
}

function handleServerMessage(msg) {
  if (msg._session_id) {
    currentSessionId = msg._session_id
  }
  console.log('[GS BG] Server msg:', msg.type, 'ports:', Object.keys(contentPorts).length)

  if (msg.type === 'NAVIGATE_TO') {
    var oldTabId = dashboardTabId
    chrome.tabs.create({ url: msg.url, active: true }, function (tab) {
      dashboardTabId = tab.id
    })
    if (oldTabId) {
      chrome.tabs.remove(oldTabId).catch(() => {})
    }
    return
  }

  if (msg.type === 'ACTIVATE_MODE') {
    activeMode = { modeId: msg.modeId, capabilities: msg.capabilities, options: msg.options || {} }
    console.log('[GS BG] Mode activated:', activeMode.modeId)
    if (msg.capabilities.autoExtract !== false && Object.keys(contentPorts).length > 0) {
      sendToContentPort({ type: 'TRIGGER_EXTRACTION', modeId: msg.modeId, options: activeMode.options })
    }
    return
  }

  if (msg.type === 'DEACTIVATE_MODE') {
    activeMode = null
    console.log('[GS BG] Mode deactivated')
    return
  }

  var portCount = Object.keys(contentPorts).length
  if (portCount === 0) {
    console.warn('[GS BG] No content ports, queueing message:', msg.type)
    pendingQueue.push(msg)
    return
  }

  if (pendingQueue.length > 0) {
    console.log('[GS BG] flushing', pendingQueue.length, 'queued messages')
    var toFlush = pendingQueue.slice()
    pendingQueue = []
    toFlush.forEach(function (queued) {
      sendToContentPort(queued)
    })
  }

  sendToContentPort(msg)
}

// ---------------------------------------------------------------------
// Messages coming FROM the offscreen document
// ---------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.source === 'gs-offscreen') {
    if (msg.type === 'WS_STATUS') {
      wsConnected = msg.connected
      setBadge(wsConnected)
      console.log('[GS BG] WS status from offscreen:', wsConnected)
    }
    if (msg.type === 'WS_MESSAGE') {
      handleServerMessage(msg.payload)
    }
    return
  }

  // Messages from popup / dashboard via window.postMessage bridge, if any
  if (msg.type === 'GET_SERVER_URL') {
    sendResponse({ url: 'wss://ghostscrape.onrender.com/ws/extension' })
    return
  }

  if (msg.type === 'CONNECTION_STATUS') {
    sendResponse({ connected: wsConnected, tabCount: Object.keys(contentPorts).length })
    return
  }

  if (msg.type === 'RECONNECT') {
    ensureOffscreen().then(() => sendToOffscreen({ type: 'FORCE_RECONNECT' }))
    sendResponse({ success: true })
    return
  }
})

// ---------------------------------------------------------------------
// Content script ports (unchanged contract — content.js doesn't need edits)
// ---------------------------------------------------------------------

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'gs-content') return

  const tabId = port.sender.tab ? port.sender.tab.id : 'unknown'
  contentPorts[tabId] = port
  console.log('[GS BG] content port connected for tab:', tabId, 'total ports:', Object.keys(contentPorts).length)

  ensureOffscreen()

  if (pendingQueue.length > 0) {
    console.log('[GS BG] replaying', pendingQueue.length, 'queued messages to new port')
    var toReplay = pendingQueue.slice()
    pendingQueue = []
    toReplay.forEach(function (queued) {
      try { port.postMessage(queued) } catch (e) {
        console.error('[GS BG] failed to replay queued message:', e)
      }
    })
  }

  if (activeMode && activeMode.capabilities.autoExtract !== false) {
    console.log('[GS BG] auto-triggering extraction for active mode:', activeMode.modeId)
    try { port.postMessage({ type: 'TRIGGER_EXTRACTION', modeId: activeMode.modeId, options: activeMode.options || {} }) } catch (e) {
      console.error('[GS BG] failed to auto-trigger extraction:', e)
    }
  }

  port.onMessage.addListener((msg) => {
    if (currentSessionId) {
      msg._session_id = currentSessionId
    }
    sendToServer(msg)
  })

  port.onDisconnect.addListener(() => {
    console.log('[GS BG] content port disconnected for tab:', tabId)
    delete contentPorts[tabId]
  })
})

chrome.tabs.onRemoved.addListener(function (tabId) {
  if (tabId === dashboardTabId) {
    dashboardTabId = null
  }
})

// ---------------------------------------------------------------------
// Keepalive alarm
// ---------------------------------------------------------------------
// Chrome enforces a 1-minute floor on alarm periods in production (the
// previous 0.5-minute period silently got clamped to 1 minute, which is
// what caused the long stall before reconnection attempts resumed).
// This alarm is now just a periodic safety net to make sure the offscreen
// document exists and to nudge the SW awake — actual reconnection logic
// and its fast backoff lives entirely in offscreen.js.

chrome.alarms.create('gs-keepalive', { periodInMinutes: 1 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'gs-keepalive') {
    ensureOffscreen()
  }
})

// ---------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------

chrome.runtime.onStartup.addListener(() => ensureOffscreen())
chrome.runtime.onInstalled.addListener(() => ensureOffscreen())

// The SW can be re-spawned at any time (e.g. after being killed and woken
// by an event); always make sure the offscreen document is up when this
// script runs.
ensureOffscreen()
