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

export default function downloadCssSelector(data, url, imageBlobs) {
  if (!data || !data.selectors || data.selectors.length === 0) return Promise.resolve()
  var base = 'css-selectors-' + hostFromUrl(url || location.href) + '-' + dateStr()
  var zip = new JSZip()
  var blobNames = imageBlobs ? Object.keys(imageBlobs) : []
  var blobIndex = 0

  data.selectors.forEach(function (sel) {
    var dir = base + '/' + (sel.label || sel.selector).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'selector-' + pad(i + 1)

    zip.file(dir + '/info.json', JSON.stringify({
      label: sel.label,
      selector: sel.selector,
      count: sel.count,
    }, null, 2))

    sel.items.forEach(function (item, j) {
      var itemDir = dir + '/item-' + pad(j + 1)
      if (item.text) zip.file(itemDir + '/text.txt', item.text)
      if (item.html) zip.file(itemDir + '/html.html', item.html)
      if (item.attrs && Object.keys(item.attrs).length > 0) {
        zip.file(itemDir + '/attrs.json', JSON.stringify(item.attrs, null, 2))
      }
      if (item.tag === 'img' && item.attrs && item.attrs.src && blobIndex < blobNames.length) {
        zip.file(itemDir + '/' + blobNames[blobIndex], imageBlobs[blobNames[blobIndex]], { base64: true })
        blobIndex++
      }
    })
  })

  return saveOrDownload(zip.generateAsync({ type: 'blob' }), base + '.zip', 'application/zip')
}