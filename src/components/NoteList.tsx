import type { Note } from '../types'

interface NoteListProps {
  notes: Note[]
  activeId: string | null
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

export function NoteList({ notes, activeId, onSelect, onCreate }: NoteListProps) {
  return (
    <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      <div className="p-3 border-b border-slate-800">
        <button
          onClick={onCreate}
          className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          + New Note
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {notes.length === 0 && (
          <p className="p-4 text-sm text-slate-500 text-center">No notes yet</p>
        )}
        {notes.map(note => (
          <button
            key={note.id}
            onClick={() => onSelect(note.id)}
            className={`w-full text-left px-4 py-3 border-b border-slate-800/50 transition-colors cursor-pointer ${
              note.id === activeId
                ? 'bg-slate-800 border-l-2 border-l-indigo-500'
                : 'hover:bg-slate-800/50'
            }`}
          >
            <p className="text-sm font-medium text-slate-200 truncate">
              {note.title || 'Untitled'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{formatDate(note.updatedAt)}</p>
          </button>
        ))}
      </nav>
    </aside>
  )
}
