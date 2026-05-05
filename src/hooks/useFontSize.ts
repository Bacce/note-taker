import { useState, useCallback } from 'react'

const STORAGE_KEY = 'font-size'
const MIN = 12
const MAX = 28
const STEP = 2
const DEFAULT = 16

function load(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const val = Number(raw)
      if (val >= MIN && val <= MAX) return val
    }
  } catch { /* ignore */ }
  return DEFAULT
}

export function useFontSize() {
  const [fontSize, setFontSize] = useState(load)

  const set = useCallback((size: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, size))
    setFontSize(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
  }, [])

  const increase = useCallback(() => set(fontSize + STEP), [fontSize, set])
  const decrease = useCallback(() => set(fontSize - STEP), [fontSize, set])

  return { fontSize, increase, decrease, canIncrease: fontSize < MAX, canDecrease: fontSize > MIN }
}
