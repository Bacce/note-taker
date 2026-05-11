import { useState, useRef, useEffect } from 'react'
import type { Note } from '../types'

interface NoteViewProps {
  note: Note
  fontSize: number
  initialEditing?: boolean
  onUpdate: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function NoteView({ note, fontSize, initialEditing = false, onUpdate, onDelete, onClose }: NoteViewProps) {
  const [editing, setEditing] = useState(initialEditing)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialEditing) {
      requestAnimationFrame(() => contentRef.current?.focus())
    }
  }, [])

  function save() {
    onUpdate(note.id, { title: title.trim() || 'Untitled', content })
    setEditing(false)
  }

  function handleDelete() {
    if (window.confirm('Delete this note?')) {
      onDelete(note.id)
    }
  }

  function enterEdit() {
    setEditing(true)
    requestAnimationFrame(() => contentRef.current?.focus())
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800">
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer mr-auto"
          aria-label="Close note"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {editing ? (
          <>
            <button
              onClick={() => {
                const firstLine = content.split('\n').find(l => l.trim())?.trim()
                if (firstLine) setTitle(firstLine)
              }}
              className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Use first line of content as title"
            >
              Title from text
            </button>
            <button
              onClick={() => setContent(content.replace(/\n{2,}/g, '\n').replace(/\n/g, ' ').replace(/\.(?!\.)\s*/g, '.\n'))}
              className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Remove newlines and break after each sentence"
            >
              Reflow
            </button>
            <button
              onClick={() => { setTitle(note.title); setContent(note.content); setEditing(false) }}
              className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-3 py-1.5 rounded-md text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer"
            >
              Save
            </button>
          </>
        ) : (
          <>
            <button
              onClick={enterEdit}
              className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-md text-sm text-red-400 hover:bg-red-900/30 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {editing ? (
          <div className="flex flex-col gap-4 max-w-3xl">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note title"
              className="bg-transparent text-2xl font-semibold text-slate-100 outline-none border-b border-slate-700 pb-2 placeholder:text-slate-600"
              style={{ fontSize: fontSize + 6 }}
            />
            <textarea
              ref={contentRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start writing..."
              className="bg-transparent text-slate-200 outline-none resize-none flex-1 min-h-[60vh] placeholder:text-slate-600 leading-relaxed"
              style={{ fontSize }}
            />
          </div>
        ) : (
          <div className="max-w-3xl">
            <h1
              className="text-2xl font-semibold text-slate-100 mb-4"
              style={{ fontSize: fontSize + 6 }}
            >
              {note.title || 'Untitled'}
            </h1>
            <div
              className="text-slate-300 whitespace-pre-wrap leading-relaxed"
              style={{ fontSize }}
            >
              {note.content || (
                <span className="text-slate-600 italic">Empty note. Click Edit to start writing.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
