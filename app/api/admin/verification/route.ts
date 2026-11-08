import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { listLandlordsForReview, listAmassomaZones, setLandlordVerification } from '@/lib/oliv-db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
    const [queue, areas] = await Promise.all([listLandlordsForReview(), listAmassomaZones()])
    return NextResponse.json({ queue, areas })
  } catch (error) { console.error('[oliv] verification queue failed:', error); return NextResponse.json({ error: 'Unable to load verification queue.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const action = typeof body.action === 'string' ? body.action : ''
    const levels: Record<string, [string, number]> = { approve: ['VERIFIED', 2], reject: ['REJECTED', 0], review: ['UNDER_REVIEW', 0], suspend: ['SUSPENDED', 0] }
    if (!userId || !levels[action]) return NextResponse.json({ error: 'A userId and a valid action (approve, reject, review, suspend) are required.' }, { status: 400 })
    const [status, level] = levels[action]
    const updated = await setLandlordVerification(userId, status as 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW' | 'SUSPENDED', level, user._id!.toString())
    return NextResponse.json({ landlord: { _id: updated?._id, name: updated?.name, landlordVerificationStatus: updated?.landlordVerificationStatus, landlordVerificationLevel: updated?.landlordVerificationLevel } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update verification.'
    if (message === 'Landlord not found.') return NextResponse.json({ error: message }, { status: 404 })
    console.error('[oliv] verification update failed:', error); return NextResponse.json({ error: message }, { status: 500 })
  }
}