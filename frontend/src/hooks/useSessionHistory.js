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

export default function useSessionHistory() {
  var [sessions, setSessions] = useState(loadSessions)

  useEffect(function () {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)) } catch (e) { /* quota exceeded */ }
  }, [sessions])

  function addSession(modeId, data) {
    setSessions(function (prev) {
      var next = prev.concat([{
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        modeId: modeId,
        url: data.url || '',
        title: data.title || '',
        timestamp: Date.now(),
        data: stripImages(data),
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

var IMAGE_ALLOWED_KEYS = ['src', 'alt', 'width', 'height', 'type', 'tag', 'html', 'attrs']

function stripImages(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(stripImages)
  var clone = {}
  for (var key in obj) {
    if (key === 'images' && Array.isArray(obj[key])) {
      clone[key] = obj[key].map(function (img) {
        var copy = {}
        IMAGE_ALLOWED_KEYS.forEach(function (k) {
          if (img[k] !== undefined) copy[k] = img[k]
        })
        return copy
      })
    } else if (key === 'imageBlobs') {
      continue
    } else {
      clone[key] = stripImages(obj[key])
    }
  }
  return clone
}
