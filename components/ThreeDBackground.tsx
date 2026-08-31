'use client'

import { useEffect, useState } from 'react'

const FOOD_ICONS = ['🍔', '🍕', '🌮', '🍣', '🥗', '🍟', '🍗', '🥘', '🍝', '🍩', '🧁', '🍰', '🥤', '🫔', '🌯', '🥨']
const ORBIT_COLORS = ['#ff2442', '#ff5c8a', '#b3001b', '#ff2442', '#8a0013', '#ff5c8a']

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
        opacity: intensity === 'full' ? rand(0.12, 0.25) : rand(0.07, 0.13),
        filter: 'blur(0.4px)',
      },
    }))
    setParticles(items)
  }, [intensity])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ perspective: '1400px' }}>
      {/* Fond noir profond + lueurs rouges animées */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0" style={{ animation: 'mesh-shift 20s ease-in-out infinite' }}>
        <div className="absolute -left-[20%] -top-[20%] h-[70%] w-[70%] rounded-full bg-[#ff2442]/[0.18] blur-[140px] animate-glow-pulse" />
        <div className="absolute -right-[15%] top-[6%] h-[60%] w-[60%] rounded-full bg-[#b3001b]/[0.22] blur-[130px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[-14%] left-[16%] h-[65%] w-[65%] rounded-full bg-[#ff5c8a]/[0.14] blur-[140px] animate-glow-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute left-[38%] top-[36%] h-[50%] w-[50%] rounded-full bg-[#8a0013]/[0.18] blur-[120px] animate-glow-pulse" style={{ animationDelay: '2.2s' }} />
      </div>

      {/* Formes 3D rouges/noires qui flottent */}
      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        <div className="absolute left-[8%] top-[12%] h-24 w-24 rounded-3xl border-2 border-[#ff2442]/30 bg-gradient-to-br from-[#ff2442]/30 to-black/60 shadow-[0_20px_60px_-15px_rgba(255,36,66,0.6)]" style={{ animation: 'tilt-float 8s ease-in-out infinite', transformStyle: 'preserve-3d' }} />
        <div className="absolute right-[8%] top-[30%] h-16 w-16 rounded-2xl border-2 border-[#ff5c8a]/30 bg-gradient-to-tr from-[#ff5c8a]/30 to-transparent shadow-[0_20px_50px_-15px_rgba(255,92,138,0.6)]" style={{ animation: 'bounce-3d 6s ease-in-out infinite 0.5s', transformStyle: 'preserve-3d' }} />
        <div className="absolute bottom-[20%] left-[10%] h-28 w-28 rounded-[2rem] border-2 border-[#b3001b]/30 bg-gradient-to-bl from-[#b3001b]/30 to-black/70 shadow-[0_25px_60px_-15px_rgba(179,0,27,0.6)]" style={{ animation: 'tilt-float 10s ease-in-out infinite 1s', transformStyle: 'preserve-3d' }} />
        <div className="absolute bottom-[12%] right-[9%] h-14 w-14 rounded-xl border-2 border-[#ff2442]/30 bg-gradient-to-tl from-[#ff2442]/25 to-transparent shadow-[0_18px_45px_-15px_rgba(255,36,66,0.6)]" style={{ animation: 'bounce-3d 5.5s ease-in-out infinite 1.2s', transformStyle: 'preserve-3d' }} />
        {intensity === 'full' && (
          <>
            <div className="absolute left-[44%] top-[6%] h-16 w-16 rounded-2xl border-2 border-[#ff2442]/30 bg-gradient-to-r from-[#ff2442]/25 to-transparent shadow-[0_20px_50px_-15px_rgba(255,36,66,0.55)]" style={{ animation: 'tilt-float 7s ease-in-out infinite 0.3s', transformStyle: 'preserve-3d' }} />
            <div className="absolute left-[20%] top-[55%] h-12 w-12 rounded-full border-2 border-[#ff5c8a]/30 bg-gradient-to-br from-[#ff5c8a]/25 to-transparent shadow-[0_15px_40px_-15px_rgba(255,92,138,0.6)]" style={{ animation: 'bounce-3d 7.5s ease-in-out infinite 2s', transformStyle: 'preserve-3d' }} />
            <div className="absolute right-[24%] top-[58%] h-20 w-20 rounded-3xl border-2 border-[#b3001b]/30 bg-gradient-to-t from-[#b3001b]/25 to-black/70 shadow-[0_20px_50px_-15px_rgba(179,0,27,0.6)]" style={{ animation: 'tilt-float 9s ease-in-out infinite 1.5s', transformStyle: 'preserve-3d' }} />
            <div className="absolute left-[30%] bottom-[8%] h-14 w-14 rounded-full border-2 border-[#ff2442]/30 bg-gradient-to-b from-[#ff2442]/25 to-transparent shadow-[0_16px_42px_-15px_rgba(255,36,66,0.6)]" style={{ animation: 'bounce-3d 6.5s ease-in-out infinite 0.8s', transformStyle: 'preserve-3d' }} />
          </>
        )}
      </div>

      {/* Anneaux 3D orbitaux rouges */}
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
              borderColor: `${color}40`,
              boxShadow: `inset 0 0 30px ${color}30`,
              animation: `orbit-3d ${16 + i * 3}s linear infinite ${i * 0.8}s`,
            }}
          />
        ))}
      </div>

      {particles.map((p) => (
        <div key={p.id} className="absolute select-none" style={p.style}>{p.icon}</div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
    </div>
  )
}
