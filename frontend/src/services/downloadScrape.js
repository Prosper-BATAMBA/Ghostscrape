import JSZip from 'jszip'

function pad(n) {
  return String(n).padStart(3, '0')
}

function dateStr() {
  return new Date().toISOString().slice(0, 10)
}

function hostFromUrl(url) {
  try { return new URL(url).hostname } catch (e) { return 'unknown' }
}

function linksAsText(links) {
  if (!links || !links.length) return ''
  return links.map(function (l, i) {
    return (i + 1) + '. ' + (l.text || '(no text)') + '\n   ' + l.href + '\n'
  }).join('\n')
}

function fallbackDownload(blob, name) {
  var url = URL.createObjectURL(blob)
  var a = document.createElement('a')
  a.href = url
  a.download = name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(function () { URL.revokeObjectURL(url) }, 10000)
}

export function saveOrDownload(blobPromise, suggestedName, mimeType) {
  var ext = suggestedName.endsWith('.json') ? '.json' : '.zip'
  var types = [{
    description: ext === '.json' ? 'JSON' : 'Archive ZIP',
    accept: { [mimeType]: [ext] },
  }]

  if (window.showSaveFilePicker) {
    try {
      var picker = window.showSaveFilePicker({ suggestedName: suggestedName, types: types })
      var chain = picker.then(function (handle) {
        return blobPromise.then(function (blob) {
          return handle.createWritable().then(function (writable) {
            return writable.write(blob).then(function () { return writable.close() })
          })
        })
      })
      chain.catch(function (e) {
        if (e.name === 'AbortError') return
        console.error('[GS] Save picker failed:', e)
        blobPromise.then(function (blob) { fallbackDownload(blob, suggestedName) })
      })
      return chain
    } catch (e) {
      console.error('[GS] Save picker not available in this context:', e)
      return blobPromise.then(function (blob) { fallbackDownload(blob, suggestedName) })
    }
  }

  console.log('[GS] showSaveFilePicker not supported, using fallback download')
  return blobPromise.then(function (blob) { fallbackDownload(blob, suggestedName) })
}

export function downloadTextZip(data) {
  var base = 'scraping-' + hostFromUrl(data.url) + '-' + dateStr()
  var zip = new JSZip()

  zip.file(base + '/metadata.json', JSON.stringify({
    url: data.url, title: data.title, date: dateStr(),
  }, null, 2))

  if (data.title) zip.file(base + '/texts/title.txt', data.title)
  if (data.metaDescription) zip.file(base + '/texts/meta-description.txt', data.metaDescription)

  if (data.headings) {
    Object.entries(data.headings).forEach(function (_ref) {
      var tag = _ref[0], items = _ref[1]
      items.forEach(function (text, i) {
        zip.file(base + '/texts/headings/' + tag + '-' + pad(i + 1) + '.txt', text)
      })
    })
  }

  if (data.paragraphs) {
    data.paragraphs.forEach(function (p, i) {
      zip.file(base + '/texts/paragraphs/p-' + pad(i + 1) + '.txt', p)
    })
  }

  if (data.links && data.links.length) {
    zip.file(base + '/links/links.json', JSON.stringify(data.links, null, 2))
    zip.file(base + '/links/links.txt', linksAsText(data.links))
  }

  return saveOrDownload(zip.generateAsync({ type: 'blob' }), base + '.zip', 'application/zip')
}

export function downloadImagesZip(data, imageBlobs) {
  if (!imageBlobs || !Object.keys(imageBlobs).length) return Promise.resolve()
  var base = 'images-' + hostFromUrl(data.url) + '-' + dateStr()
  var zip = new JSZip()

  Object.entries(imageBlobs).forEach(function (_ref) {
    var name = _ref[0], b64 = _ref[1]
    zip.file(base + '/' + name, b64, { base64: true })
  })

  return saveOrDownload(zip.generateAsync({ type: 'blob' }), base + '.zip', 'application/zip')
}

export function downloadHtmlFile(html) {
  var base = 'page-' + dateStr()
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  return saveOrDownload(Promise.resolve(blob), base + '.html', 'text/html')
}
