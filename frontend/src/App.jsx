import { useState, useEffect, useCallback, useRef } from 'react'
import ConnectionStatus from './components/ConnectionStatus'
import ExtensionGuide from './components/ExtensionGuide'
import Sidebar from './components/layout/Sidebar'
import DetailView from './components/preview/DetailView'
import HistoryView from './components/preview/HistoryView'
import useExtension from './hooks/useExtension'
import useModeEngine from './hooks/useModeEngine'
import useSessionHistory from './hooks/useSessionHistory'
import messageRouter from './services/messageRouter'

export default function App() {
  var [url, setUrl] = useState('')
  var [selectedCategory, setSelectedCategory] = useState(null)
  var [showHistory, setShowHistory] = useState(false)

  var { isConnected, wsConnected, lastMessage, send, reconnectNow } = useExtension()
  var engine = useModeEngine()
  var sessionHistory = useSessionHistory()
  var processedRef = useRef(null)
  var saveRef = useRef(null)

  useEffect(function () {
    if (!lastMessage) return
    if (processedRef.current === lastMessage) return
    processedRef.current = lastMessage
    messageRouter(lastMessage, engine)

    if (lastMessage.type === 'NAVIGATE') setUrl(lastMessage.url)
  }, [lastMessage, engine])

  useEffect(function () {
    if (engine.modeData.type === 'EXTRACTION_RESULT' && engine.modeData.modeId) {
      if (saveRef.current === engine.modeData) return
      saveRef.current = engine.modeData
      sessionHistory.addSession(engine.modeData.modeId, engine.modeData.data)
    }
  }, [engine.modeData, sessionHistory])

  function handleLoadSession(session) {
    engine.setActiveMode(session.modeId)
    engine.setModeData({ type: 'EXTRACTION_RESULT', modeId: session.modeId, data: session.data })
    setShowHistory(false)
  }

  useEffect(function () {
    setSelectedCategory(null)
  }, [engine.activeMode])

  var handleUrlChange = useCallback(function (newUrl) {
    setUrl(newUrl)
    send({ type: 'NAVIGATE_TO', url: newUrl })
  }, [send])

  var handleCategorySelect = useCallback(function (category) {
    setSelectedCategory(category)
  }, [])

  var leftContent = (function () {
    if (!isConnected) {
      return <ExtensionGuide wsConnected={wsConnected} onRetry={reconnectNow} />
    }
    if (showHistory) {
      return <HistoryView sessions={sessionHistory.sessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={sessionHistory.deleteSession}
        onClearHistory={sessionHistory.clearHistory}
        onClose={function () { setShowHistory(false) }} />
    }
    if (selectedCategory) {
      return <DetailView category={selectedCategory}
        onBack={function () { setSelectedCategory(null) }}
        onToggleHistory={function () { setShowHistory(true) }} />
    }
    return <LivePreview url={url} onToggleHistory={function () { setShowHistory(true) }} />
  })()

  return (
    <div className="h-screen flex flex-col bg-surface-900 overflow-hidden">
      <Header isConnected={isConnected} />

      <UrlBar url={url} onUrlChange={handleUrlChange} />

      <div className="flex-1 flex gap-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          {leftContent}
        </div>

        <aside className="w-96 flex-shrink-0 border-l border-surface-700/50 bg-surface-800/40 flex flex-col overflow-y-auto">
          <Sidebar engine={engine} isConnected={isConnected} send={send}
            onCategorySelect={handleCategorySelect} />
        </aside>
      </div>
    </div>
  )
}

function Header({ isConnected }) {
  return (
    <header className="h-12 flex items-center px-5 border-b border-surface-700/50 bg-surface-900/80 backdrop-blur-xl flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="text-lg" role="img" aria-label="ghost">👻</span>
        <span className="font-semibold text-surface-100 tracking-tight text-base">GhostScrape</span>
        <span className="chip text-[10px] uppercase tracking-widest text-surface-400 ml-1">v0.3</span>
      </div>
      <div className="ml-auto">
        <ConnectionStatus isConnected={isConnected} />
      </div>
    </header>
  )
}

function UrlBar({ url, onUrlChange }) {
  var [inputValue, setInputValue] = useState('')
  var [isLoading, setIsLoading] = useState(false)

  useEffect(function () { setInputValue(url) }, [url])

  function handleSubmit(e) {
    e.preventDefault()
    if (!inputValue.trim()) return
    setIsLoading(true)
    onUrlChange(inputValue.trim())
    setTimeout(function () { setIsLoading(false) }, 500)
  }

  return (
    <form onSubmit={handleSubmit}
      className="flex items-center gap-2 px-4 py-3 border-b border-surface-700/50 bg-surface-800/30 flex-shrink-0"
    >
      <div className="flex-1 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none"
          stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={inputValue}
          onChange={function (e) { setInputValue(e.target.value) }}
          placeholder="Enter URL to scrape…"
          className="input-ghost w-full pl-10 pr-4 text-sm"
        />
      </div>
      <button type="submit" disabled={!inputValue.trim() || isLoading}
        className="btn-primary text-sm flex items-center gap-2"
      >
        {isLoading ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )}
        Load
      </button>
    </form>
  )
}

function LivePreview({ url, onToggleHistory }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-900">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-surface-700/30 bg-surface-800/20 flex-shrink-0">
        <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">Live Page</span>
        <div className="flex items-center gap-2">
          {url && (
            <span className="chip text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
              browsing on extension
            </span>
          )}
          <button onClick={onToggleHistory}
            className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors">
            Historique
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
        {!url ? (
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm text-surface-400">Enter a URL above to start</p>
            <p className="text-xs text-surface-500 mt-1">The page will open in your browser</p>
          </div>
        ) : (
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-surface-300 mb-1">Page is open in your browser</p>
            <p className="text-xs text-surface-500 truncate max-w-full">{url}</p>
            <p className="text-xs text-surface-500 mt-2">Les modes d'extraction seront reconstruits ici</p>
          </div>
        )}
      </div>
    </div>
  )
}
