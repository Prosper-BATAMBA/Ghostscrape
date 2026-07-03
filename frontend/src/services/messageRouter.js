var FILTERED_TYPES = {
  GS_READY: true, NAVIGATE: true,
  EXTENSION_CONNECTED: true, EXTENSION_DISCONNECTED: true,
  PING: true, PONG: true,
}

export default function messageRouter(msg, engine) {
  if (FILTERED_TYPES[msg.type]) return
  engine.handleMessage(msg)
}
