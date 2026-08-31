import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await connectDB()
    const { default: Product } = await import('@/lib/models/Product')
    const product = await (Product as any).findById(id).lean()
    if (!product) {
      return NextResponse.json({ error: 'Produit non trouve' }, { status: 404 })
    }
    return NextResponse.json({
      id: String(product._id),
      name: product.name,
      description: product.description,
      price: product.price,
      oldPrice: product.oldPrice,
      discount: product.discount,
      image: product.image,
      available: product.available,
      restaurantId: String(product.restaurantId),
      categoryId: String(product.categoryId),
    })
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
  }
}
