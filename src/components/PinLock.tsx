import { useState } from 'react'

const PIN = '0007'
const PIN_LENGTH = 4

interface PinLockProps {
  onUnlock: () => void
}

export function PinLock({ onUnlock }: PinLockProps) {
  const [entered, setEntered] = useState('')
  const [error, setError] = useState(false)

  function handleDigit(digit: string) {
    setError(false)
    const next = entered + digit
    if (next.length === PIN_LENGTH) {
      if (next === PIN) {
        onUnlock()
      } else {
        setError(true)
        setEntered('')
      }
    } else {
      setEntered(next)
    }
  }

  function handleDelete() {
    setError(false)
    setEntered(prev => prev.slice(0, -1))
  }

  return (
    <div className="h-dvh flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 text-center mb-2">Enter PIN</h1>
          <p className={`text-sm text-center h-5 ${error ? 'text-red-400' : 'text-transparent'}`}>
            {error ? 'Wrong PIN, try again' : '.'}
          </p>
        </div>

        <div className="flex gap-3">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < entered.length
                  ? 'bg-indigo-500 border-indigo-500'
                  : 'border-slate-600'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
            <button
              key={key || 'empty'}
              onClick={() => {
                if (key === '⌫') handleDelete()
                else if (key) handleDigit(key)
              }}
              disabled={!key}
              className={`w-16 h-16 rounded-full text-xl font-medium transition-colors ${
                key
                  ? 'text-slate-100 hover:bg-slate-800 active:bg-slate-700 cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
