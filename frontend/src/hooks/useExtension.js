import { useEffect, useRef, useState, useCallback } from 'react'

var WS_URL = 'ws://localhost:8000/ws/dashboard'
var RECONNECT_BASE = 500
var RECONNECT_MAX = 5000
var PING_INTERVAL = 20000

export default function useExtension() {
  var [isConnected, setIsConnected] = useState(false)
  var [wsConnected, setWsConnected] = useState(false)
  var [lastMessage, setLastMessage] = useState(null)
  var wsRef = useRef(null)
  var genRef = useRef(0)
  var attemptsRef = useRef(0)
  var connectFnRef = useRef(null)

  useEffect(function () {
    var reconnectTimer = null
    var pingTimer = null
    var mountTimer = null

    function connect() {
      var gen = ++genRef.current

      var existing = wsRef.current
      if (existing) {
        if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
          return
        }
        existing.onclose = null
        existing.onmessage = null
        existing.onerror = null
        try { existing.close() } catch (e) {}
        wsRef.current = null
      }

      var ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = function () {
        if (gen !== genRef.current) { ws.close(); return }
        attemptsRef.current = 0
        setWsConnected(true)
        pingTimer = setInterval(function () {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }))
          }
        }, PING_INTERVAL)
      }

      ws.onclose = function () {
        if (gen !== genRef.current) return
        setWsConnected(false)
        setIsConnected(false)
        clearInterval(pingTimer)
        wsRef.current = null
        clearTimeout(reconnectTimer)
        var delay = Math.min(RECONNECT_BASE * Math.pow(2, attemptsRef.current), RECONNECT_MAX)
        delay = Math.round(delay * (0.5 + Math.random() * 0.5))
        attemptsRef.current++
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onmessage = function (event) {
        if (gen !== genRef.current) return
        try {
          var msg = JSON.parse(event.data)
          if (msg.type === 'EXTENSION_CONNECTED') {
            setIsConnected(true)
          } else if (msg.type === 'EXTENSION_DISCONNECTED') {
            setIsConnected(false)
          } else if (msg.type !== 'PING' && msg.type !== 'PONG') {
            setLastMessage(msg)
          }
        } catch (e) {}
      }

      ws.onerror = function () {
        ws.close()
      }
    }

    connectFnRef.current = connect
    mountTimer = setTimeout(connect, 0)

    return function () {
      connectFnRef.current = null
      clearTimeout(mountTimer)
      clearTimeout(reconnectTimer)
      clearInterval(pingTimer)
      var ws = wsRef.current
      if (ws) {
        ws.onclose = null
        ws.onmessage = null
        ws.onerror = null
        ws.close()
        wsRef.current = null
      }
    }
  }, [])

  var send = useCallback(function (msg) {
    var ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }, [])

  var reconnectNow = useCallback(function () {
    var ws = wsRef.current
    if (ws) {
      ws.onclose = null
      ws.onmessage = null
      ws.onerror = null
      ws.close()
      wsRef.current = null
    }
    attemptsRef.current = 0
    if (connectFnRef.current) connectFnRef.current()
  }, [])

  return { isConnected, wsConnected, lastMessage, send, reconnectNow }
}
