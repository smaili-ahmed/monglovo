import { listRestaurants } from '@/lib/restaurant-service'
import RestaurantsPage from '@/components/RestaurantsPage'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const restaurants = await listRestaurants()
  return <RestaurantsPage restaurants={restaurants} />
}
