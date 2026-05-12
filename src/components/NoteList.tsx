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

function NoteItem({ note, active, onSelect }: { note: Note; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-slate-800/50 transition-colors cursor-pointer ${
        active
          ? 'bg-slate-800 border-l-2 border-l-indigo-500'
          : 'hover:bg-slate-800/50'
      }`}
    >
      <p className="text-sm font-medium text-slate-200 truncate flex items-center gap-1.5">
        {note.read && (
          <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span className="truncate">{note.title || 'Untitled'}</span>
      </p>
      <p className="text-xs text-slate-500 mt-1">{formatDate(note.updatedAt)}</p>
    </button>
  )
}

export function NoteList({ notes, activeId, onSelect, onCreate }: NoteListProps) {
  const unread = notes.filter(n => !n.read)
  const read = notes.filter(n => n.read)

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
        {unread.map(note => (
          <NoteItem key={note.id} note={note} active={note.id === activeId} onSelect={() => onSelect(note.id)} />
        ))}
        {read.length > 0 && (
          <>
            <p className="px-4 pt-4 pb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Read
            </p>
            {read.map(note => (
              <NoteItem key={note.id} note={note} active={note.id === activeId} onSelect={() => onSelect(note.id)} />
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
