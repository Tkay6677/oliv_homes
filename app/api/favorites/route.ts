import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { getFavorites, listFavoritesWithHomes, saveFavorite } from '@/lib/oliv-db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ items: [] })
    const [items, homes] = await Promise.all([getFavorites(user._id!.toString()), listFavoritesWithHomes(user._id!.toString())])
    return NextResponse.json({ items, homes })
  } catch (error) { console.error('[oliv] favorites GET failed:', error); return NextResponse.json({ error: 'Unable to load favorites.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in to save homes.' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : ''
    if (!propertyId) return NextResponse.json({ error: 'A propertyId is required.' }, { status: 400 })
    const saved = await saveFavorite(user._id!.toString(), propertyId)
    return NextResponse.json({ saved })
  } catch (error) { console.error('[oliv] favorites POST failed:', error); return NextResponse.json({ error: 'Unable to update favorites.' }, { status: 500 }) }
}