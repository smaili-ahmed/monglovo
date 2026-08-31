import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRestaurantBySlug } from '@/lib/restaurant-service'
import RestaurantPageClient from '@/components/RestaurantPageClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const restaurant = await getRestaurantBySlug(slug)
  return { title: restaurant ? `${restaurant.name} — Oujda` : 'Restaurant non trouvé' }
}

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const restaurant = await getRestaurantBySlug(slug)
  console.log('restaurant', restaurant)
  if (!restaurant) notFound()
  return <RestaurantPageClient restaurant={restaurant} />
}
