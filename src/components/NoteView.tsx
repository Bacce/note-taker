import { useState, useRef, useEffect, useCallback } from 'react'
import type { Note } from '../types'

// ---------------------------------------------------------------------------
// Blacklist – common profane / sexually explicit words
// ---------------------------------------------------------------------------
const BLACKLIST: string[] = [
  // General profanity
  'fuck', 'fucker', 'fucked', 'fucking', 'motherfucker', 'motherfucking',
  'shit', 'shitty', 'bullshit',
  'ass', 'asshole', 'arse', 'arsehole',
  'bitch', 'bitchy', 'bitches',
  'bastard', 'bastards',
  'damn', 'goddamn', 'goddammit', 'dammit',
  'crap', 'crappy',
  'piss', 'pissed',
  'hell', 'bloody', 'bollocks', 'wanker', 'twat', 'tosser', 'git',
  // Slurs & hate language
  'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'spic', 'kike', 'chink', 'gook',
  // Sexual terms
  'cock', 'dick', 'penis', 'vagina', 'pussy', 'cunt', 'clitoris',
  'boob', 'boobs', 'tit', 'tits', 'nipple', 'nipples',
  'dildo', 'vibrator', 'butt plug', 'anal', 'anus',
  'cum', 'cumshot', 'jizz', 'sperm', 'semen',
  'blowjob', 'handjob', 'rimjob', 'rim job', 'blow job', 'hand job',
  'masturbate', 'masturbation', 'masturbating', 'jerk off', 'jack off',
  'sex', 'sexy', 'sexting', 'intercourse',
  'porn', 'porno', 'pornography', 'pornographic',
  'nude', 'nudity', 'naked',
  'erection', 'boner', 'hard-on', 'hardon',
  'orgasm', 'ejaculate', 'ejaculation',
  'whore', 'slut', 'hoe', 'hooker', 'prostitute', 'escort',
  'rape', 'rapist',
  'horny', 'kinky',
]

// Pre-compile the regex once (case-insensitive, whole words only)
const BLACKLIST_RE = new RegExp(
  '\\b(' + BLACKLIST.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')).join('|') + ')\\b',
  'gi'
)

function censorText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let last = 0
  BLACKLIST_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = BLACKLIST_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const word = match[0]
    // Black-box the beginning; reveal the last character
    const hidden = word.slice(0, -1)
    const revealed = word.slice(-1)
    parts.push(
      <span key={match.index} style={{ display: 'inline' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            background: '#000',
            borderRadius: '3px',
            width: `${hidden.length * 0.55}em`,
            height: '1em',
            verticalAlign: 'middle',
            marginInline: '1px',
            userSelect: 'none',
          }}
        />
        {revealed}
      </span>
    )
    last = match.index + word.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

interface NoteViewProps {
  note: Note
  fontSize: number
  initialEditing?: boolean
  onUpdate: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function scrollKey(id: string) {
  return `note-scroll-${id}`
}

export function NoteView({ note, fontSize, initialEditing = false, onUpdate, onDelete, onClose }: NoteViewProps) {
  const [editing, setEditing] = useState(initialEditing)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [readProgress, setReadProgress] = useState(0)
  const [censorMode, setCensorMode] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore saved scroll position once the scroll container is mounted
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const saved = localStorage.getItem(scrollKey(note.id))
    if (saved !== null) {
      el.scrollTop = Number(saved)
    }
  }, [note.id])

  // Focus textarea when entering edit mode initially
  useEffect(() => {
    if (initialEditing) {
      requestAnimationFrame(() => contentRef.current?.focus())
    }
  }, [])

  const updateProgress = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const scrollable = scrollHeight - clientHeight
    const pct = scrollable > 0 ? Math.round((scrollTop / scrollable) * 100) : 100
    setReadProgress(pct)
  }, [])

  const handleScroll = useCallback(() => {
    updateProgress()

    // Debounced persist
    if (saveScrollTimer.current) clearTimeout(saveScrollTimer.current)
    saveScrollTimer.current = setTimeout(() => {
      const el = scrollRef.current
      if (el) localStorage.setItem(scrollKey(note.id), String(el.scrollTop))
    }, 200)
  }, [note.id, updateProgress])

  // Compute initial progress once layout settles
  useEffect(() => {
    // rAF ensures the browser has painted and scrollHeight is accurate
    const id = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(id)
  }, [note.id, updateProgress])

  // Save position on unmount (handles close without scrolling)
  useEffect(() => {
    return () => {
      if (saveScrollTimer.current) clearTimeout(saveScrollTimer.current)
      const el = scrollRef.current
      if (el) localStorage.setItem(scrollKey(note.id), String(el.scrollTop))
    }
  }, [note.id])

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
              onClick={() => setContent(content.replace(/\n{2,}/g, '\n').replace(/\n/g, ' ').replace(/\.(?!\.)\ */g, '.\n'))}
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
            {/* Reading progress badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium tabular-nums select-none"
              title="Reading progress"
            >
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>{readProgress}%</span>
            </div>
            {/* Censor toggle */}
            <button
              onClick={() => setCensorMode(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                censorMode
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={censorMode ? 'Show all words' : 'Censor sensitive words'}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                {censorMode ? (
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                ) : (
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                )}
              </svg>
              {censorMode ? 'Censored' : 'Censor'}
            </button>
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
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6">
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
              {note.content
                ? (censorMode ? censorText(note.content) : note.content)
                : <span className="text-slate-600 italic">Empty note. Click Edit to start writing.</span>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
