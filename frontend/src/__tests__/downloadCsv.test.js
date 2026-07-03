import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadCsv, downloadCsvByType } from '../services/downloadCsv'

// mock de saveOrDownload pour éviter de déclencher un vrai téléchargement
vi.mock('../services/downloadScrape', function () {
  return {
    saveOrDownload: vi.fn(function (blobPromise, name, mimeType) {
      return blobPromise.then(function (blob) { return { blob: blob, name: name, mimeType: mimeType } })
    }),
  }
})

describe('downloadCsv', () => {
  it('should generate CSV with headers', async () => {
    var items = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]
    var result = await downloadCsv(items, 'test.csv')
    var text = await result.blob.text()
    expect(text).toContain('name')
    expect(text).toContain('age')
    expect(text).toContain('Alice')
    expect(text).toContain('Bob')
  })

  it('should escape commas in values', async () => {
    var items = [
      { text: 'hello, world' },
    ]
    var result = await downloadCsv(items, 'test.csv')
    var text = await result.blob.text()
    expect(text).toContain('"hello, world"')
  })

  it('should escape double quotes', async () => {
    var items = [
      { text: 'say "hello"' },
    ]
    var result = await downloadCsv(items, 'test.csv')
    var text = await result.blob.text()
    expect(text).toContain('""')
  })

  it('should return empty if items is empty', async () => {
    var result = await downloadCsv([], 'empty.csv')
    expect(result).toBeUndefined()
  })

  it('should handle null values', async () => {
    var items = [
      { name: 'Alice', age: null },
    ]
    var result = await downloadCsv(items, 'test.csv')
    var text = await result.blob.text()
    expect(text).toContain('Alice')
  })
})

describe('downloadCsvByType', () => {
  it('should generate filename from type label', async () => {
    var items = [{ src: 'http://example.com/img.jpg', alt: 'test' }]
    var result = await downloadCsvByType(items, 'Images')
    expect(result.name).toContain('images')
    expect(result.name).toContain('.csv')
  })
})
