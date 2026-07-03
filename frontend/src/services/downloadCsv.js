import { saveOrDownload } from './downloadScrape'

export function downloadCsv(items, filename) {
  if (!items || items.length === 0) return Promise.resolve()

  var headers = Object.keys(items[0])
  var rows = items.map(function (item) {
    return headers.map(function (h) {
      var val = item[h]
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val)
      return '"' + String(val || '').replace(/"/g, '""') + '"'
    }).join(',')
  })

  var csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n')
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  var name = filename || 'export.csv'

  return saveOrDownload(Promise.resolve(blob), name, 'text/csv')
}

export function downloadCsvByType(items, typeLabel) {
  if (!items || items.length === 0) return Promise.resolve()

  var base = typeLabel.toLowerCase().replace(/\s+/g, '-')
  var date = new Date().toISOString().slice(0, 10)
  return downloadCsv(items, base + '-' + date + '.csv')
}
