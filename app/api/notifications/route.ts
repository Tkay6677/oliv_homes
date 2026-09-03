import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { listNotificationsForUser, markNotificationsRead, unreadNotificationsCount } from '@/lib/oliv-db'

export const runtime = 'nodejs'

// Current user's notifications: GET returns items + unread count.
export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ items: [], unread: 0 })
    const userId = user._id!.toString()
    const [items, unread] = await Promise.all([listNotificationsForUser(userId), unreadNotificationsCount(userId)])
    return NextResponse.json({ items, unread })
  } catch (error) { console.error('[oliv] notifications GET failed:', error); return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 }) }
}

// Mark notifications as read: { ids?: string[] } marks those, {} or { all: true } marks all.
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string') : undefined
    const read = body.read !== false
    const { modifiedCount } = await markNotificationsRead(user._id!.toString(), ids, read)
    return NextResponse.json({ ok: true, modifiedCount })
  } catch (error) { console.error('[oliv] notifications POST failed:', error); return NextResponse.json({ error: 'Unable to update notifications.' }, { status: 500 }) }
}