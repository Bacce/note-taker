interface FontSizeControlProps {
  fontSize: number
  canIncrease: boolean
  canDecrease: boolean
  onIncrease: () => void
  onDecrease: () => void
}

export function FontSizeControl({ fontSize, canIncrease, canDecrease, onIncrease, onDecrease }: FontSizeControlProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onDecrease}
        disabled={!canDecrease}
        className="px-2 py-1 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease font size"
      >
        A−
      </button>
      <span className="text-xs text-slate-400 w-8 text-center tabular-nums">{fontSize}</span>
      <button
        onClick={onIncrease}
        disabled={!canIncrease}
        className="px-2 py-1 rounded text-base font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Increase font size"
      >
        A+
      </button>
    </div>
  )
}
