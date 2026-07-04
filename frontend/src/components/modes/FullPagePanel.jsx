import { useEffect, useMemo, useRef, useState } from 'react'
import { downloadTextZip, downloadImagesZip, downloadHtmlFile } from '../../services/downloadScrape'
import { downloadCsvByType } from '../../services/downloadCsv'

var CATEGORIES = {
  headings: { label: 'Titres', dataKey: 'headings' },
  paragraphs: { label: 'Parag.', dataKey: 'paragraphs' },
  links: { label: 'Liens', dataKey: 'links' },
  images: { label: 'Images', dataKey: 'images' },
}

export default function FullPagePanel({ data, onRelaunch, onCancel, send, imageBlobs, htmlStructure, onCategorySelect, extractionOptions, onExtractionOptionsChange, extractionState }) {
  var [showWaiting, setShowWaiting] = useState(false)
  var [downloading, setDownloading] = useState(false)
  var [showCsvMenu, setShowCsvMenu] = useState(false)
  var [showDownloadMenu, setShowDownloadMenu] = useState(false)
  var waitingRef = useRef(null)
  var downloadRef = useRef(null)
  var csvBtnRef = useRef(null)
  var downloadBtnRef = useRef(null)

  useEffect(function () {
    if (!data && extractionState !== 'extracting') {
      waitingRef.current = setTimeout(function () { setShowWaiting(true) }, 2000)
    } else {
      if (waitingRef.current) clearTimeout(waitingRef.current)
      setShowWaiting(false)
    }
    return function () {
      if (waitingRef.current) clearTimeout(waitingRef.current)
    }
  }, [data, extractionState])

  async function handleDownloadText() {
    setDownloading(true)
    try {
      await downloadTextZip(data)
    } finally {
      setDownloading(false)
    }
  }

  function handleDownloadImages() {
    if (imageBlobs && Object.keys(imageBlobs).length) {
      setDownloading(true)
      downloadImagesZip(data, imageBlobs).finally(function () { setDownloading(false) })
      return
    }
    downloadRef.current = 'images'
    setDownloading(true)
    send({ type: 'DOWNLOAD_IMAGES', images: data.images })
  }

  function handleDownloadHtml() {
    if (htmlStructure) {
      setDownloading(true)
      downloadHtmlFile(htmlStructure).finally(function () { setDownloading(false) })
      return
    }
    downloadRef.current = 'html'
    setDownloading(true)
    send({ type: 'GET_HTML' })
  }

  useEffect(function () {
    if (imageBlobs && downloadRef.current === 'images') {
      downloadRef.current = null
      downloadImagesZip(data, imageBlobs).finally(function () { setDownloading(false) })
    }
  }, [imageBlobs])

  useEffect(function () {
    if (htmlStructure && downloadRef.current === 'html') {
      downloadRef.current = null
      downloadHtmlFile(htmlStructure).finally(function () { setDownloading(false) })
    }
  }, [htmlStructure])

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

  useEffect(function () {
    if (!showDownloadMenu) return
    function onMouseDown(e) {
      if (downloadBtnRef.current && !downloadBtnRef.current.contains(e.target)) {
        setShowDownloadMenu(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return function () { document.removeEventListener('mousedown', onMouseDown) }
  }, [showDownloadMenu])

  var stats = useMemo(function () {
    if (!data) return null
    return {
      headings: Object.values(data.headings || {}).reduce(function (a, b) { return a + b.length }, 0),
      paragraphs: (data.paragraphs || []).length,
      links: (data.links || []).length,
      images: (data.images || []).length,
    }
  }, [data])

  if (!data && extractionState === 'extracting') {
    return (
      <div className="flex flex-col flex-1">
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

  if (!data && extractionState === 'cancelled') {
    return (
      <div className="flex flex-col flex-1">
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-xs text-surface-400">Extraction annulée</p>
          <button onClick={onRelaunch}
            className="mt-4 text-[10px] px-3 py-1.5 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors"
          >
            Relancer
          </button>
        </div>
      </div>
    )
  }

  if (!data && extractionState === 'error') {
    return (
      <div className="flex flex-col flex-1">
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-surface-400">Erreur d'extraction</p>
          <button onClick={onRelaunch}
            className="mt-4 text-[10px] px-3 py-1.5 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!data && showWaiting) {
    return (
      <div className="flex flex-col flex-1">
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-xs text-surface-300 font-medium">En attente de page...</p>
          <p className="text-[11px] text-surface-500 mt-1">Naviguez vers une URL pour lancer l'extraction</p>
          <button onClick={onRelaunch}
            className="mt-4 text-[10px] px-3 py-1.5 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col flex-1">
        <ExtractionOptions value={extractionOptions} onChange={onExtractionOptionsChange} />
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-xs text-surface-400">Extraction en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 py-3 border-b border-surface-700/30">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">Résultats</h3>
          <div className="flex gap-1.5 flex-wrap">
            <div className="relative" ref={downloadBtnRef}>
              <button onClick={function () { setShowDownloadMenu(!showDownloadMenu) }}
                className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors">
                Télécharger ▾
              </button>
              {showDownloadMenu && (
                <div className="absolute bottom-full mb-1 left-0 bg-surface-800 border border-surface-700/50 rounded-lg overflow-hidden shadow-lg z-10 min-w-[140px]">
                  <button onClick={function () { setShowDownloadMenu(false); handleDownloadText() }}
                    className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                    Textes + Liens
                  </button>
                  <button onClick={function () { setShowDownloadMenu(false); handleDownloadImages() }}
                    className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                    Images
                  </button>
                  <button onClick={function () { setShowDownloadMenu(false); handleDownloadHtml() }}
                    className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                    HTML
                  </button>
                </div>
              )}
            </div>
            <div className="relative" ref={csvBtnRef}>
              <button onClick={function () { setShowCsvMenu(!showCsvMenu) }}
                className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors">
                CSV ▾
              </button>
              {showCsvMenu && (
                <div className="absolute bottom-full mb-1 left-0 bg-surface-800 border border-surface-700/50 rounded-lg overflow-hidden shadow-lg z-10 min-w-[120px]">
                  {data.links && data.links.length > 0 && (
                    <button onClick={function () { setShowCsvMenu(false); downloadCsvByType(data.links, 'Liens') }}
                      className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                      Liens
                    </button>
                  )}
                  {data.images && data.images.length > 0 && (
                    <button onClick={function () {
                      setShowCsvMenu(false)
                      var items = data.images.map(function (img) { return { src: img.src, alt: img.alt, width: img.width, height: img.height } })
                      downloadCsvByType(items, 'Images')
                    }}
                      className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                      Images
                    </button>
                  )}
                  {data.headings && Object.values(data.headings).some(function (a) { return a.length > 0 }) && (
                    <button onClick={function () {
                      setShowCsvMenu(false)
                      var items = []
                      Object.entries(data.headings).forEach(function (_ref) {
                        var tag = _ref[0], texts = _ref[1]
                        texts.forEach(function (t) { items.push({ tag: tag, text: t }) })
                      })
                      downloadCsvByType(items, 'Titres')
                    }}
                      className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                      Titres
                    </button>
                  )}
                  {data.paragraphs && data.paragraphs.length > 0 && (
                    <button onClick={function () {
                      setShowCsvMenu(false)
                      var items = data.paragraphs.map(function (p) { return { text: p } })
                      downloadCsvByType(items, 'Paragraphes')
                    }}
                      className="w-full text-left text-[10px] px-3 py-1.5 text-surface-300 hover:bg-surface-700/60 transition-colors whitespace-nowrap">
                      Paragraphes
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onRelaunch}
              className="text-[10px] px-2 py-1 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors"
            >
              Relancer
            </button>
          </div>
        </div>
        {stats && data && (
          <div className="flex gap-3 mt-2">
            <Stat value={stats.headings} label="Titres" onClick={function () {
              onCategorySelect({ type: 'headings', data: data.headings || {} })
            }} />
            <Stat value={stats.paragraphs} label="Parag." onClick={function () {
              onCategorySelect({ type: 'paragraphs', data: data.paragraphs || [] })
            }} />
            <Stat value={stats.links} label="Liens" onClick={function () {
              onCategorySelect({ type: 'links', data: data.links || [] })
            }} />
            <Stat value={stats.images} label="Images" onClick={function () {
              onCategorySelect({ type: 'images', data: data.images || [] })
            }} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {data.title && (
          <div className="glass-panel-solid p-3">
            <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Titre</p>
            <p className="text-sm text-surface-100 font-medium leading-snug">{data.title}</p>
          </div>
        )}

        {data.metaDescription && (
          <div className="glass-panel-solid p-3">
            <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Meta Description</p>
            <p className="text-xs text-surface-300 leading-relaxed">{data.metaDescription}</p>
          </div>
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

function Stat({ value, label, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 bg-surface-800/60 hover:bg-surface-700/50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
    >
      <span className="text-xs font-semibold text-surface-100">{value}</span>
      <span className="text-[9px] text-surface-500">{label}</span>
    </button>
  )
}
