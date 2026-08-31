import { NextResponse } from 'next/server'
import { searchRestaurants } from '@/lib/restaurant-service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (!q.trim()) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 })
  }
  try {
    const restaurants = await searchRestaurants(q)
    return NextResponse.json({ query: q, count: restaurants.length, restaurants })
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
  }
}
