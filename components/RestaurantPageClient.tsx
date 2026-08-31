'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, Clock3, MapPin, Minus, Plus, Search, ShoppingBag, Star, Truck, X, ArrowRight } from 'lucide-react'
import type { FrontProduct, FrontRestaurant } from '@/lib/restaurant-service'
import ThreeDBackground from './ThreeDBackground'

function ProductModal({ product, onClose, onAdd }: { product: FrontProduct; onClose: () => void; onAdd: (qty: number) => void }) {
  const [qty, setQty] = useState(1)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
      <div className="w-full max-w-lg animate-scale-in rounded-t-3xl bg-background sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-t-3xl bg-muted sm:rounded-t-3xl">
            {product.image ? (
              <img src={product.image} alt={product.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-6xl">🍽️</div>
            )}
          </div>
          <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70" aria-label="Fermer">
            <X className="size-5" />
          </button>
          {product.discount && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg">-{product.discount}%</span>
          )}
        </div>
        <div className="p-6">
          <h3 className="text-2xl font-black">{product.name}</h3>
          <div className="mt-2 flex items-center gap-3">
            {product.oldPrice != null && product.oldPrice > product.price && (
              <span className="text-sm text-muted-foreground line-through">{product.oldPrice.toFixed(2)} MAD</span>
            )}
            <span className="text-xl font-bold text-primary">{product.price.toFixed(2)} MAD</span>
          </div>
          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          {product.optionGroups && product.optionGroups.length > 0 && (
            <div className="mt-5 space-y-3 max-h-52 overflow-y-auto pr-1 border-t border-border pt-4">
              {product.optionGroups.map((og) => (
                <div key={og.id} className="rounded-2xl border border-border bg-muted/40 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider">{og.name}</span>
                    {og.required && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Obligatoire</span>
                    )}
                  </div>
                  {og.description && <p className="text-[11px] text-muted-foreground mt-0.5">{og.description}</p>}
                  <div className="mt-2.5 space-y-1.5">
                    {og.options.map((opt) => (
                      <label key={opt.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-background/60 hover:bg-background cursor-pointer transition-colors border border-border/50">
                        <div className="flex items-center gap-2.5">
                          <input type={og.max === 1 ? 'radio' : 'checkbox'} name={`group_${og.id}`} className="accent-primary size-3.5" />
                          <span className="font-medium">{opt.name}</span>
                        </div>
                        <span className="font-bold text-muted-foreground">{opt.price > 0 ? `+${opt.price.toFixed(2)} MAD` : 'Gratuit'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex size-11 items-center justify-center rounded-l-2xl transition-colors hover:bg-border"><Minus className="size-4" /></button>
              <span className="min-w-[24px] text-center text-lg font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="flex size-11 items-center justify-center rounded-r-2xl transition-colors hover:bg-border"><Plus className="size-4" /></button>
            </div>
            <button
              onClick={() => onAdd(qty)}
              className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
            >
              Ajouter pour {(product.price * qty).toFixed(2)} MAD
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CartPanel({ restaurant, cartItems, cart, subtotal, onChange, onRemove }: {
  restaurant: FrontRestaurant; cartItems: FrontProduct[]; cart: Record<string, number>; subtotal: number;
  onChange: (id: string, delta: number) => void; onRemove: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-5">
        <h2 className="text-xl font-black">Votre commande</h2>
      </div>
      {!cartItems.length ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted"><ShoppingBag className="size-8 text-muted-foreground" /></div>
          <p className="mt-5 font-bold">Votre commande est vide</p>
          <p className="mt-2 text-sm text-muted-foreground">Ajoutez des produits de ce restaurant.</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              {cartItems.map((p) => (
                <div key={p.id} className="flex gap-3">
                  <img src={p.image ?? '/placeholder.svg'} alt="" className="size-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="text-sm font-semibold text-primary">{p.price.toFixed(2)} MAD</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-1 rounded-xl border border-border bg-muted">
                        <button onClick={() => onChange(p.id, -1)} className="flex size-8 items-center justify-center rounded-l-xl transition-colors hover:bg-border" aria-label="Decrease"><Minus className="size-3" /></button>
                        <span className="min-w-[20px] text-center text-sm font-bold">{cart[p.id]}</span>
                        <button onClick={() => onChange(p.id, 1)} className="flex size-8 items-center justify-center rounded-r-xl transition-colors hover:bg-border" aria-label="Increase"><Plus className="size-3" /></button>
                      </div>
                      <button onClick={() => onRemove(p.id)} className="text-xs text-muted-foreground underline transition-colors hover:text-destructive">Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><strong>{subtotal.toFixed(2)} MAD</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><strong>{restaurant.deliveryFee != null ? `${restaurant.deliveryFee.toFixed(2)} MAD` : 'Gratuit'}</strong></div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-black"><span>Total</span><span>{(subtotal + (restaurant.deliveryFee ?? 0)).toFixed(2)} MAD</span></div>
            </div>
            <button className="mt-4 h-13 w-full rounded-2xl bg-primary font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20">Commander</button>
          </div>
        </>
      )}
    </div>
  )
}

export default function RestaurantPageClient({ restaurant }: { restaurant: FrontRestaurant }) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [selectedProduct, setSelectedProduct] = useState<FrontProduct | null>(null)
  const [activeCategory, setActiveCategory] = useState(restaurant.categories[0]?.name ?? '')
  const [cartOpen, setCartOpen] = useState(false)
  const [query, setQuery] = useState('')
  const allProducts = useMemo(() => restaurant.categories.flatMap((c) => c.products), [restaurant])
  const filteredCategories = useMemo(() => {
    if (!query.trim()) return restaurant.categories
    const q = query.toLowerCase()
    return restaurant.categories.map((c) => ({ ...c, products: c.products.filter((p) => p.name.toLowerCase().includes(q)) })).filter((c) => c.products.length)
  }, [query, restaurant])
  const cartItems = allProducts.filter((p) => cart[p.id])
  const cartCount = cartItems.reduce((s, p) => s + (cart[p.id] ?? 0), 0)
  const subtotal = cartItems.reduce((sum, p) => sum + p.price * (cart[p.id] ?? 0), 0)
  const changeQuantity = (id: string, delta: number) => setCart((current) => {
    const next = Math.max(0, (current[id] ?? 0) + delta)
    const copy = { ...current }
    if (next) copy[id] = next; else delete copy[id]
    return copy
  })
  const removeItem = (id: string) => setCart((current) => { const copy = { ...current }; delete copy[id]; return copy })
  const scrollToCategory = (category: string) => { setActiveCategory(category); document.getElementById(category.toLowerCase().replaceAll(' ', '-'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  if (!restaurant.categories.length) {
    return (
      <main className="relative min-h-screen bg-background text-foreground">
        <ThreeDBackground intensity="light" />
        <header className="sticky top-0 z-30 flex h-[68px] items-center border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-8">
          <a href="/" className="flex items-center gap-2">
            <img src="/oujda-food-logo.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-black">Oujda <span className="text-primary">Food</span></span>
          </a>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <img src={restaurant.image} alt={restaurant.name} className="mx-auto size-28 rounded-3xl object-cover shadow-lg" />
          <h1 className="mt-6 text-3xl font-black">{restaurant.name}</h1>
          <p className="mt-3 text-muted-foreground">Le menu de ce restaurant n&apos;est pas disponible pour le moment.</p>
          <a href="/" className="mt-8 inline-block rounded-2xl bg-primary px-8 py-3.5 font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20">Voir tous les restaurants</a>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <ThreeDBackground intensity="light" />

      <header className="sticky top-0 z-30 flex h-[68px] items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-8">
        <a href="/" className="flex items-center gap-2">
          <img src="/oujda-food-logo.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-black">Oujda <span className="text-primary">Food</span></span>
        </a>
        <div className="relative hidden flex-1 md:block">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 w-full rounded-2xl bg-muted pl-11 pr-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30" placeholder="Rechercher dans le menu..." aria-label="Search" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="hidden items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-bold md:flex"><MapPin className="size-4" /> Oujda</button>
          <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20">
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">Panier</span>
            {cartCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">{cartCount}</span>}
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="relative overflow-hidden rounded-3xl bg-card shadow-sm">
          <div className="aspect-[3/1] w-full overflow-hidden sm:aspect-[4/1]">
            <img src={restaurant.image} alt={restaurant.name} className="size-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 text-white">
            <h1 className="text-2xl font-black sm:text-3xl">{restaurant.name}</h1>
            <p className="mt-1 text-sm text-white/80">{restaurant.cuisine ?? 'Restaurants'} · Oujda</p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 rounded-xl bg-card px-4 py-2 shadow-sm"><Star className="size-4 fill-amber-400 text-amber-400" /><strong>{restaurant.rating}</strong><span className="text-muted-foreground">({restaurant.reviews})</span></div>
          <div className="flex items-center gap-1.5 rounded-xl bg-card px-4 py-2 shadow-sm"><Clock3 className="size-4 text-primary" /><span>20-35 min</span></div>
          <div className="flex items-center gap-1.5 rounded-xl bg-card px-4 py-2 shadow-sm"><Truck className="size-4 text-primary" /><span>{restaurant.deliveryFee != null ? `${restaurant.deliveryFee.toFixed(2)} MAD` : 'Gratuit'}</span></div>
          <div className="flex items-center gap-1.5 rounded-xl bg-card px-4 py-2 shadow-sm"><MapPin className="size-4 text-primary" /><span>{restaurant.address}</span></div>
          <div className={`flex items-center gap-1.5 rounded-xl px-4 py-2 shadow-sm ${restaurant.open ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}><div className={`size-2 rounded-full ${restaurant.open ? 'bg-green-500' : 'bg-red-500'}`} /><span className="font-semibold text-xs">{restaurant.open ? 'Ouvert' : 'Ferme'}</span></div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.name)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${activeCategory === cat.name ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted hover:bg-muted/80'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-32 sm:px-6">
        {filteredCategories.map((cat) => (
          <div key={cat.id} id={cat.name.toLowerCase().replaceAll(' ', '-')} className="mb-10 scroll-mt-24">
            <h2 className="mb-5 text-xl font-bold">{cat.name}</h2>
            <div className="space-y-3">
              {cat.products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="flex w-full items-center gap-4 rounded-2xl bg-card p-3 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/20 border border-transparent group"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                    {product.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      {product.oldPrice != null && product.oldPrice > product.price && (
                        <span className="text-xs text-muted-foreground line-through">{product.oldPrice.toFixed(2)}</span>
                      )}
                      <span className="text-sm font-bold text-primary">{product.price.toFixed(2)} MAD</span>
                      {product.discount && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">-{product.discount}%</span>}
                    </div>
                  </div>
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {product.image ? (
                      <img src={product.image} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-2xl">🍽️</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-all group-hover:opacity-100">
                        <Plus className="size-4" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(qty) => {
            for (let i = 0; i < qty; i++) changeQuantity(selectedProduct.id, 1)
            setSelectedProduct(null)
          }}
        />
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-sm" onClick={() => setCartOpen(false)}>
          <aside className="h-full w-full max-w-md bg-background shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <CartPanel restaurant={restaurant} cartItems={cartItems} cart={cart} subtotal={subtotal} onChange={changeQuantity} onRemove={removeItem} />
          </aside>
        </div>
      )}

      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 left-1/2 z-40 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 sm:hidden">
          <button onClick={() => setCartOpen(true)} className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:bg-primary/90">
            <span className="flex items-center gap-2"><ShoppingBag className="size-5" /> Panier</span>
            <span className="flex items-center gap-3"><span>{cartCount} articles</span><span>{subtotal.toFixed(2)} MAD</span><ArrowRight className="size-5" /></span>
          </button>
        </div>
      )}
    </main>
  )
}
