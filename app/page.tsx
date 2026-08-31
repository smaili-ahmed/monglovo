import { listRestaurants } from '@/lib/restaurant-service'
import HomeClient from '@/components/HomeClient'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const restaurants = await listRestaurants()
  return <HomeClient restaurants={restaurants} />
}
