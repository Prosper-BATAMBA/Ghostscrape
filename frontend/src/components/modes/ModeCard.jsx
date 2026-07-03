export default function ModeCard({ mode, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass-panel p-3 transition-all duration-200 hover:bg-surface-700/40 ${
        isActive ? 'ring-2 ring-accent/60 bg-surface-700/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-lg">{mode.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-surface-100">{mode.name}</p>
          <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{mode.description}</p>
          {mode.badge && (
            <span className="inline-block mt-1.5 text-[10px] font-mono uppercase tracking-wider text-accent-300 bg-accent/5 rounded px-1.5 py-0.5">
              {mode.badge}
            </span>
          )}
        </div>
        {isActive && (
          <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
        )}
      </div>
    </button>
  )
}
