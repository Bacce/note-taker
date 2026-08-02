import { useState, useRef, useEffect, useCallback } from "react";
import type { Note } from "../types";

interface NoteViewProps {
  note: Note;
  fontSize: number;
  initialEditing?: boolean;
  onUpdate: (
    id: string,
    updates: Partial<Pick<Note, "title" | "content" | "read">>,
  ) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function scrollKey(id: string) {
  return `note-scroll-${id}`;
}

export function NoteView({
  note,
  fontSize,
  initialEditing = false,
  onUpdate,
  onDelete,
  onClose,
}: NoteViewProps) {
  const [editing, setEditing] = useState(initialEditing);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [readProgress, setReadProgress] = useState(0);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore saved scroll position once the scroll container is mounted
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = localStorage.getItem(scrollKey(note.id));
    if (saved !== null) {
      el.scrollTop = Number(saved);
    }
  }, [note.id]);

  // Focus textarea when entering edit mode initially
  useEffect(() => {
    if (initialEditing) {
      requestAnimationFrame(() => contentRef.current?.focus());
    }
  }, []);

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollable = scrollHeight - clientHeight;
    const pct =
      scrollable > 0 ? Math.round((scrollTop / scrollable) * 100) : 100;
    setReadProgress(pct);
  }, []);

  const handleScroll = useCallback(() => {
    updateProgress();

    // Debounced persist
    if (saveScrollTimer.current) clearTimeout(saveScrollTimer.current);
    saveScrollTimer.current = setTimeout(() => {
      const el = scrollRef.current;
      if (el) localStorage.setItem(scrollKey(note.id), String(el.scrollTop));
    }, 200);
  }, [note.id, updateProgress]);

  // Compute initial progress once layout settles
  useEffect(() => {
    // rAF ensures the browser has painted and scrollHeight is accurate
    const id = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(id);
  }, [note.id, updateProgress]);

  // Save position on unmount (handles close without scrolling)
  useEffect(() => {
    return () => {
      if (saveScrollTimer.current) clearTimeout(saveScrollTimer.current);
      const el = scrollRef.current;
      if (el) localStorage.setItem(scrollKey(note.id), String(el.scrollTop));
    };
  }, [note.id]);

  function save() {
    onUpdate(note.id, { title: title.trim() || "Untitled", content });
    setEditing(false);
  }

  function handleDelete() {
    if (window.confirm("Delete this note?")) {
      onDelete(note.id);
    }
  }

  function enterEdit() {
    setEditing(true);
    requestAnimationFrame(() => contentRef.current?.focus());
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
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        {editing ? (
          <>
            <button
              onClick={() => {
                const firstLine = content
                  .split("\n")
                  .find((l) => l.trim())
                  ?.trim();
                if (firstLine) setTitle(firstLine);
              }}
              className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Use first line of content as title"
            >
              Title from text
            </button>
            <button
              onClick={() =>
                setContent(
                  content
                    .replace(/\r?\n/g, " ") // flatten all newlines → spaces
                    .replace(/[ \t]+/g, " ") // collapse multiple spaces/tabs to one
                    .replace(/([?!])\s*/g, "$1\n") // break after ? and !
                    .replace(/(?<!\.)\.(?!\.)\s*/g, ".\n") // break after . but not inside ...
                    .split("\n")
                    .map((s) => s.trim()) // strip any leading spaces per line
                    .filter((s) => s.length > 0) // drop blank lines
                    .join("\n"),
                )
              }
              className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Remove newlines and break after each sentence"
            >
              Reflow
            </button>
            <button
              onClick={() => {
                setTitle(note.title);
                setContent(note.content);
                setEditing(false);
              }}
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
              <svg
                className="w-3 h-3 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span>{readProgress}%</span>
            </div>
            <button
              onClick={() => onUpdate(note.id, { read: !note.read })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                note.read
                  ? "bg-emerald-900/30 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title={note.read ? "Mark as unread" : "Mark as read"}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {note.read ? "Read" : "Mark read"}
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
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6"
      >
        {editing ? (
          <div className="flex flex-col gap-4 max-w-3xl">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="bg-transparent text-2xl font-semibold text-slate-100 outline-none border-b border-slate-700 pb-2 placeholder:text-slate-600"
              style={{ fontSize: fontSize + 6 }}
            />
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
              {note.title || "Untitled"}
            </h1>
            <div
              className="text-slate-300 whitespace-pre-wrap leading-relaxed"
              style={{ fontSize }}
            >
              {note.content ? (
                note.content.split("\n").map((line, lineIdx) => (
                  <div
                    key={lineIdx}
                    data-line-index={lineIdx}
                    className="min-h-[1.5em]"
                  >
                    {line}
                  </div>
                ))
              ) : (
                <span className="text-slate-600 italic">
                  Empty note. Click Edit to start writing.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
