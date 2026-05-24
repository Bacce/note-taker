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

/** Splits a string into chunks of at most `size` chars, only breaking between words. */
function wrapAtWords(text: string, size: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
    } else if (current.length + 1 + word.length <= size) {
      current += ' ' + word
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function splitText(text: string, size = 180, softMin = 160): string[] {
  const chunks: string[] = []
  let segStart = 0
  let lastSoftBreak = -1 // absolute index of most recent ; or : in the current segment

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const segLen = i - segStart + 1

    if (ch === ';' || ch === ':') {
      if (segLen >= softMin) {
        // Long enough – split immediately at this delimiter
        chunks.push(text.slice(segStart, i + 1).trim())
        while (i + 1 < text.length && text[i + 1] === ' ') i++
        segStart = i + 1
        lastSoftBreak = -1
      } else {
        // Too short to split yet, but remember this position
        lastSoftBreak = i
      }
    } else if ((ch === '.' || ch === '!' || ch === '?') && segLen >= size) {
      // Hard split: sentence ending once past the hard limit
      chunks.push(text.slice(segStart, i + 1).trim())
      while (i + 1 < text.length && text[i + 1] === ' ') i++
      segStart = i + 1
      lastSoftBreak = -1
    } else if (segLen > size) {
      if (lastSoftBreak >= segStart) {
        // Prefer the last seen ; or : over an arbitrary word boundary
        chunks.push(text.slice(segStart, lastSoftBreak + 1).trim())
        let j = lastSoftBreak + 1
        while (j < text.length && text[j] === ' ') j++
        segStart = j
        i = segStart - 1 // loop will i++ → resumes at segStart
        lastSoftBreak = -1
      } else {
        // No delimiter seen – fall back to last word boundary
        const segment = text.slice(segStart, i + 1)
        const lastSpace = segment.lastIndexOf(' ')
        if (lastSpace > 0) {
          chunks.push(segment.slice(0, lastSpace).trim())
          segStart += lastSpace + 1
          i = segStart - 1
        } else {
          chunks.push(segment.trim())
          segStart = i + 1
        }
        lastSoftBreak = -1
      }
    }
  }

  // Push any remaining text
  const remaining = text.slice(segStart).trim()
  if (remaining) {
    chunks.push(...(remaining.length > size ? wrapAtWords(remaining, size) : [remaining]))
  }

  return chunks.filter(Boolean)
}

interface NoteViewProps {
  note: Note
  fontSize: number
  initialEditing?: boolean
  onUpdate: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'read'>>) => void
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

  // Speech Synthesis state & refs
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [startLineIdx, setStartLineIdx] = useState<number | null>(null) // index of paragraph where playback begins
  const queueRef = useRef<string[]>([])
  const indexRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  const isPausedRef = useRef<boolean>(false)

  const stopSpeech = useCallback(() => {
    speechSynthesis.cancel()
    queueRef.current = []
    indexRef.current = 0
    isPlayingRef.current = false
    isPausedRef.current = false
    setIsPlaying(false)
    setIsPaused(false)
  }, [])

  const speakNext = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current) return

    if (indexRef.current >= queueRef.current.length) {
      stopSpeech()
      return
    }

    const currentText = queueRef.current[indexRef.current]
    const utterance = new SpeechSynthesisUtterance(currentText)
    utterance.lang = 'en-US'
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onend = () => {
      if (isPlayingRef.current && !isPausedRef.current) {
        indexRef.current++
        speakNext()
      }
    }

    utterance.onerror = (e) => {
      console.error('Speech synthesis error', e)
      if (isPlayingRef.current && !isPausedRef.current) {
        indexRef.current++
        speakNext()
      }
    }

    speechSynthesis.speak(utterance)
  }, [stopSpeech])

  const getFirstVisibleLineIndex = useCallback(() => {
    const el = scrollRef.current
    if (!el) return 0
    // Query children inside the read view lines container specifically
    const children = el.querySelectorAll('[data-line-index]')
    const containerRect = el.getBoundingClientRect()

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const rect = child.getBoundingClientRect()
      // If the bottom of this line is below or at the top of the visible container
      if (rect.bottom >= containerRect.top) {
        const idx = parseInt(child.getAttribute('data-line-index') || '0', 10)
        return idx
      }
    }
    return 0
  }, [])

  const startSpeech = useCallback(() => {
    const lines = note.content.split('\n');
    const startIdx = startLineIdx !== null ? startLineIdx : getFirstVisibleLineIndex();
    const visibleText = lines.slice(startIdx).join('\n');

    if (!visibleText.trim()) return;

    // Store where playback starts for UI highlight
    setStartLineIdx(startIdx);

    queueRef.current = splitText(visibleText);
    indexRef.current = 0;
    isPlayingRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);

    speechSynthesis.cancel();
    speakNext();
  }, [note.content, getFirstVisibleLineIndex, speakNext, startLineIdx]);

  const toggleSpeech = useCallback(() => {
    if (!isPlayingRef.current) {
      startSpeech()
    } else {
      if (isPausedRef.current) {
        isPausedRef.current = false
        setIsPaused(false)
        speechSynthesis.resume()
      } else {
        isPausedRef.current = true
        setIsPaused(true)
        speechSynthesis.pause()
      }
    }
  }, [startSpeech])

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

  // Cleanup speech on unmount or when note changes
  useEffect(() => {
    return () => {
      speechSynthesis.cancel()
    }
  }, [note.id])

  // Stop playback if we enter editing mode
  useEffect(() => {
    if (editing) {
      stopSpeech()
      setStartLineIdx(null)
    }
  }, [editing, stopSpeech])

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
              onClick={() => setContent(
                content
                  .replace(/\r?\n/g, ' ')                // flatten all newlines → spaces
                  .replace(/[ \t]+/g, ' ')               // collapse multiple spaces/tabs to one
                  .replace(/([?!])\s*/g, '$1\n')         // break after ? and !
                  .replace(/(?<!\.)\.(?!\.)\s*/g, '.\n') // break after . but not inside ...
                  .split('\n')
                  .map(s => s.trim())                    // strip any leading spaces per line
                  .filter(s => s.length > 0)             // drop blank lines
                  .join('\n')
              )}
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${censorMode
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
              onClick={() => onUpdate(note.id, { read: !note.read })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${note.read
                ? 'bg-emerald-900/30 text-emerald-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              title={note.read ? 'Mark as unread' : 'Mark as read'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {note.read ? 'Read' : 'Mark read'}
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
              {note.content ? (
                note.content.split('\n').map((line, lineIdx) => (
                  <div
                    key={lineIdx}
                    data-line-index={lineIdx}
                    className={`min-h-[1.5em] ${startLineIdx !== null && lineIdx === startLineIdx ? 'bg-indigo-200/30' : ''} cursor-pointer hover:bg-indigo-100/30`}
                    onClick={() => setStartLineIdx(lineIdx)}
                  >
                    {censorMode ? censorText(line) : line}
                  </div>
                ))
              ) : (
                <span className="text-slate-600 italic">Empty note. Click Edit to start writing.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Play-Pause & Stop Controls */}
      {!editing && note.content && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {isPlaying && (
            <button
              onClick={() => stopSpeech()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/95 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shadow-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              title="Stop listening"
              aria-label="Stop"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="5" width="14" height="14" rx="1.5" />
              </svg>
            </button>
          )}

          <button
            onClick={toggleSpeech}
            className="relative w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
            title={isPlaying ? (isPaused ? 'Resume listening' : 'Pause listening') : 'Listen to note'}
            aria-label={isPlaying ? (isPaused ? 'Resume' : 'Pause') : 'Listen'}
          >
            {/* Pulsating ring when active & speaking */}
            {isPlaying && !isPaused && (
              <span className="absolute -inset-1.5 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
            )}

            {/* Glowing background */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 group-hover:opacity-90 transition-opacity" />

            {/* Icon (Play / Pause) */}
            <span className="relative z-10">
              {isPlaying && !isPaused ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
