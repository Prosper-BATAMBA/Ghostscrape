export default function ConnectionStatus({ isConnected }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        <span
          className={'w-2 h-2 rounded-full ' + (isConnected ? 'bg-emerald-400' : 'bg-red-400')}
        />
        <span
          className={'text-xs font-medium ' + (isConnected ? 'text-emerald-400' : 'text-red-400')}
        >
          {isConnected ? 'Extension connected' : 'Extension disconnected'}
        </span>
      </div>
    </div>
  )
}
