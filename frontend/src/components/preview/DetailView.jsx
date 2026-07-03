var CATEGORY_LABELS = {
  headings: 'Titres',
  paragraphs: 'Paragraphes',
  links: 'Liens',
  images: 'Images',
  lists: 'Listes',
  tables: 'Tableaux',
  metadata: 'Méta-données',
  structured: 'Données structurées',
  'css-selector': 'Sélecteur CSS',
}

var SUPPORTED_TYPES = Object.keys(CATEGORY_LABELS)

export default function DetailView({ category, onBack, onToggleHistory }) {
  if (!category) return null

  var { type, data } = category
  var label = CATEGORY_LABELS[type] || type

  return (
    <div className="flex flex-col h-full bg-surface-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700/30 bg-surface-800/40">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <h2 className="text-sm font-semibold text-surface-100">{label}</h2>
        <div className="ml-auto">
          <button onClick={onToggleHistory}
            className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors">
            Historique
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {type === 'headings' && renderHeadings(data)}
        {type === 'paragraphs' && renderParagraphs(data)}
        {type === 'links' && renderLinks(data)}
        {type === 'images' && renderImages(data)}
        {type === 'lists' && renderLists(data)}
        {type === 'tables' && renderTables(data)}
        {type === 'metadata' && renderMetadata(data)}
        {type === 'structured' && renderStructured(data)}
        {type === 'css-selector' && renderCssSelector(data)}
        {!SUPPORTED_TYPES.includes(type) && (
          <p className="text-xs text-surface-500 text-center py-8">Type de données non pris en charge.</p>
        )}
      </div>
    </div>
  )
}

function renderHeadings(data) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucun titre trouvé.</p>
  }

  return Object.entries(data).map(function (_ref) {
    var tag = _ref[0], items = _ref[1]
    if (!items || items.length === 0) return null
    return (
      <div key={tag} className="border border-surface-700/30 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-800/40 border-b border-surface-700/30">
          <span className="text-[10px] font-mono text-accent uppercase">{tag}</span>
          <span className="text-[10px] text-surface-500 ml-2">({items.length})</span>
        </div>
        <div className="px-3 py-2 space-y-1 max-h-60 overflow-y-auto">
          {items.map(function (text, i) {
            return (
              <p key={i} className="text-xs text-surface-300 py-0.5 border-b border-surface-700/20 last:border-0 truncate">
                {text}
              </p>
            )
          })}
        </div>
      </div>
    )
  })
}

function renderParagraphs(data) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucun paragraphe trouvé.</p>
  }

  return data.map(function (p, i) {
    return (
      <div key={i} className="border border-surface-700/30 rounded-lg p-3">
        <p className="text-xs text-surface-300 leading-relaxed">{p}</p>
      </div>
    )
  })
}

function renderLinks(data) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucun lien trouvé.</p>
  }

  return data.map(function (link, i) {
    return (
      <div key={i} className="flex items-start gap-2.5 border border-surface-700/30 rounded-lg p-3">
        <span className={'px-1.5 py-0.5 rounded text-[9px] font-mono mt-0.5 flex-shrink-0 ' + (link.isInternal ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400')}>
          {link.isInternal ? 'INT' : 'EXT'}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-surface-300 truncate">{link.text || '(no text)'}</p>
          <p className="text-[10px] text-surface-500 truncate">{link.href}</p>
        </div>
      </div>
    )
  })
}

function renderImages(data) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucune image trouvée.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {data.map(function (img, i) {
        return (
          <div key={i} className="border border-surface-700/30 rounded-lg overflow-hidden">
            <div className="aspect-video bg-surface-800 overflow-hidden">
              <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover"
                onError={function (e) { e.target.style.display = 'none' }}
              />
            </div>
            <div className="px-2.5 py-2 space-y-0.5">
              <p className="text-[10px] text-surface-300 truncate">{img.alt || '(no alt)'}</p>
              <p className="text-[9px] text-surface-500 truncate">{img.src}</p>
              {img.type && <p className="text-[8px] text-surface-600">{img.type}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function renderLists(data) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucune liste trouvée.</p>
  }

  return data.map(function (list, i) {
    return (
      <div key={i} className="border border-surface-700/30 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-800/40 border-b border-surface-700/30">
          <span className="text-[10px] font-mono text-accent uppercase">&lt;{list.type}&gt;</span>
          <span className="text-[10px] text-surface-500 ml-2">({list.items.length} items)</span>
        </div>
        <div className="px-3 py-2 space-y-1 max-h-60 overflow-y-auto">
          {list.items.map(function (item, j) {
            return (
              <p key={j} className="text-xs text-surface-300 pl-3 py-0.5 border-b border-surface-700/20 last:border-0 truncate">
                - {item}
              </p>
            )
          })}
        </div>
      </div>
    )
  })
}

function renderTables(data) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucun tableau trouvé.</p>
  }

  return data.map(function (table, i) {
    return (
      <div key={i} className="border border-surface-700/30 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-800/40 border-b border-surface-700/30 flex items-center justify-between">
          <span className="text-[10px] font-mono text-accent uppercase">Tableau {i + 1}</span>
          <span className="text-[10px] text-surface-500">{table.rows.length} lignes</span>
        </div>
        <div className="px-3 py-2 space-y-1">
          {table.caption && (
            <p className="text-[10px] text-surface-400 mb-1 italic">{table.caption}</p>
          )}
          {table.headers.length > 0 && (
            <p className="text-[10px] text-surface-500 font-mono mb-1">[{table.headers.join(' | ')}]</p>
          )}
          {table.rows.length > 0 && (
            <p className="text-[10px] text-surface-600">Première ligne : [{table.rows[0].join(', ')}]</p>
          )}
        </div>
      </div>
    )
  })
}

function renderMetadata(data) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucune méta-donnée trouvée.</p>
  }

  var entries = []
  if (data.title) entries.push(['title', data.title])
  if (data.description) entries.push(['description', data.description])
  if (data.keywords) entries.push(['keywords', data.keywords])

  return (
    <div className="space-y-2">
      {entries.length > 0 && (
        <div className="border border-surface-700/30 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-surface-800/40 border-b border-surface-700/30">
            <span className="text-[10px] font-mono text-accent uppercase">Meta</span>
          </div>
          <div className="px-3 py-2 space-y-1">
            {entries.map(function (_ref) {
              var k = _ref[0], v = _ref[1]
              return (
                <p key={k} className="text-xs text-surface-300 truncate">
                  <span className="text-surface-500">{k}:</span> {v}
                </p>
              )
            })}
          </div>
        </div>
      )}

      {data.og && Object.keys(data.og).length > 0 && (
        <div className="border border-surface-700/30 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-surface-800/40 border-b border-surface-700/30">
            <span className="text-[10px] font-mono text-accent uppercase">Open Graph</span>
          </div>
          <div className="px-3 py-2 space-y-1">
            {Object.entries(data.og).map(function (_ref) {
              var k = _ref[0], v = _ref[1]
              return (
                <p key={k} className="text-[11px] text-surface-300 truncate">
                  <span className="text-surface-500">{k}:</span> {v}
                </p>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function renderStructured(data) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucune donnée structurée trouvée.</p>
  }

  return data.map(function (item, i) {
    return (
      <div key={i} className="border border-surface-700/30 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-800/40 border-b border-surface-700/30">
          <span className="text-[10px] font-mono text-accent uppercase">{item.type}</span>
          {item.count !== undefined && (
            <span className="text-[10px] text-surface-500 ml-2">({item.count} éléments)</span>
          )}
        </div>
        {item.count === undefined && item.data && (
          <div className="px-3 py-2 max-h-48 overflow-y-auto">
            <pre className="text-[10px] text-surface-400 whitespace-pre-wrap break-words font-mono">
              {JSON.stringify(item.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  })
}

function renderCssSelector(data) {
  if (!data || !data.items || data.items.length === 0) {
    return <p className="text-xs text-surface-500 text-center py-8">Aucun élément trouvé pour ce sélecteur.</p>
  }

  var label = data.label || data.selector || 'Résultats'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] text-surface-500 uppercase tracking-wider">{label}</p>
        <code className="text-[10px] font-mono text-accent bg-accent/5 rounded px-1.5 py-0.5">{data.selector}</code>
      </div>

      {data.items.map(function (item, i) {
        return (
          <div key={i} className="border border-surface-700/30 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-surface-800/40 border-b border-surface-700/30 flex items-center justify-between">
              <span className="text-[10px] font-mono text-surface-500">&lt;{item.tag}&gt;</span>
              <span className="text-[10px] text-surface-600">#{i + 1}</span>
            </div>
            <div className="px-3 py-2 space-y-1">
              {item.text && (
                <p className="text-xs text-surface-300 leading-relaxed">{item.text}</p>
              )}
              {item.attrs && Object.keys(item.attrs).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(item.attrs).slice(0, 5).map(function (_ref) {
                    var k = _ref[0], v = _ref[1]
                    return (
                      <span key={k} className="text-[9px] font-mono text-surface-500 bg-surface-800/60 rounded px-1 py-0.5">
                        {k}="{v.slice(0, 40)}"
                      </span>
                    )
                  })}
                  {Object.keys(item.attrs).length > 5 && (
                    <span className="text-[9px] text-surface-600">+{Object.keys(item.attrs).length - 5} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
