import { useState, useEffect, useRef } from 'react'
import downloadCssSelector from '../../services/downloadCssSelector'
import { downloadCsv, downloadCsvByType } from '../../services/downloadCsv'

export default function CssSelectorPanel({ data, onRelaunch, onCancel, send, onCategorySelect, extractionOptions, onExtractionOptionsChange, testResults, onTestResultsChange, imageBlobs, extractionState, onTriggerExtraction }) {
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
    if (!data && hasExtracted && extractionState !== 'extracting') {
      waitingRef.current = setTimeout(function () { setShowWaiting(true) }, 2000)
      return function () { if (waitingRef.current) clearTimeout(waitingRef.current) }
    }
  }, [data, hasExtracted, extractionState])

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
    if (onTriggerExtraction) {
      onTriggerExtraction({ modeId: 'css-selector', selectors: selectors, options: extractionOptions })
    } else {
      send({ type: 'TRIGGER_EXTRACTION', modeId: 'css-selector', selectors: selectors, options: extractionOptions })
    }
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

  if (extractionState === 'extracting' && !hasExtracted) {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-4 py-3 border-b border-surface-700/30">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Sélecteurs personnalisés</h3>
        </div>
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-xs text-surface-400">Extraction en cours...</p>
          <button onClick={onCancel}
            className="mt-4 text-[10px] px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  if (extractionState === 'cancelled' && !hasExtracted) {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-4 py-3 border-b border-surface-700/30">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Sélecteurs personnalisés</h3>
        </div>
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-xs text-surface-400">Extraction annulée</p>
        </div>
      </div>
    )
  }

  if (extractionState === 'error' && !hasExtracted) {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-4 py-3 border-b border-surface-700/30">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Sélecteurs personnalisés</h3>
        </div>
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-surface-400">Erreur d'extraction</p>
        </div>
      </div>
    )
  }

  if (!hasExtracted) {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-4 py-3 border-b border-surface-700/30">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Sélecteurs personnalisés</h3>
        </div>
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {customs.map(function (c) {
            var result = testResults ? testResults[c.id] : null
            return (
              <div key={c.id} className="glass-panel p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Label (ex: Titre produit)" value={c.label}
                    onChange={function (e) { handleCustomChange(c.id, 'label', e.target.value) }}
                    className="flex-1 text-[10px] px-2 py-1 rounded bg-surface-700 border border-surface-600 text-surface-200 placeholder:text-surface-500" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input type="text" placeholder="Sélecteur CSS (ex: h1, .price, #main)" value={c.selector}
                      onChange={function (e) { handleCustomChange(c.id, 'selector', e.target.value) }}
                      className="w-full text-[10px] px-2 py-1 rounded bg-surface-700 border border-surface-600 text-surface-300 font-mono placeholder:text-surface-500" />
                  </div>
                  <button
                    onClick={function () { handleTestSelector(c) }}
                    disabled={!c.selector.trim()}
                    className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors disabled:opacity-40"
                  >
                    Tester
                  </button>
                  {customs.length > 1 && (
                    <button
                      onClick={function () { handleRemoveCustom(c.id) }}
                      className="text-[10px] px-1.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {result && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={result.count > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                      {result.count} résultat{result.count > 1 ? 's' : ''}
                    </span>
                    {result.preview && result.preview.length > 0 && (
                      <span className="text-surface-500 truncate max-w-[200px]">
                        «{result.preview[0].text}»
                      </span>
                    )}
                    <span className="text-surface-600">({result.preview[0]?.tag})</span>
                  </div>
                )}
              </div>
            )
          })}
          <button
            onClick={handleAddCustom}
            className="w-full text-[10px] px-3 py-2 rounded-lg border border-dashed border-surface-600 hover:border-surface-500 text-surface-400 hover:text-surface-300 transition-colors"
          >
            + Ajouter un sélecteur
          </button>
        </div>
        <div className="p-3 border-t border-surface-700/30 space-y-2">
          <button
            onClick={handleExtract}
            disabled={!hasValid}
            className="w-full text-xs px-3 py-2 rounded bg-accent hover:bg-accent-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hasValid ? 'Lancer l\'extraction' : 'Ajoutez des sélecteurs'}
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <p className="text-xs text-surface-500">Extraction en cours...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 py-3 border-b border-surface-700/30">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Résultats</h3>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {downloading ? 'Préparation...' : 'Télécharger (zip)'}
            </button>
            <div className="relative" ref={csvBtnRef}>
              <button onClick={function () { setShowCsvMenu(!showCsvMenu) }}
                className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors">
                CSV ▾
              </button>
              {showCsvMenu && (
                <div className="absolute bottom-full mb-1 left-0 bg-surface-800 border border-surface-700/50 rounded-lg overflow-hidden shadow-lg z-10 min-w-[140px]">
                  {data.selectors && data.selectors.length > 0 && (
                    data.selectors.map(function (sel, i) {
                      return (
                        <button key={i}
                          onClick={function () { setShowCsvMenu(false); downloadCsvByType(sel.items, sel.label || sel.selector) }}
                          className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                          {sel.label || sel.selector}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
            <button
              onClick={function () { setHasExtracted(false); onRelaunch() }}
              className="text-[10px] px-2 py-1 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors"
            >
              Nouvelle extraction
            </button>
          </div>
        </div>
      </div>

      {data.selectors && data.selectors.length > 0 && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {data.selectors.map(function (sel, i) {
            return (
              <div key={i} className="glass-panel p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-surface-300">
                    {sel.label || sel.selector}
                  </span>
                  <span className="text-[10px] text-surface-500">
                    {sel.count} résultat{sel.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {sel.items.slice(0, 10).map(function (item, j) {
                    return (
                      <div key={j} className="text-[10px] text-surface-400 truncate">
                        <span className="text-surface-500">&lt;{item.tag}&gt;</span>{' '}
                        {item.text || '(empty)'}
                      </div>
                    )
                  })}
                  {sel.count > 10 && (
                    <div className="text-[10px] text-surface-600">
                      ... et {sel.count - 10} autres
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(!data.selectors || data.selectors.length === 0) && (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-surface-500">Aucun résultat trouvé</p>
        </div>
      )}
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
