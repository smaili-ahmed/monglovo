import { NextResponse } from 'next/server'
import { listRestaurants } from '@/lib/restaurant-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const restaurants = await listRestaurants()
    return NextResponse.json({ count: restaurants.length, restaurants })
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
  }
}
