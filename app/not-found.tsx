import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="text-center">
        <div className="mx-auto mb-6 flex items-center justify-center">
          <img src="/oujda-food-logo.svg" alt="Oujda Food" className="h-20 w-20" />
        </div>
        <h1 className="text-4xl font-black tracking-tight">Restaurant non trouve</h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Ce restaurant n&apos;existe pas ou son menu n&apos;est pas disponible.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-primary px-8 py-3.5 font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
        >
          Voir tous les restaurants
        </Link>
      </div>
    </main>
  )
}
