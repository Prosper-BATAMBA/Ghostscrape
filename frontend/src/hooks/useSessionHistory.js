import { useState, useEffect } from 'react'

var STORAGE_KEY = 'ghostscrape_history'
var MAX_SESSIONS = 20

function loadSessions() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore corrupted data */ }
  return []
}

function saveSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    return true
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      return false
    }
    return true
  }
}

export default function useSessionHistory() {
  var [sessions, setSessions] = useState(loadSessions)

  useEffect(function () {
    var current = sessions
    while (!saveSessions(current) && current.length > 0) {
      current = current.slice(1)
    }
    if (current !== sessions) {
      setSessions(current)
    }
  }, [sessions])

  function addSession(modeId, data) {
    setSessions(function (prev) {
      var next = prev.concat([{
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        modeId: modeId,
        url: data.url || '',
        title: data.title || '',
        timestamp: Date.now(),
        data: compressData(data),
      }])
      return next.slice(-MAX_SESSIONS)
    })
  }

  function deleteSession(id) {
    setSessions(function (prev) { return prev.filter(function (s) { return s.id !== id }) })
  }

  function clearHistory() {
    setSessions([])
  }

  function loadSession(id) {
    return sessions.find(function (s) { return s.id === id }) || null
  }

  return { sessions, addSession, deleteSession, clearHistory, loadSession }
}

function compressData(obj, depth) {
  depth = depth || 0
  if (depth > 10) return undefined
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    var arr = []
    for (var i = 0; i < obj.length; i++) {
      if (i >= 200) break
      var item = compressData(obj[i], depth + 1)
      if (item !== undefined) arr.push(item)
    }
    return arr
  }
  var clone = {}
  for (var key in obj) {
    if (key === 'imageBlobs') continue
    if (key === 'images' && Array.isArray(obj[key])) {
      clone[key] = obj[key].slice(0, 50).map(function (img) {
        return { src: img.src, alt: img.alt || '', width: img.width, height: img.height, type: img.type }
      })
      continue
    }
    if (key === 'html') continue
    if (key === 'attrs' && typeof obj[key] === 'object') {
      var attrs = {}
      var count = 0
      for (var k in obj[key]) {
        if (count >= 10) break
        attrs[k] = String(obj[key][k]).slice(0, 100)
        count++
      }
      clone[key] = attrs
      continue
    }
    if (typeof obj[key] === 'string' && obj[key].length > 500) {
      clone[key] = obj[key].slice(0, 500)
      continue
    }
    clone[key] = compressData(obj[key], depth + 1)
    if (clone[key] === undefined) delete clone[key]
  }
  return clone
}
