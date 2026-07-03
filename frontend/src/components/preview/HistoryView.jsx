var MODE_LABELS = {
  'full-page': 'FullPage',
  'data-types': 'Cibl\u00e9e',
  'css-selector': 'CSS',
}

export default function HistoryView({ sessions, onLoadSession, onDeleteSession, onClearHistory, onClose }) {
  function formatDate(ts) {
    var d = new Date(ts)
    return d.toLocaleDateString('fr-FR') + ' \u00b7 ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  function modeBadge(modeId) {
    var colors = {
      'full-page': 'bg-blue-500/10 text-blue-300',
      'data-types': 'bg-purple-500/10 text-purple-300',
      'css-selector': 'bg-amber-500/10 text-amber-300',
    }
    return colors[modeId] || 'bg-surface-600/30 text-surface-300'
  }

  function summary(data, modeId) {
    var parts = []
    if (modeId === 'full-page' || modeId === 'data-types') {
      if (data.headings) { var h = 0; for (var k in data.headings) h += data.headings[k].length; if (h) parts.push(h + ' titre' + (h > 1 ? 's' : '')) }
      if (data.links) parts.push(data.links.length + ' lien' + (data.links.length > 1 ? 's' : ''))
      if (data.images) parts.push(data.images.length + ' image' + (data.images.length > 1 ? 's' : ''))
      if (data.paragraphs) parts.push(data.paragraphs.length + ' paragraphe' + (data.paragraphs.length > 1 ? 's' : ''))
    }
    if (modeId === 'css-selector' && data.selectors) {
      parts = data.selectors.map(function (s) { return s.count + ' ' + (s.label || s.selector) })
    }
    return parts.join(' \u00b7 ') || 'Aucune donn\u00e9e'
  }

  return (
    <div className="flex flex-col h-full bg-surface-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/30 bg-surface-800/40">
        <h2 className="text-sm font-semibold text-surface-100">Historique des extractions</h2>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button onClick={onClearHistory}
              className="text-[10px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
              Effacer tout
            </button>
          )}
          <button onClick={onClose}
            className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors">
            Fermer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-surface-800 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-surface-400">Aucun historique</p>
            <p className="text-xs text-surface-500 mt-1">Les extractions appara\u00eetront ici automatiquement.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice().reverse().map(function (s) {
              return (
                <div key={s.id} onClick={function () { onLoadSession(s) }}
                  className="flex items-start gap-3 px-4 py-3 rounded-lg bg-surface-800/40 hover:bg-surface-700/30 cursor-pointer transition-colors border border-surface-700/30 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={'text-[11px] px-1.5 py-0.5 rounded font-medium ' + modeBadge(s.modeId)}>
                        {MODE_LABELS[s.modeId] || s.modeId}
                      </span>
                      <span className="text-xs text-surface-300 truncate font-medium">{s.title || s.url || 'Sans titre'}</span>
                    </div>
                    <div className="text-[11px] text-surface-500 mb-1">{formatDate(s.timestamp)}</div>
                    <div className="text-[11px] text-surface-400">{summary(s.data, s.modeId)}</div>
                  </div>
                  <button onClick={function (e) { e.stopPropagation(); onDeleteSession(s.id) }}
                    className="text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
