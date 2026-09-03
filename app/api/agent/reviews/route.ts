import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { listAgentReviews } from '@/lib/oliv-db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    return NextResponse.json({ reviews: await listAgentReviews(user._id!.toString()) })
  } catch (error) { console.error('[oliv] agent reviews failed:', error); return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 }) }
}