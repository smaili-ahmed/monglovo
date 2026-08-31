import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'

export type FrontProduct = {
  id: string
  name: string
  description: string | null
  price: number
  oldPrice?: number
  discount?: number
  image: string | null
  category: string
  options?: string[]
  available: boolean
}

export type FrontCategory = {
  id: string
  name: string
  slug: string
  products: FrontProduct[]
}

export type FrontRestaurant = {
  name: string
  slug: string
  image: string
  logoUrl: string | null
  rating: string
  reviews: string
  deliveryTime: string | null
  deliveryFee: number | null
  cuisine: string | null
  cuisines: string[]
  address: string
  hours: string
  promotion?: string
  open?: boolean
  dataMissing?: boolean
  categories: FrontCategory[]
}

type AnyRec = Record<string, any>

export type FrontOptionGroup = {
  id: string
  name: string
  description: string
  required: boolean
  min: number
  max: number
  position: number
  options: FrontOption[]
}

export type FrontOption = {
  id: string
  name: string
  price: number
  available: boolean
}

export type FrontRestaurantNew = {
  id: string
  name: string
  slug: string
  description: string
  logo_url: string
  cover_url: string
  currency: string
  categories: FrontCategoryNew[]
}

export type FrontCategoryNew = {
  id: string
  name: string
  description: string
  image_url: string
  position: number
  products: FrontProductNew[]
}

export type FrontProductNew = {
  id: string
  name: string
  description: string
  image_url: string
  price: number
  currency: string
  available: boolean
  position: number
  option_groups: FrontOptionGroup[]
}

function mapRestaurantDoc(r: AnyRec) {
  return {
    slug: r.slug,
    name: r.name,
    image: r.image || r.logoUrl || '/placeholder.svg',
    logoUrl: r.logoUrl || null,
    rating: r.rating || '--',
    reviews: r.reviews || '',
    cuisines: (r.cuisines || []) as string[],
    promotion: r.promotion || undefined,
    open: r.open,
    dataMissing: !!r.dataMissing,
  }
}

export async function listRestaurants(): Promise<ReturnType<typeof mapRestaurantDoc>[]> {
  await connectDB()
  const { default: Restaurant } = await import('@/lib/models/Restaurant')
  const docs = await (Restaurant as any).find({}).sort({ name: 1 }).lean()
  return docs.map(mapRestaurantDoc)
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function searchRestaurants(q: string): Promise<ReturnType<typeof mapRestaurantDoc>[]> {
  await connectDB()
  const { default: Restaurant } = await import('@/lib/models/Restaurant')
  const rx = new RegExp(escapeRegex(q.trim()), 'i')
  const docs = await (Restaurant as any)
    .find({ $or: [{ name: rx }, { cuisines: rx }] })
    .sort({ name: 1 })
    .lean()
  return docs.map(mapRestaurantDoc)
}

export async function getRestaurantBySlug(slug: string): Promise<FrontRestaurant | null> {
  await connectDB()
  const { default: Restaurant } = await import('@/lib/models/Restaurant')
  const { default: Category } = await import('@/lib/models/Category')
  const { default: Product } = await import('@/lib/models/Product')

  const restaurant = await (Restaurant as any).findOne({ slug }).lean()
  if (!restaurant) return null

  const cats = await (Category as any)
    .find({ restaurantId: restaurant._id })
    .sort({ position: 1 })
    .lean()
  const prods = await (Product as any)
    .find({ restaurantId: restaurant._id })
    .sort({ position: 1 })
    .lean()

  const byCat = new Map<string, FrontProduct[]>()
  for (const p of prods as AnyRec[]) {
    const key = String(p.categoryId)
    const arr = byCat.get(key) ?? []
    arr.push({
      id: String(p._id),
      name: p.name,
      description: p.description ?? null,
      price: p.price ?? 0,
      oldPrice: p.oldPrice ?? undefined,
      discount: p.discount ?? undefined,
      image: p.image ?? null,
      category: '',
      available: p.available !== false,
    })
    byCat.set(key, arr)
  }

  const categories: FrontCategory[] = (cats as AnyRec[])
    .map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      products: byCat.get(String(c._id)) ?? [],
    }))
    .filter((c) => c.products.length > 0)

  return {
    name: restaurant.name,
    slug: restaurant.slug,
    image: restaurant.image || restaurant.logoUrl || '/placeholder.svg',
    logoUrl: restaurant.logoUrl || null,
    rating: restaurant.rating || '--',
    reviews: restaurant.reviews || '',
    deliveryTime: null,
    deliveryFee: null,
    cuisine: ((restaurant.cuisines || [])[0] as string) || null,
    cuisines: (restaurant.cuisines || []) as string[],
    address: 'Oujda, Maroc',
    hours: restaurant.open ? 'Ouvert' : 'Ferme pour le moment',
    promotion: restaurant.promotion || undefined,
    open: restaurant.open,
    dataMissing: !!restaurant.dataMissing,
    categories,
  }
}

function generateId(prefix: string, index: number): string {
  return `${prefix}_${index}`
}

function mapProductToNewFormat(
  p: AnyRec,
  productIndex: number,
  optionGroups: FrontOptionGroup[] = []
): FrontProductNew {
  return {
    id: generateId('prod', productIndex),
    name: p.name,
    description: p.description ?? '',
    image_url: p.image ?? '',
    price: p.price ?? 0,
    currency: 'MAD',
    available: p.available !== false,
    position: productIndex,
    option_groups: optionGroups,
  }
}

function mapCategoryToNewFormat(
  c: AnyRec,
  categoryIndex: number,
  products: FrontProductNew[]
): FrontCategoryNew {
  return {
    id: generateId('cat', categoryIndex),
    name: c.name,
    description: '',
    image_url: '',
    position: categoryIndex,
    products,
  }
}

function mapRestaurantToNewFormat(
  r: AnyRec,
  categoryMaps: Map<string, AnyRec[]>
): FrontRestaurantNew {
  const restaurantId = generateId('rest', 0)
  const logoUrl = r.logoUrl || '/placeholder.svg'
  const coverUrl = r.image || logoUrl

  const categories: FrontCategoryNew[] = []

  return {
    id: restaurantId,
    name: r.name,
    slug: r.slug,
    description: '',
    logo_url: logoUrl,
    cover_url: coverUrl,
    currency: 'MAD',
    categories,
  }
}

export function transformRestaurantForApi(
  restaurant: FrontRestaurant
): FrontRestaurantNew {
  return {
    id: restaurant.slug,
    name: restaurant.name,
    slug: restaurant.slug,
    description: '',
    logo_url: restaurant.image || '/placeholder.svg',
    cover_url: restaurant.image || '/placeholder.svg',
    currency: 'MAD',
    categories: restaurant.categories.map((cat, i) => ({
      id: cat.slug,
      name: cat.name,
      description: '',
      image_url: '',
      position: i,
      products: cat.products.map((prod, j) => ({
        id: prod.id,
        name: prod.name,
        description: prod.description ?? '',
        image_url: prod.image ?? '',
        price: prod.price,
        currency: 'MAD',
        available: prod.available,
        position: j,
        option_groups: [],
      })),
    })),
  }
}
