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

export interface SentenceInfo {
  index: number;
  text: string;
  rawText: string;
}

export function parseContentToLinesAndSentences(content: string) {
  const lines = content.split("\n");
  let globalIndex = 0;

  const parsedLines = lines.map((line, lineIndex) => {
    if (!line.trim()) {
      return { lineIndex, sentences: [] as SentenceInfo[] };
    }

    const matches = line.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [line];

    const sentences = matches
      .filter((s) => s.trim().length > 0)
      .map((s) => {
        const item: SentenceInfo = {
          index: globalIndex,
          text: s.trim(),
          rawText: s,
        };
        globalIndex++;
        return item;
      });

    return { lineIndex, sentences };
  });

  const allSentences: SentenceInfo[] = [];
  parsedLines.forEach((l) => l.sentences.forEach((s) => allSentences.push(s)));

  return { parsedLines, allSentences };
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(
    null,
  );

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sentenceIndexRef = useRef<number>(0);
  const allSentencesRef = useRef<SentenceInfo[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const { parsedLines, allSentences } = parseContentToLinesAndSentences(content);

  useEffect(() => {
    allSentencesRef.current = allSentences;
  }, [allSentences]);

  // Wake Lock helpers – keep screen on during TTS
  const requestWakeLock = useCallback(async () => {
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch (e) {
        console.warn("Wake Lock request failed:", e);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Re-acquire wake lock when the page becomes visible again
  useEffect(() => {
    const onVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        isPlayingRef.current &&
        !wakeLockRef.current
      ) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [requestWakeLock]);

  const stopSpeech = useCallback(() => {
    isPlayingRef.current = false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const speakSentence = useCallback(
    (index: number, sentencesList?: SentenceInfo[]) => {
      const list = sentencesList || allSentencesRef.current;
      if (index < 0 || index >= list.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }

      window.speechSynthesis.cancel();

      const currentSentence = list[index];
      sentenceIndexRef.current = index;
      setActiveSentenceIndex(index);

      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-sentence-index="${index}"]`);
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });

      const utterance = new SpeechSynthesisUtterance(currentSentence.text);

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        const nextIdx = sentenceIndexRef.current + 1;
        if (nextIdx < allSentencesRef.current.length) {
          speakSentence(nextIdx, allSentencesRef.current);
        } else {
          stopSpeech();
        }
      };

      utterance.onerror = (e) => {
        if (!isPlayingRef.current) return;
        console.error("Speech synthesis error", e);
        const nextIdx = sentenceIndexRef.current + 1;
        if (nextIdx < allSentencesRef.current.length) {
          speakSentence(nextIdx, allSentencesRef.current);
        } else {
          stopSpeech();
        }
      };

      isPlayingRef.current = true;
      setIsPlaying(true);
      requestWakeLock();
      window.speechSynthesis.speak(utterance);
    },
    [stopSpeech],
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopSpeech();
    } else {
      const list = allSentencesRef.current;
      if (list.length === 0) return;

      const startIndex =
        activeSentenceIndex !== null &&
        activeSentenceIndex >= 0 &&
        activeSentenceIndex < list.length
          ? activeSentenceIndex
          : 0;

      speakSentence(startIndex, list);
    }
  }, [isPlaying, activeSentenceIndex, stopSpeech, speakSentence]);

  const handleSentenceClick = useCallback(
    (index: number) => {
      setActiveSentenceIndex(index);
      if (isPlayingRef.current) {
        stopSpeech();
      }
    },
    [stopSpeech],
  );

  // Clean up speech on note change or unmount
  useEffect(() => {
    setActiveSentenceIndex(null);
    return () => {
      stopSpeech();
    };
  }, [note.id, stopSpeech]);

  // Stop playback when entering edit mode
  useEffect(() => {
    if (editing) {
      stopSpeech();
      setActiveSentenceIndex(null);
    }
  }, [editing, stopSpeech]);

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
              onClick={togglePlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isPlaying
                  ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={isPlaying ? "Stop" : "Play"}
            >
              {isPlaying ? (
                <>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1.5" />
                  </svg>
                  Stop
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </>
              )}
            </button>
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
              className="text-slate-300 leading-relaxed"
              style={{ fontSize }}
            >
              {note.content ? (
                parsedLines.map((lineInfo) => (
                  <div
                    key={lineInfo.lineIndex}
                    data-line-index={lineInfo.lineIndex}
                    className="min-h-[1.5em] my-0.5"
                  >
                    {lineInfo.sentences.length === 0 ? (
                      <br />
                    ) : (
                      lineInfo.sentences.map((sentence) => {
                        const isActive =
                          activeSentenceIndex === sentence.index;
                        return (
                          <span
                            key={sentence.index}
                            data-sentence-index={sentence.index}
                            onClick={() => handleSentenceClick(sentence.index)}
                            className={`cursor-pointer transition-colors duration-150 rounded px-1 py-0.5 mr-1 inline-block ${
                              isActive
                                ? "bg-indigo-600/40 text-indigo-100 font-medium ring-1 ring-indigo-400/50"
                                : "hover:bg-slate-800/80 hover:text-slate-100"
                            }`}
                          >
                            {sentence.rawText}
                          </span>
                        );
                      })
                    )}
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
