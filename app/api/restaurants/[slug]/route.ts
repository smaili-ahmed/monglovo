import { NextResponse } from 'next/server'
import { getRestaurantBySlug } from '@/lib/restaurant-service'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const restaurant = await getRestaurantBySlug(slug)
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 })
    }
    return NextResponse.json(restaurant)
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
  }
}
