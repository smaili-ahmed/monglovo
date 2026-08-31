'use client'

import { useEffect, useState } from 'react'

const FOOD_ICONS = ['🍔', '🍕', '🌮', '🍣', '🥗', '🍟', '🍗', '🥘', '🍝', '🍩', '🧁', '🍰', '🥤', '🫔', '🌯', '🥨']
const ORBIT_COLORS = ['#ff2442', '#ffb100', '#ff5c8a', '#7c3aed', '#00c9a7', '#ff8c00']

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export default function ThreeDBackground({ intensity = 'full' }: { intensity?: 'full' | 'light' }) {
  const [particles, setParticles] = useState<{ icon: string; id: number; style: React.CSSProperties }[]>([])

  useEffect(() => {
    const count = intensity === 'full' ? 24 : 9
    const items = Array.from({ length: count }, (_, i) => ({
      id: i,
      icon: FOOD_ICONS[i % FOOD_ICONS.length],
      style: {
        left: `${rand(0, 100)}%`,
        top: `${rand(0, 100)}%`,
        fontSize: `${rand(20, 42)}px`,
        animation: `bounce-3d ${rand(7, 14)}s ease-in-out ${rand(0, 4)}s infinite`,
        opacity: intensity === 'full' ? rand(0.1, 0.22) : rand(0.06, 0.12),
        filter: 'blur(0.4px)',
      },
    }))
    setParticles(items)
  }, [intensity])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ perspective: '1400px' }}>
      {/* Grandes lueurs colorées animées */}
      <div className="absolute inset-0" style={{ animation: 'mesh-shift 20s ease-in-out infinite' }}>
        <div className="absolute -left-[20%] -top-[20%] h-[65%] w-[65%] rounded-full bg-primary/[0.12] blur-[130px] animate-glow-pulse" />
        <div className="absolute -right-[15%] top-[8%] h-[55%] w-[55%] rounded-full bg-accent/[0.14] blur-[120px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[-12%] left-[18%] h-[60%] w-[60%] rounded-full bg-fuchsia-500/[0.10] blur-[130px] animate-glow-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute left-[40%] top-[38%] h-[45%] w-[45%] rounded-full bg-cyan-400/[0.08] blur-[110px] animate-glow-pulse" style={{ animationDelay: '2.2s' }} />
      </div>

      {/* Formes 3D colorées qui orbitent et basculent */}
      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        <div className="absolute left-[8%] top-[12%] h-24 w-24 rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/25 to-accent/10 shadow-[0_20px_60px_-15px_rgba(255,36,66,0.5)]" style={{ animation: 'tilt-float 8s ease-in-out infinite', transformStyle: 'preserve-3d' }} />
        <div className="absolute right-[8%] top-[30%] h-16 w-16 rounded-2xl border-2 border-accent/25 bg-gradient-to-tr from-accent/30 to-transparent shadow-[0_20px_50px_-15px_rgba(255,177,0,0.5)]" style={{ animation: 'bounce-3d 6s ease-in-out infinite 0.5s', transformStyle: 'preserve-3d' }} />
        <div className="absolute bottom-[20%] left-[10%] h-28 w-28 rounded-[2rem] border-2 border-fuchsia-500/20 bg-gradient-to-bl from-fuchsia-500/25 to-transparent shadow-[0_25px_60px_-15px_rgba(217,70,239,0.5)]" style={{ animation: 'tilt-float 10s ease-in-out infinite 1s', transformStyle: 'preserve-3d' }} />
        <div className="absolute bottom-[12%] right-[9%] h-14 w-14 rounded-xl border-2 border-cyan-400/25 bg-gradient-to-tl from-cyan-400/25 to-transparent shadow-[0_18px_45px_-15px_rgba(34,211,238,0.5)]" style={{ animation: 'bounce-3d 5.5s ease-in-out infinite 1.2s', transformStyle: 'preserve-3d' }} />
        {intensity === 'full' && (
          <>
            <div className="absolute left-[44%] top-[6%] h-16 w-16 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/20 to-transparent shadow-[0_20px_50px_-15px_rgba(255,36,66,0.45)]" style={{ animation: 'tilt-float 7s ease-in-out infinite 0.3s', transformStyle: 'preserve-3d' }} />
            <div className="absolute left-[20%] top-[55%] h-12 w-12 rounded-full border-2 border-accent/25 bg-gradient-to-br from-accent/25 to-transparent shadow-[0_15px_40px_-15px_rgba(255,177,0,0.5)]" style={{ animation: 'bounce-3d 7.5s ease-in-out infinite 2s', transformStyle: 'preserve-3d' }} />
            <div className="absolute right-[24%] top-[58%] h-20 w-20 rounded-3xl border-2 border-emerald-400/20 bg-gradient-to-t from-emerald-400/20 to-transparent shadow-[0_20px_50px_-15px_rgba(52,211,153,0.5)]" style={{ animation: 'tilt-float 9s ease-in-out infinite 1.5s', transformStyle: 'preserve-3d' }} />
            <div className="absolute left-[30%] bottom-[8%] h-14 w-14 rounded-full border-2 border-rose-400/25 bg-gradient-to-b from-rose-400/25 to-transparent shadow-[0_16px_42px_-15px_rgba(251,113,133,0.5)]" style={{ animation: 'bounce-3d 6.5s ease-in-out infinite 0.8s', transformStyle: 'preserve-3d' }} />
          </>
        )}
      </div>

      {/* Anneaux colorés en 3D orbitale */}
      <div className="absolute inset-0" style={{ perspective: '900px' }}>
        {ORBIT_COLORS.map((color, i) => (
          <div
            key={i}
            className="absolute rounded-full border-2"
            style={{
              left: `${8 + i * 5}%`,
              top: `${20 + (i % 3) * 15}%`,
              width: `${90 - i * 10}px`,
              height: `${90 - i * 10}px`,
              borderColor: `${color}33`,
              boxShadow: `inset 0 0 30px ${color}22`,
              animation: `orbit-3d ${16 + i * 3}s linear infinite ${i * 0.8}s`,
            }}
          />
        ))}
      </div>

      {particles.map((p) => (
        <div key={p.id} className="absolute select-none" style={p.style}>{p.icon}</div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/85" />
    </div>
  )
}
