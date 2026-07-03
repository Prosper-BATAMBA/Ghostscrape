import { MODE_CARDS } from '../../services/modeRegistry'
import ModeCard from '../modes/ModeCard'
import FullPagePanel from '../modes/FullPagePanel'
import DataTypePanel from '../modes/DataTypePanel'
import CssSelectorPanel from '../modes/CssSelectorPanel'

var MODE_PANELS = {
  'full-page': FullPagePanel,
  'data-types': DataTypePanel,
  'css-selector': CssSelectorPanel,
}

export default function Sidebar({ engine, isConnected, send, onCategorySelect }) {
  if (!isConnected) return null

  var activeMode = engine.activeMode
  var extractionData = engine.modeData && engine.modeData.type === 'EXTRACTION_RESULT' ? engine.modeData : null

  function handleActivate(modeId, capabilities) {
    if (activeMode === modeId) {
      engine.setActiveMode(null)
      send({ type: 'DEACTIVATE_MODE', modeId })
      return
    }
    engine.setActiveMode(modeId)
    send({ type: 'ACTIVATE_MODE', modeId, capabilities, options: engine.extractionOptions })
  }

  function handleRelaunch() {
    if (activeMode) {
      engine.setModeData(null)
      send({ type: 'TRIGGER_EXTRACTION', modeId: activeMode, options: engine.extractionOptions })
    }
  }

  var hasData = extractionData && extractionData.modeId === activeMode
  var ActivePanel = activeMode ? MODE_PANELS[activeMode] : null

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeMode && (function () {
        var mode = MODE_CARDS.find(function (m) { return m.id === activeMode })
        return (
          <div className="sticky top-0 z-10 bg-surface-800/95 backdrop-blur-sm border-b border-surface-700/30 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs">{mode?.icon || '👻'}</span>
              <span className="text-xs font-semibold text-surface-200">{mode?.name || activeMode}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70"></span>
            </div>
            <button
              onClick={function () {
                engine.setActiveMode(null)
                send({ type: 'DEACTIVATE_MODE', modeId: activeMode })
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            >
              Désactiver
            </button>
          </div>
        )
      })()}
      <div className="px-4 py-3 border-b border-surface-700/30 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-surface-300 uppercase tracking-wider">GhostScrape</h2>
          <p className="text-[11px] text-surface-500 mt-0.5">Modes d'extraction</p>
        </div>
        {activeMode && (
          <button
            onClick={function () {
              engine.setActiveMode(null)
              send({ type: 'DEACTIVATE_MODE', modeId: activeMode })
            }}
            className="text-[10px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            Désactiver
          </button>
        )}
      </div>

      <div className="px-3 py-3 border-b border-surface-700/30 space-y-2">
        {MODE_CARDS.map(function (mode) {
          return (
            <ModeCard
              key={mode.id}
              mode={mode}
              isActive={activeMode === mode.id}
              onClick={() => handleActivate(mode.id, mode.capabilities)}
            />
          )
        })}
      </div>

      {activeMode && ActivePanel && (
        <div className="flex-1 min-h-0">
          <ActivePanel
            data={hasData ? extractionData.data : null}
            onRelaunch={handleRelaunch}
            send={send}
            imageBlobs={engine.imageBlobs}
            htmlStructure={engine.htmlStructure}
            onCategorySelect={onCategorySelect}
            extractionOptions={engine.extractionOptions}
            onExtractionOptionsChange={engine.setExtractionOptions}
            testResults={engine.testResults}
            onTestResultsChange={engine.setTestResults}
          />
        </div>
      )}

      {activeMode && !ActivePanel && (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-surface-500 text-center">
            Panneau en construction pour ce mode.
          </p>
        </div>
      )}
    </div>
  )
}
