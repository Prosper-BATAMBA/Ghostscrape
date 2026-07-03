import { describe, it, expect } from 'vitest'
import { MODE_CARDS } from '../services/modeRegistry'

describe('modeRegistry', () => {
  it('should define exactly 3 modes', () => {
    expect(MODE_CARDS).toHaveLength(3)
  })

  it('should have unique mode ids', () => {
    var ids = MODE_CARDS.map(function (m) { return m.id })
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have a full-page mode with autoExtract', () => {
    var mode = MODE_CARDS.find(function (m) { return m.id === 'full-page' })
    expect(mode).toBeDefined()
    expect(mode.capabilities.autoExtract).toBe(true)
  })

  it('should have a data-types mode without autoExtract', () => {
    var mode = MODE_CARDS.find(function (m) { return m.id === 'data-types' })
    expect(mode).toBeDefined()
    expect(mode.capabilities.autoExtract).toBe(false)
  })

  it('should have a css-selector mode without autoExtract', () => {
    var mode = MODE_CARDS.find(function (m) { return m.id === 'css-selector' })
    expect(mode).toBeDefined()
    expect(mode.capabilities.autoExtract).toBe(false)
  })

  it('each mode should have required fields', () => {
    MODE_CARDS.forEach(function (mode) {
      expect(mode).toHaveProperty('id')
      expect(mode).toHaveProperty('name')
      expect(mode).toHaveProperty('description')
      expect(mode).toHaveProperty('icon')
      expect(mode).toHaveProperty('type')
      expect(mode).toHaveProperty('capabilities')
    })
  })
})
