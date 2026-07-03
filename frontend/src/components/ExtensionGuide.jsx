export default function ExtensionGuide({ wsConnected, onRetry }) {
  var steps = [
    {
      title: '1. Open Chrome Extensions',
      detail: 'Navigate to chrome://extensions/',
      code: 'chrome://extensions/',
    },
    {
      title: '2. Enable Developer Mode',
      detail: 'Toggle "Developer mode" in the top right corner',
    },
    {
      title: '3. Load the extension',
      detail: 'Click "Load unpacked" and select the extension/ folder',
      code: 'ghostscrape/extension/',
    },
    {
      title: '4. Pin the extension',
      detail: 'Click the puzzle icon and pin GhostScrape for easy access',
    },
  ]

  if (wsConnected) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-900 min-h-0">
        <div className="text-center max-w-sm px-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-surface-100 mb-1">
            Connexion en cours…
          </h2>
          <p className="text-sm text-surface-400 mb-1">
            En attente de l'extension GhostScrape.
          </p>
          <p className="text-xs text-surface-500 mb-6">
            Ouvrez le panneau de l'extension ou naviguez sur une page pour accélérer.
          </p>
          <button onClick={onRetry}
            className="text-xs px-4 py-2 rounded bg-accent/10 hover:bg-accent/20 text-accent-300 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-surface-900 min-h-0">
      <div className="max-w-lg w-full mx-auto px-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-surface-100 mb-1">
            Extension Required
          </h2>
          <p className="text-sm text-surface-400">
            GhostScrape needs the browser extension to interact with web pages.
            Install it in developer mode to get started.
          </p>
        </div>

        <div className="space-y-3">
          {steps.map(function (step, i) {
            return (
              <div key={i} className="glass-panel p-3.5 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-200">{step.title}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{step.detail}</p>
                  {step.code && (
                    <code className="inline-block mt-1.5 text-[11px] font-mono text-accent-300 bg-accent/5 rounded px-1.5 py-0.5">
                      {step.code}
                    </code>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-surface-500">
            After loading the extension, refresh this page.
          </p>
        </div>
      </div>
    </div>
  )
}
