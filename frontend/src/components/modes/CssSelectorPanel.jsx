import { useState, useEffect, useRef } from 'react'
import downloadCssSelector from '../../services/downloadCssSelector'
import { downloadCsv, downloadCsvByType } from '../../services/downloadCsv'

export default function CssSelectorPanel({ data, onRelaunch, send, onCategorySelect, extractionOptions, onExtractionOptionsChange, testResults, onTestResultsChange, imageBlobs }) {
  var [customs, setCustoms] = useState([{ id: 'c1', label: '', selector: '' }])
  var [hasExtracted, setHasExtracted] = useState(false)
  var [showWaiting, setShowWaiting] = useState(false)
  var [showCsvMenu, setShowCsvMenu] = useState(false)
  var [downloading, setDownloading] = useState(false)
  var processedRef = useRef(null)
  var waitingRef = useRef(null)
  var csvBtnRef = useRef(null)
  var imageDownloadRef = useRef(false)

  useEffect(function () {
    if (data && processedRef.current !== data) {
      processedRef.current = data
      setHasExtracted(true)
      if (waitingRef.current) clearTimeout(waitingRef.current)
      setShowWaiting(false)
    }
  }, [data])

  useEffect(function () {
    if (!data && hasExtracted) {
      waitingRef.current = setTimeout(function () { setShowWaiting(true) }, 2000)
      return function () { if (waitingRef.current) clearTimeout(waitingRef.current) }
    }
  }, [data, hasExtracted])

  useEffect(function () {
    if (!showCsvMenu) return
    function onMouseDown(e) {
      if (csvBtnRef.current && !csvBtnRef.current.contains(e.target)) {
        setShowCsvMenu(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return function () { document.removeEventListener('mousedown', onMouseDown) }
  }, [showCsvMenu])

  function handleAddCustom() {
    setCustoms(customs.concat([{ id: 'c' + Date.now(), label: '', selector: '' }]))
  }

  function handleCustomChange(id, field, value) {
    setCustoms(customs.map(function (c) {
      if (c.id !== id) return c
      return { ...c, [field]: value }
    }))
    if (field === 'selector' && onTestResultsChange) {
      onTestResultsChange(function (prev) {
        var next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  function handleRemoveCustom(id) {
    setCustoms(customs.filter(function (c) { return c.id !== id }))
  }

  function handleTestSelector(c) {
    if (!c.selector.trim()) return
    send({ type: 'TEST_SELECTOR', selector: c.selector.trim(), testId: c.id })
  }

  function handleExtract() {
    var selectors = customs.filter(function (c) { return c.label.trim() && c.selector.trim() }).map(function (c) {
      return { label: c.label.trim(), selector: c.selector.trim() }
    })
    if (selectors.length === 0) return
    setHasExtracted(false)
    setShowWaiting(false)
    send({ type: 'TRIGGER_EXTRACTION', modeId: 'css-selector', selectors: selectors, options: extractionOptions })
  }

  function getImgItems() {
    if (!data || !data.selectors) return []
    var imgs = []
    data.selectors.forEach(function (sel) {
      sel.items.forEach(function (item) {
        if (item.tag === 'img' && item.attrs && item.attrs.src) {
          imgs.push({ src: item.attrs.src, alt: item.attrs.alt || '' })
        }
      })
    })
    return imgs
  }

  function handleDownload() {
    var imgItems = getImgItems()
    if (imgItems.length > 0 && !imageBlobs) {
      imageDownloadRef.current = true
      setDownloading(true)
      send({ type: 'DOWNLOAD_IMAGES', images: imgItems })
      return
    }
    setDownloading(true)
    downloadCssSelector(data, null, imageBlobs || null).finally(function () { setDownloading(false) })
  }

  useEffect(function () {
    if (imageBlobs && imageDownloadRef.current) {
      imageDownloadRef.current = false
      downloadCssSelector(data, null, imageBlobs).finally(function () { setDownloading(false) })
    }
  }, [imageBlobs])

  var hasValid = customs.some(function (c) { return c.label.trim() && c.selector.trim() })

  if (!hasExtracted) {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-4 py-3 border-b border-surface-700/30">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Sélecteurs personnalisés</h3>
        </div>
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {customs.map(function (c) {
            var testRes = testResults && testResults[c.id]
            return (
              <div key={c.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface-800/40">
                <div className="flex-1 space-y-1.5">
                  <div className="flex gap-1.5">
                    <input type="text" value={c.label}
                      onChange={function (e) { handleCustomChange(c.id, 'label', e.target.value) }}
                      placeholder="Label (ex: Images, Prix)"
                      className="flex-1 text-xs px-2 py-1 rounded bg-surface-700 border border-surface-600 text-surface-200 placeholder-surface-500" />
                    <button onClick={() => handleTestSelector(c)}
                      disabled={!c.selector.trim()}
                      className="text-[10px] px-2 py-1 rounded bg-surface-600 hover:bg-surface-500 text-surface-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                      Tester
                    </button>
                  </div>
                  <input type="text" value={c.selector}
                    onChange={function (e) { handleCustomChange(c.id, 'selector', e.target.value) }}
                    placeholder="Balise ou sélecteur CSS (ex: img, a[href], .prix)"
                    className="w-full text-xs px-2 py-1 rounded bg-surface-700 border border-surface-600 text-surface-200 placeholder-surface-500 font-mono" />
                  {testRes && (
                    <div className={'text-[10px] ' + (testRes.count > 0 ? 'text-green-400' : 'text-red-400')}>
                      {testRes.count > 0
                        ? '\u2713 ' + testRes.count + ' \u00e9l\u00e9ment' + (testRes.count > 1 ? 's' : '') + ' \u00b7 ex: ' + testRes.preview.slice(0, 2).map(function (p) { return p.text.slice(0, 30) }).join(', ')
                        : '\u2717 0 \u00e9l\u00e9ment'}
                    </div>
                  )}
                </div>
                <button onClick={() => handleRemoveCustom(c.id)}
                  className="text-surface-500 hover:text-red-400 transition-colors mt-1 flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        <div className="p-3 border-t border-surface-700/30 space-y-2">
          <button onClick={handleAddCustom}
            className="w-full text-xs px-3 py-2 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors">
            + Ajouter un sélecteur
          </button>
          <button onClick={handleExtract}
            disabled={!hasValid}
            className="w-full text-xs px-3 py-2 rounded bg-accent hover:bg-accent-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Lancer l'extraction
          </button>
        </div>
      </div>
    )
  }

  if (!data && showWaiting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs text-surface-300 font-medium">Extraction en cours...</p>
        <button onClick={onRelaunch}
          className="mt-4 text-[10px] px-3 py-1.5 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors">
          Relancer
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-xs text-surface-400">Extraction en cours...</p>
      </div>
    )
  }

  var results = data.selectors || []

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 py-3 border-b border-surface-700/30">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Résultats</h3>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={handleDownload}
              disabled={downloading}
              className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {downloading ? 'Préparation...' : 'Télécharger (zip)'}
            </button>
            <div className="relative" ref={csvBtnRef}>
              <button onClick={function () { setShowCsvMenu(!showCsvMenu) }}
                className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors">
                CSV ▾
              </button>
              {showCsvMenu && (
                <div className="absolute bottom-full mb-1 left-0 bg-surface-800 border border-surface-700/50 rounded-lg overflow-hidden shadow-lg z-10 min-w-[120px]">
                  {results.map(function (r) {
                    return (
                      <button key={r.selector} onClick={function () {
                        setShowCsvMenu(false)
                        if (r.items && r.items.length > 0) {
                          var items = r.items.map(function (item) {
                            if (item.tag === 'img') {
                              return { src: item.attrs && item.attrs.src, alt: item.attrs && item.attrs.alt || item.text }
                            }
                            return { text: item.text, html: item.html, href: item.href, tag: item.tag }
                          })
                          downloadCsvByType(items, r.label || r.selector)
                        }
                      }}
                        className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                        {r.label || r.selector}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <button onClick={function () { setHasExtracted(false); setShowWaiting(false) }}
              className="text-[10px] px-2 py-1 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors">
              Nouvelle extraction
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {results.map(function (r) {
          return (
            <Section key={r.selector} title={r.label} count={r.count}
              onClick={function () {
                if (onCategorySelect) onCategorySelect({ type: 'css-selector', data: r })
              }} />
          )
        })}
        {results.length === 0 && (
          <p className="text-xs text-surface-500 text-center py-8">Aucun résultat trouvé pour les sélecteurs demandés.</p>
        )}
      </div>
    </div>
  )
}

function ExtractionOptions({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-surface-700/30 bg-surface-800/20">
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-surface-500">Attente</label>
        <input type="number" min="0" max="10" value={value.delay}
          onChange={function (e) { onChange({ ...value, delay: Math.max(0, Math.min(10, Number(e.target.value))) }) }}
          className="w-12 text-[10px] px-1.5 py-0.5 rounded bg-surface-700 border border-surface-600 text-surface-200 text-center" />
        <span className="text-[9px] text-surface-600">s</span>
      </div>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={value.scroll}
          onChange={function (e) { onChange({ ...value, scroll: e.target.checked }) }}
          className="w-3 h-3 rounded border-surface-600 bg-surface-700 accent-accent" />
        <span className="text-[10px] text-surface-500">Défiler</span>
      </label>
    </div>
  )
}

function Section({ title, count, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-800/40 hover:bg-surface-700/30 transition-colors text-left border border-surface-700/30"
    >
      <span className="text-xs font-medium text-surface-300">
        {title} <span className="text-surface-500">({count})</span>
      </span>
      <svg className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}