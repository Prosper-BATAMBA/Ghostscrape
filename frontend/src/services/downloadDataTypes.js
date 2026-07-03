import JSZip from 'jszip'
import { saveOrDownload } from './downloadScrape'

function pad(n) {
  return String(n).padStart(3, '0')
}

function dateStr() {
  return new Date().toISOString().slice(0, 10)
}

function hostFromUrl(url) {
  try { return new URL(url).hostname } catch (e) { return 'unknown' }
}

export default function downloadDataTypes(data, imageBlobs) {
  if (!data || !data.url) return Promise.resolve()
  var base = 'extraction-' + hostFromUrl(data.url) + '-' + dateStr()
  var zip = new JSZip()

  zip.file(base + '/metadata.json', JSON.stringify({
    url: data.url,
    title: data.title,
    date: dateStr(),
    types: Object.keys(data).filter(function (k) { return k !== 'url' && k !== 'title' }),
  }, null, 2))

  if (data.images && data.images.length > 0) {
    var imagesDir = base + '/images'
    zip.file(imagesDir + '/images.json', JSON.stringify(data.images, null, 2))
    if (imageBlobs && Object.keys(imageBlobs).length > 0) {
      Object.entries(imageBlobs).forEach(function (_ref) {
        var name = _ref[0], b64 = _ref[1]
        zip.file(imagesDir + '/' + name, b64, { base64: true })
      })
    } else {
      data.images.forEach(function (img, i) {
        zip.file(imagesDir + '/image-' + pad(i + 1) + '.url.txt', img.src)
      })
    }
  }

  if (data.headings) {
    var headingsDir = base + '/headings'
    Object.entries(data.headings).forEach(function (_ref) {
      var tag = _ref[0], items = _ref[1]
      items.forEach(function (text, i) {
        zip.file(headingsDir + '/' + tag + '-' + pad(i + 1) + '.txt', text)
      })
    })
  }

  if (data.links && data.links.length > 0) {
    var linksDir = base + '/links'
    zip.file(linksDir + '/links.json', JSON.stringify(data.links, null, 2))
    var linksText = data.links.map(function (l, i) {
      return (i + 1) + '. ' + (l.text || '(no text)') + '\n   ' + l.href + ' [' + (l.isInternal ? 'INT' : 'EXT') + ']'
    }).join('\n\n')
    zip.file(linksDir + '/links.txt', linksText)
  }

  if (data.paragraphs && data.paragraphs.length > 0) {
    var parasDir = base + '/paragraphs'
    data.paragraphs.forEach(function (p, i) {
      zip.file(parasDir + '/p-' + pad(i + 1) + '.txt', p)
    })
  }

  if (data.lists && data.lists.length > 0) {
    var listsDir = base + '/lists'
    data.lists.forEach(function (list, i) {
      var text = '<' + list.type + '>\n' + list.items.map(function (item) { return '  - ' + item }).join('\n')
      zip.file(listsDir + '/list-' + pad(i + 1) + '.txt', text)
    })
    zip.file(listsDir + '/lists.json', JSON.stringify(data.lists, null, 2))
  }

  if (data.tables && data.tables.length > 0) {
    var tablesDir = base + '/tables'
    data.tables.forEach(function (table, i) {
      var lines = []
      if (table.caption) lines.push('Caption: ' + table.caption)
      if (table.headers.length > 0) lines.push('Headers: ' + table.headers.join(' | '))
      lines.push('Rows: ' + table.rows.length)
      table.rows.slice(0, 10).forEach(function (row) {
        lines.push('  ' + row.join(' | '))
      })
      if (table.rows.length > 10) lines.push('  ... (' + (table.rows.length - 10) + ' more rows)')
      zip.file(tablesDir + '/table-' + pad(i + 1) + '.txt', lines.join('\n'))
    })
    zip.file(tablesDir + '/tables.json', JSON.stringify(data.tables, null, 2))
  }

  if (data.metadata) {
    var metaDir = base + '/metadata'
    zip.file(metaDir + '/metadata.json', JSON.stringify(data.metadata, null, 2))
    var metaText = ''
    if (data.metadata.title) metaText += 'Title: ' + data.metadata.title + '\n'
    if (data.metadata.description) metaText += 'Description: ' + data.metadata.description + '\n'
    if (data.metadata.keywords) metaText += 'Keywords: ' + data.metadata.keywords + '\n'
    if (data.metadata.og) {
      metaText += '\nOpen Graph:\n'
      Object.entries(data.metadata.og).forEach(function (_ref) {
        var k = _ref[0], v = _ref[1]
        metaText += '  ' + k + ': ' + v + '\n'
      })
    }
    if (data.metadata.twitter) {
      metaText += '\nTwitter:\n'
      Object.entries(data.metadata.twitter).forEach(function (_ref) {
        var k = _ref[0], v = _ref[1]
        metaText += '  ' + k + ': ' + v + '\n'
      })
    }
    if (metaText) zip.file(metaDir + '/metadata.txt', metaText.trim())
  }

  if (data.structured && data.structured.length > 0) {
    var structDir = base + '/structured-data'
    data.structured.forEach(function (item, i) {
      zip.file(structDir + '/item-' + pad(i + 1) + '.json', JSON.stringify(item, null, 2))
    })
  }

  return saveOrDownload(zip.generateAsync({ type: 'blob' }), base + '.zip', 'application/zip')
}
