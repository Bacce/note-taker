import { useState, useCallback, useEffect } from 'react'
import type { Note } from '../types'
import { getAllNotes, putNote, removeNote } from '../db'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getAllNotes().then(all => {
      setNotes(all)
      setLoaded(true)
    })
  }, [])

  const createNote = useCallback(() => {
    const now = Date.now()
    const note: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled',
      content: '',
      read: false,
      createdAt: now,
      updatedAt: now,
    }
    setNotes(prev => [note, ...prev])
    putNote(note)
    return note
  }, [])

  const updateNote = useCallback((id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'read'>>) => {
    setNotes(prev => {
      const next = prev.map(n => {
        if (n.id !== id) return n
        const updated = { ...n, ...updates, updatedAt: Date.now() }
        putNote(updated)
        return updated
      })
      return next
    })
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    removeNote(id)
  }, [])

  return { notes, loaded, createNote, updateNote, deleteNote }
}
