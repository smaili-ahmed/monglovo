'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, CircleUserRound, MapPin, Search, ShoppingBag, X, Star, Clock, SlidersHorizontal } from 'lucide-react'
import type { FrontRestaurant } from '@/lib/restaurant-service'
import ThreeDBackground from './ThreeDBackground'

const categories = [
  ['Burgers', '🍔'], ['Américain', '🍟'], ['Sandwichs', '🥪'], ['International', '🌍'],
  ['Pizza', '🍕'], ['Tacos', '🌮'], ['Italien', '🍝'], ['Grillades', '🥩'],
  ['Chawarma', '🌯'], ['Poulet', '🍗'], ['Asiatique', '🥢'], ['Sushi', '🍣'],
  ['Marocain', '🥘'], ['Oriental', '🧆'], ['Sucré', '🍩'],
]

const cuisineAliases: Record<string, string> = {
  Burgers: 'Burgers', Américain: 'American', Sandwichs: 'Sandwich', International: 'International',
  Pizza: 'Pizza', Tacos: 'Tacos', Italien: 'Italian', Grillades: 'Grill', Chawarma: 'Shawarma',
  Poulet: 'Chicken', Asiatique: 'Asian', Sushi: 'Sushi', Marocain: 'Moroccan',
  Oriental: 'Oriental', Sucré: 'Sweets',
}

export default function RestaurantsPage({ restaurants }: { restaurants: (FrontRestaurant | Record<string, any>)[] }) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [topRated, setTopRated] = useState(false)

  const visibleRestaurants = useMemo(() => (restaurants as any[]).filter((r) => {
    const matchesQuery = r.name.toLowerCase().includes(query.toLowerCase())
    const ratingNum = Number(String(r.rating ?? '').replace('%', '')) || 0
    const wantedCuisine = cuisineAliases[activeCategory] ?? activeCategory
    return matchesQuery && (!topRated || ratingNum >= 95) && (!activeCategory || activeCategory === 'Tous' || r.cuisines?.includes(wantedCuisine))
  }), [restaurants, query, topRated, activeCategory])

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <ThreeDBackground intensity="light" />

      <header className="relative z-10 mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="/" aria-label="Oujda Food" className="flex items-center gap-2.5">
          <img src="/oujda-food-logo.svg" alt="" className="h-9 w-9" />
          <span className="text-xl font-black tracking-tight">Oujda <span className="text-primary">Food</span></span>
        </a>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-bold transition-colors hover:bg-muted/80">
            <MapPin className="size-4 text-primary" /> Oujda <ChevronDown className="size-3.5" />
          </button>
          <a href="/" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20">
            <CircleUserRound className="size-4" /> Connexion
          </a>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-sm">
          <a href="/" className="font-bold text-primary transition-colors hover:text-primary/80">Accueil</a>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-muted-foreground">Restaurants</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Tous les restaurants</h1>
        <p className="mt-2 text-muted-foreground">{visibleRestaurants.length} etablissements disponibles a Oujda</p>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none">
          <button onClick={() => setActiveCategory('Tous')} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${activeCategory === 'Tous' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted hover:bg-muted/80'}`}>Tous</button>
          {categories.map(([name, emoji]) => (
            <button key={name} onClick={() => setActiveCategory(name)} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${activeCategory === name ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted hover:bg-muted/80'}`}>
              {emoji} {name}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un restaurant..." className="h-11 w-full rounded-2xl bg-muted pl-11 pr-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={() => setTopRated(!topRated)} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${topRated ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted hover:bg-muted/80'}`}>
            <Star className="size-4" /> Meilleures notes
          </button>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRestaurants.map((r: any, idx: number) => {
            const topRatedItem = Number(String(r.rating ?? '').replace('%', '')) >= 95
            return (
              <a key={r.slug} href={`/restaurant/${r.slug}`} className="group block rounded-2xl bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-muted">
                  <img src={r.image} alt={r.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {r.promotion && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg">{r.promotion}</span>}
                  <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">
                    <Star className="mr-1 inline size-3.5 fill-amber-400 text-amber-400" />{r.rating ?? '--'}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold leading-tight">{r.name}</h3>
                    {topRatedItem && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Top Rated</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="size-3" /> 20-35 min</span>
                    <span>Gratuit</span>
                    <span>{r.reviews} avis</span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
        {visibleRestaurants.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg font-bold text-muted-foreground">Aucun restaurant trouve</p>
            <p className="mt-2 text-sm text-muted-foreground">Essayez un autre terme de recherche ou categorie.</p>
          </div>
        )}
      </section>
    </main>
  )
}
