import { describe, it, expect, vi } from 'vitest'
import messageRouter from '../services/messageRouter'

describe('messageRouter', () => {
  it('should filter out GS_READY messages', () => {
    var engine = { handleMessage: vi.fn() }
    messageRouter({ type: 'GS_READY', url: 'http://example.com' }, engine)
    expect(engine.handleMessage).not.toHaveBeenCalled()
  })

  it('should filter out EXTENSION_CONNECTED messages', () => {
    var engine = { handleMessage: vi.fn() }
    messageRouter({ type: 'EXTENSION_CONNECTED' }, engine)
    expect(engine.handleMessage).not.toHaveBeenCalled()
  })

  it('should filter out EXTENSION_DISCONNECTED messages', () => {
    var engine = { handleMessage: vi.fn() }
    messageRouter({ type: 'EXTENSION_DISCONNECTED' }, engine)
    expect(engine.handleMessage).not.toHaveBeenCalled()
  })

  it('should filter out PING messages', () => {
    var engine = { handleMessage: vi.fn() }
    messageRouter({ type: 'PING' }, engine)
    expect(engine.handleMessage).not.toHaveBeenCalled()
  })

  it('should filter out PONG messages', () => {
    var engine = { handleMessage: vi.fn() }
    messageRouter({ type: 'PONG' }, engine)
    expect(engine.handleMessage).not.toHaveBeenCalled()
  })

  it('should pass through EXTRACTION_RESULT messages', () => {
    var engine = { handleMessage: vi.fn() }
    var msg = { type: 'EXTRACTION_RESULT', modeId: 'full-page', data: {} }
    messageRouter(msg, engine)
    expect(engine.handleMessage).toHaveBeenCalledWith(msg)
  })

  it('should pass through SELECTOR_TEST_RESULT messages', () => {
    var engine = { handleMessage: vi.fn() }
    var msg = { type: 'SELECTOR_TEST_RESULT', testId: 't1', count: 5, preview: [], selector: 'img' }
    messageRouter(msg, engine)
    expect(engine.handleMessage).toHaveBeenCalledWith(msg)
  })

  it('should pass through unknown message types', () => {
    var engine = { handleMessage: vi.fn() }
    var msg = { type: 'UNKNOWN_TYPE', someField: 'value' }
    messageRouter(msg, engine)
    expect(engine.handleMessage).toHaveBeenCalledWith(msg)
  })
})
