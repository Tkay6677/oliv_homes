import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { listLandlordReviews } from '@/lib/oliv-db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'LANDLORD' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Landlord access required.' }, { status: 403 })
    return NextResponse.json({ reviews: await listLandlordReviews(user._id!.toString()) })
  } catch (error) { console.error('[oliv] landlord reviews failed:', error); return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 }) }
}