'use client'

import { useEffect, useState } from 'react'

const FOOD_ICONS = ['🍔', '🍕', '🌮', '🍣', '🥗', '🍟', '🍗', '🥘', '🍝', '🍩', '🧁', '🍰', '🥤', '🫔', '🌯', '🥨']

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export default function ThreeDBackground({ intensity = 'full' }: { intensity?: 'full' | 'light' }) {
  const [particles, setParticles] = useState<{ icon: string; id: number; style: React.CSSProperties }[]>([])

  useEffect(() => {
    const count = intensity === 'full' ? 20 : 8
    const items = Array.from({ length: count }, (_, i) => ({
      id: i,
      icon: FOOD_ICONS[i % FOOD_ICONS.length],
      style: {
        left: `${rand(0, 100)}%`,
        top: `${rand(0, 100)}%`,
        fontSize: `${rand(18, 36)}px`,
        animation: `float-3d ${rand(10, 20)}s ease-in-out ${rand(0, 5)}s infinite`,
        opacity: rand(0.06, 0.15),
        filter: 'blur(0.3px)',
      },
    }))
    setParticles(items)
  }, [intensity])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ perspective: '1200px' }}>
      <div className="absolute inset-0" style={{ animation: 'mesh-shift 20s ease-in-out infinite' }}>
        <div className="absolute -left-[20%] -top-[20%] h-[60%] w-[60%] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute -right-[15%] top-[10%] h-[50%] w-[50%] rounded-full bg-amber-400/[0.05] blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[55%] w-[55%] rounded-full bg-primary/[0.04] blur-[110px]" />
      </div>

      <div className="absolute left-[8%] top-[12%] size-[250px] rounded-full bg-primary/[0.05] blur-[90px]" />
      <div className="absolute right-[10%] top-[30%] size-[200px] rounded-full bg-amber-400/[0.04] blur-[70px]" style={{ animationDelay: '2s' }} />
      <div className="absolute left-[35%] bottom-[15%] size-[280px] rounded-full bg-primary/[0.03] blur-[100px]" style={{ animationDelay: '4s' }} />

      <div className="absolute inset-0" style={{ perspective: '900px' }}>
        <div className="absolute left-[6%] top-[18%] h-20 w-20 rounded-3xl border border-primary/[0.08] bg-gradient-to-br from-primary/[0.05] to-transparent" style={{ animation: 'spin3d-a 18s linear infinite', transformStyle: 'preserve-3d' }} />
        <div className="absolute right-[7%] top-[32%] h-14 w-14 rounded-2xl border border-amber-300/[0.1] bg-gradient-to-tr from-amber-400/[0.05] to-transparent" style={{ animation: 'spin3d-b 14s linear infinite', transformStyle: 'preserve-3d' }} />
        <div className="absolute bottom-[22%] left-[12%] h-24 w-24 rounded-[2rem] border border-primary/[0.06] bg-gradient-to-bl from-primary/[0.04] to-transparent" style={{ animation: 'spin3d-a 22s linear infinite 2s', transformStyle: 'preserve-3d' }} />
        <div className="absolute bottom-[12%] right-[10%] h-12 w-12 rounded-xl border border-primary/[0.07] bg-gradient-to-tl from-primary/[0.05] to-transparent" style={{ animation: 'spin3d-b 16s linear infinite 1s', transformStyle: 'preserve-3d' }} />
        {intensity === 'full' && (
          <>
            <div className="absolute left-[42%] top-[6%] h-16 w-16 rounded-2xl border border-primary/[0.06] bg-gradient-to-r from-primary/[0.04] to-transparent" style={{ animation: 'spin3d-a 20s linear infinite 4s', transformStyle: 'preserve-3d' }} />
            <div className="absolute left-[22%] top-[55%] h-10 w-10 rounded-full border border-amber-300/[0.08] bg-gradient-to-br from-amber-400/[0.04] to-transparent" style={{ animation: 'spin3d-b 12s linear infinite 3s', transformStyle: 'preserve-3d' }} />
          </>
        )}
      </div>

      {particles.map((p) => (
        <div key={p.id} className="absolute select-none" style={p.style}>{p.icon}</div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
    </div>
  )
}
