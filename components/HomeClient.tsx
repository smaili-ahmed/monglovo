'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, CircleUserRound, MapPin, Search, ShoppingBag, X, Star, Clock } from 'lucide-react'
import type { FrontRestaurant } from '@/lib/restaurant-service'
import ThreeDBackground from './ThreeDBackground'

const categories = [
  ['Burgers', '🍔', 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=240&q=80'],
  ['Américain', '🍟', 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=240&q=80'],
  ['Sandwichs', '🥪', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=240&q=80'],
  ['International', '🌍', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=240&q=80'],
  ['Pizza', '🍕', 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=240&q=80'],
  ['Tacos', '🌮', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=240&q=80'],
  ['Italien', '🍝', 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=240&q=80'],
  ['Grillades', '🥩', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=240&q=80'],
  ['Chawarma', '🌯', 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=240&q=80'],
  ['Poulet', '🍗', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=240&q=80'],
  ['Asiatique', '🥢', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=240&q=80'],
  ['Sushi', '🍣', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=240&q=80'],
  ['Marocain', '🥘', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=240&q=80'],
  ['Oriental', '🧆', 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=240&q=80'],
  ['Sucré', '🍩', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=240&q=80'],
]

const cuisineAliases: Record<string, string> = {
  Burgers: 'Burgers', Américain: 'American', Sandwichs: 'Sandwich', International: 'International',
  Pizza: 'Pizza', Tacos: 'Tacos', Italien: 'Italian', Grillades: 'Grill', Chawarma: 'Shawarma',
  Poulet: 'Chicken', Asiatique: 'Asian', Sushi: 'Sushi', Marocain: 'Moroccan',
  Oriental: 'Oriental', Sucré: 'Sweets',
}

export default function HomeClient({ restaurants }: { restaurants: (FrontRestaurant | Record<string, any>)[] }) {
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [query, setQuery] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [addressOpen, setAddressOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [topRated, setTopRated] = useState(false)

  const visibleRestaurants = useMemo(() => (restaurants as any[]).filter((r) => {
    const matchesQuery = r.name.toLowerCase().includes(query.toLowerCase())
    const ratingNum = Number(String(r.rating ?? '').replace('%', '')) || 0
    const wantedCuisine = cuisineAliases[activeCategory] ?? activeCategory
    return matchesQuery && (!topRated || ratingNum >= 95) && (!activeCategory || activeCategory === 'Tous' || r.cuisines?.includes(wantedCuisine))
  }), [restaurants, query, topRated, activeCategory])

  const popularRestaurants = useMemo(() => {
    return [...(restaurants as any[])]
      .sort((a, b) => (Number(String(b.rating ?? '').replace('%', '')) || 0) - (Number(String(a.rating ?? '').replace('%', '')) || 0))
      .slice(0, 6)
  }, [restaurants])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ThreeDBackground />

      <header className="relative z-10 mx-auto flex h-[76px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" aria-label="Oujda Food" className="flex items-center gap-2.5">
          <img src="/oujda-food-logo.svg" alt="" className="h-10 w-10" />
          <span className="text-xl font-black tracking-tight">Oujda <span className="text-gradient-glovo">Food</span></span>
        </a>
        <div className="flex items-center gap-3">
          <button onClick={() => setAddressOpen(true)} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold shadow-sm transition-all hover:shadow-md">
            <MapPin className="size-4 text-primary" /> Oujda <ChevronDown className="size-3.5" />
          </button>
          <button onClick={() => setLoginOpen(true)} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30">
            <CircleUserRound className="size-4" /> Connexion
          </button>
          <button onClick={() => setCartOpen(true)} className="relative rounded-full border border-border bg-card p-2.5 shadow-sm transition-all hover:shadow-md" aria-label="Panier">
            <ShoppingBag className="size-5" />
          </button>
        </div>

        {addressOpen && (
          <div className="absolute left-1/2 top-[76px] z-30 w-[380px] -translate-x-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <div className="flex gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">🌍</div>
              <div>
                <p className="font-bold">Disponible a : Oujda</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Saisissez votre adresse pour verifier les options de livraison pres de chez vous.</p>
              </div>
              <button onClick={() => setAddressOpen(false)} className="shrink-0 self-start rounded-full p-1 hover:bg-muted" aria-label="Fermer"><X className="size-4" /></button>
            </div>
          </div>
        )}
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-[#ff5c8a] to-accent px-8 py-14 text-white shadow-2xl shadow-primary/20 sm:px-14 sm:py-20">
          <div className="absolute -right-10 -top-10 size-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-14 bottom-0 hidden size-40 rounded-full border-2 border-white/20 sm:block animate-glow-pulse" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
              🛵 Livraison en 20-35 min
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Votre repas prefere<br />livre a <span className="underline decoration-accent decoration-8 underline-offset-4">Oujda</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-white/85 sm:text-lg">
              Decouvrez les meilleurs restaurants de la ville et faites livrer vos plats favoris directement chez vous.
            </p>
            <div className="relative mt-9 max-w-xl">
              <Search className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un restaurant ou un plat..."
                className="h-15 w-full rounded-2xl bg-white pl-13 pr-4 text-base text-foreground shadow-2xl outline-none placeholder:text-muted-foreground focus:ring-4 focus:ring-white/30"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={() => { setQuery(''); setActiveCategory('Tous') }} className="rounded-full bg-white font-bold px-5 py-2 text-sm text-primary shadow-lg transition-transform hover:scale-105">Tous les restaurants</button>
              <button onClick={() => { setTopRated(!topRated) }} className={`rounded-full px-5 py-2 text-sm font-semibold backdrop-blur-sm transition-all ${topRated ? 'bg-white text-primary' : 'bg-white/15 text-white hover:bg-white/25'}`}>⭐ Meilleures notes</button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight">Categories</h2>
          <span className="text-sm font-semibold text-muted-foreground">Glissez pour voir plus →</span>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
          <button
            onClick={() => setActiveCategory('Tous')}
            className={`flex min-w-[84px] shrink-0 flex-col items-center gap-3 rounded-3xl p-3 transition-all ${activeCategory === 'Tous' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card border border-border hover:shadow-md'}`}
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-background text-3xl shadow-sm">🍽️</div>
            <span className="text-xs font-bold">Tous</span>
          </button>
          {categories.map(([name, emoji, image]) => (
            <button
              key={name}
              onClick={() => setActiveCategory(name)}
              className={`flex min-w-[84px] shrink-0 flex-col items-center gap-3 rounded-3xl p-3 transition-all ${activeCategory === name ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card border border-border hover:shadow-md'}`}
            >
              <div className="relative size-16 overflow-hidden rounded-full bg-muted shadow-sm">
                <img src={image} alt="" className="size-full object-cover" />
              </div>
              <span className="text-xs font-bold">{name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl font-black tracking-tight">
            {activeCategory !== 'Tous' ? activeCategory : 'Tous les etablissements'}
          </h2>
          <span className="text-sm font-semibold text-muted-foreground">{visibleRestaurants.length} restaurants</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRestaurants.map((r: any, idx: number) => {
            const topRatedItem = Number(String(r.rating ?? '').replace('%', '')) >= 95
            return (
              <a
                key={r.slug}
                href={`/restaurant/${r.slug}`}
                className="group block overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  <img src={r.image} alt={r.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                  {r.promotion && (
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg">
                      {r.promotion}
                    </span>
                  )}
                  <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black shadow-lg backdrop-blur-sm">
                    <Star className="mr-1 inline size-3.5 fill-amber-400 text-amber-400" />
                    {r.rating ?? '--'}
                  </div>
                  {topRatedItem && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-black shadow-lg">⭐ Top Rated</span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-black leading-tight">{r.name}</h3>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1"><Clock className="size-3.5 text-primary" /> 20-35 min</span>
                    <span className="rounded-full bg-muted px-3 py-1">Gratuit</span>
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

      <footer className="relative z-10 border-t border-border bg-card/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img src="/oujda-food-logo.svg" alt="" className="h-9 w-9" />
              <span className="text-lg font-black">Oujda <span className="text-gradient-glovo">Food</span></span>
            </div>
            <div className="flex gap-6 text-sm font-medium text-muted-foreground">
              <span className="cursor-pointer transition-colors hover:text-foreground">A propos</span>
              <span className="cursor-pointer transition-colors hover:text-foreground">Contact</span>
              <span className="cursor-pointer transition-colors hover:text-foreground">Conditions</span>
              <span className="cursor-pointer transition-colors hover:text-foreground">Confidentialite</span>
            </div>
            <div className="text-sm font-semibold text-muted-foreground">Oujda, Maroc</div>
          </div>
        </div>
      </footer>

      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-5 backdrop-blur-sm" onClick={() => setLoginOpen(false)}>
          <div className="w-full max-w-md animate-scale-in rounded-3xl bg-background p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Bienvenue sur Oujda Food</h2>
              <button onClick={() => setLoginOpen(false)} aria-label="Fermer" className="rounded-full p-2 hover:bg-muted"><X className="size-5" /></button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Connectez-vous pour commander vos plats favoris.</p>
            <button className="mt-8 h-13 w-full rounded-2xl bg-primary font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20">Continuer avec un numero de telephone</button>
            <button className="mt-3 h-13 w-full rounded-2xl border border-border font-bold transition-colors hover:bg-muted">Continuer avec Google</button>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-sm" onClick={() => setCartOpen(false)}>
          <aside className="h-full w-full max-w-md animate-fade-in-up bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Votre panier</h2>
              <button onClick={() => setCartOpen(false)} aria-label="Fermer" className="rounded-full p-2 hover:bg-muted"><X className="size-5" /></button>
            </div>
            <div className="flex h-[80%] flex-col items-center justify-center text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="size-10 text-muted-foreground" />
              </div>
              <p className="mt-6 font-bold">Votre panier est vide</p>
              <p className="mt-2 text-sm text-muted-foreground">Ajoutez des articles pour commencer votre commande.</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
