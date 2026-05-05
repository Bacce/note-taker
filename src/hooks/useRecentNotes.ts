import { useState, useCallback } from 'react'

const STORAGE_KEY = 'recent-notes'
const MAX = 5

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useRecentNotes() {
  const [recentIds, setRecentIds] = useState<string[]>(load)

  const visit = useCallback((id: string) => {
    setRecentIds(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, MAX)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { recentIds, visit }
}
