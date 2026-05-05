import type { Note } from '../types'

interface LandingProps {
  recentNotes: Note[]
  onSelect: (id: string) => void
  onCreate: () => void
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

export function Landing({ recentNotes, onSelect, onCreate }: LandingProps) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-md w-full">
        <h2 className="text-2xl font-semibold text-slate-100 mb-1">Welcome back</h2>
        <p className="text-slate-400 mb-6">Pick up where you left off, or start something new.</p>

        {recentNotes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">
              Recently visited
            </h3>
            <ul className="space-y-1">
              {recentNotes.map(note => (
                <li key={note.id}>
                  <button
                    onClick={() => onSelect(note.id)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer group"
                  >
                    <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                      {note.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(note.updatedAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onCreate}
          className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          + New Note
        </button>
      </div>
    </div>
  )
}
