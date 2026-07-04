import { useState, useEffect, useRef } from 'react'
import downloadDataTypes from '../../services/downloadDataTypes'
import { downloadCsvByType } from '../../services/downloadCsv'

var DATA_TYPES = [
  { id: 'images', label: 'Images' },
  { id: 'headings', label: 'Titres' },
  { id: 'links', label: 'Liens' },
  { id: 'paragraphs', label: 'Paragraphes' },
  { id: 'lists', label: 'Listes' },
  { id: 'tables', label: 'Tableaux' },
  { id: 'metadata', label: 'Méta-données' },
  { id: 'structured', label: 'Données structurées' },
]

export default function DataTypePanel({ data, send, onCategorySelect, extractionOptions, onExtractionOptionsChange, imageBlobs, onCancel, extractionState, onTriggerExtraction }) {
  var [checked, setChecked] = useState({})
  var [hasExtracted, setHasExtracted] = useState(false)
  var [showCsvMenu, setShowCsvMenu] = useState(false)
  var [downloading, setDownloading] = useState(false)
  var processedRef = useRef(null)
  var csvBtnRef = useRef(null)
  var imageDownloadRef = useRef(false)

  useEffect(function () {
    if (data && processedRef.current !== data) {
      processedRef.current = data
      setHasExtracted(true)
    }
  }, [data])

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

  function handleToggle(id) {
    setChecked(function (prev) {
      var next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        next[id] = true
      }
      return next
    })
  }

  function handleExtract() {
    var types = Object.keys(checked)
    if (types.length === 0) return
    setHasExtracted(false)
    if (onTriggerExtraction) {
      onTriggerExtraction({ modeId: 'data-types', types: types, options: extractionOptions })
    } else {
      send({ type: 'TRIGGER_EXTRACTION', modeId: 'data-types', types: types, options: extractionOptions })
    }
  }

  function handleDownload() {
    var hasImages = data.images && data.images.length > 0
    if (hasImages && !imageBlobs) {
      imageDownloadRef.current = true
      setDownloading(true)
      send({ type: 'DOWNLOAD_IMAGES', images: data.images })
      return
    }
    setDownloading(true)
    downloadDataTypes(data || {}, imageBlobs || null).finally(function () { setDownloading(false) })
  }

  useEffect(function () {
    if (imageBlobs && imageDownloadRef.current) {
      imageDownloadRef.current = false
      downloadDataTypes(data || {}, imageBlobs).finally(function () { setDownloading(false) })
    }
  }, [imageBlobs])

  var checkedCount = Object.keys(checked).length

  var TYPE_LABELS = {
    images: 'Images',
    headings: 'Titres',
    links: 'Liens',
    paragraphs: 'Paragraphes',
    lists: 'Listes',
    tables: 'Tableaux',
    metadata: 'Méta-données',
    structured: 'Données structurées',
  }

  function getTypeCount(typeId, d) {
    if (!d || !d[typeId]) return 0
    if (typeId === 'headings') {
      return Object.values(d.headings).reduce(function (a, b) { return a + b.length }, 0)
    }
    if (typeId === 'metadata') {
      var m = d.metadata
      return (m.title || m.description || m.keywords || (m.og && Object.keys(m.og).length > 0) || (m.twitter && Object.keys(m.twitter).length > 0)) ? 1 : 0
    }
    return d[typeId].length || 0
  }

  if (extractionState === 'extracting' && !hasExtracted) {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-4 py-3 border-b border-surface-700/30">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Extraction ciblée</h3>
        </div>
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
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Extraction ciblée</h3>
        </div>
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
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Extraction ciblée</h3>
        </div>
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
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Extraction ciblée</h3>
        </div>
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {DATA_TYPES.map(function (dt) {
            return (
              <label
                key={dt.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-800/40 hover:bg-surface-700/30 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!checked[dt.id]}
                  onChange={() => handleToggle(dt.id)}
                  className="w-3.5 h-3.5 rounded border-surface-600 bg-surface-700 accent-accent"
                />
                <span className="text-xs text-surface-300">{dt.label}</span>
              </label>
            )
          })}
        </div>
        <div className="p-3 border-t border-surface-700/30">
          <button
            onClick={handleExtract}
            disabled={checkedCount === 0}
            className="w-full text-xs px-3 py-2 rounded bg-accent hover:bg-accent-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checkedCount === 0 ? 'Sélectionnez des types' : 'Lancer l\'extraction (' + checkedCount + ')'}
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
                <div className="absolute bottom-full mb-1 left-0 bg-surface-800 border border-surface-700/50 rounded-lg overflow-hidden shadow-lg z-10 min-w-[120px]">
                  {data.images && data.images.length > 0 && (
                    <button onClick={function () { setShowCsvMenu(false); downloadCsvByType(data.images, 'Images') }}
                      className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                      Images
                    </button>
                  )}
                  {data.links && data.links.length > 0 && (
                    <button onClick={function () { setShowCsvMenu(false); downloadCsvByType(data.links, 'Liens') }}
                      className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                      Liens
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={function () {
                setHasExtracted(false)
                send({ type: 'SET_OPTIONS', options: extractionOptions })
              }}
              className="text-[10px] px-2 py-1 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors"
            >
              Nouvelle extraction
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {Object.keys(checked).map(function (typeId) {
          var count = getTypeCount(typeId, data)
          if (count > 0) {
            return (
              <ResultSection key={typeId} title={TYPE_LABELS[typeId]} count={count}
                onClick={() => onCategorySelect({ type: typeId, data: data[typeId] })} />
            )
          }
          return (
            <div key={typeId} className="w-full px-3 py-2.5 rounded-lg bg-surface-800/20 border border-surface-700/20 flex items-center justify-between">
              <span className="text-xs text-surface-500">{TYPE_LABELS[typeId]}</span>
              <span className="text-[10px] text-surface-600">Aucun résultat trouvé</span>
            </div>
          )
        })}
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

function ResultSection({ title, count, onClick }) {
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
