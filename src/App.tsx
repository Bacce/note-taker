import { useState } from 'react'
import { useNotes } from './hooks/useNotes'
import { useFontSize } from './hooks/useFontSize'
import { useRecentNotes } from './hooks/useRecentNotes'
import { NoteList } from './components/NoteList'
import { NoteView } from './components/NoteView'
import { FontSizeControl } from './components/FontSizeControl'
import { Landing } from './components/Landing'
import { PinLock } from './components/PinLock'

function App() {
  const [unlocked, setUnlocked] = useState(false)
  const { notes, createNote, updateNote, deleteNote } = useNotes()
  const { fontSize, increase, decrease, canIncrease, canDecrease } = useFontSize()
  const { recentIds, visit } = useRecentNotes()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeNote = selectedId ? (notes.find(n => n.id === selectedId) ?? null) : null
  const recentNotes = recentIds
    .map(id => notes.find(n => n.id === id))
    .filter((n): n is NonNullable<typeof n> => n != null)

  function handleCreate() {
    const note = createNote()
    setSelectedId(note.id)
    visit(note.id)
    setSidebarOpen(false)
  }

  function handleDelete(id: string) {
    deleteNote(id)
    setSelectedId(null)
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    visit(id)
    setSidebarOpen(false)
  }

  if (!unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedId(null)}
            className="text-lg font-semibold text-slate-100 hover:text-white transition-colors cursor-pointer"
          >
            Notes
          </button>
        </div>
        <FontSizeControl
          fontSize={fontSize}
          canIncrease={canIncrease}
          canDecrease={canDecrease}
          onIncrease={increase}
          onDecrease={decrease}
        />
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Sidebar - always visible on md+, toggle on mobile */}
        <div
          className={`absolute inset-y-0 left-0 z-20 w-64 transform transition-transform md:relative md:translate-x-0 md:block ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <NoteList
            notes={notes}
            activeId={selectedId}
            onSelect={handleSelect}
            onCreate={handleCreate}
          />
        </div>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-10 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {activeNote ? (
            <NoteView
              key={activeNote.id}
              note={activeNote}
              fontSize={fontSize}
              onUpdate={updateNote}
              onDelete={handleDelete}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <Landing
              recentNotes={recentNotes}
              onSelect={handleSelect}
              onCreate={handleCreate}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
