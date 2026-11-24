import { useState } from 'react'

/** Before/after slider. Both images are drawn at the same box so the split lines up. */
export function Compare({ before, after, labels = ['Original', 'Result'] }: { before: string; after: string; labels?: [string, string] }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="checker relative overflow-hidden rounded-2xl ring-1 ring-slate-200 select-none dark:ring-slate-800">
      <img src={after} alt={labels[1]} className="block max-h-[60vh] w-full object-contain" />
      <img
        src={before}
        alt={labels[0]}
        className="absolute inset-0 block size-full object-contain"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.2)]" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs text-slate-700 shadow">
          ⇆
        </span>
      </div>
      <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{labels[0]}</span>
      <span className="absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{labels[1]}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare original and result"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}
