import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { createRequest, getProperty, listRequestsForUser } from '@/lib/oliv-db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ items: [] })
    return NextResponse.json({ items: await listRequestsForUser(user._id!.toString()) })
  } catch (error) { console.error('[oliv] requests GET failed:', error); return NextResponse.json({ error: 'Unable to load requests.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in to request a viewing.' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : ''
    if (!propertyId) return NextResponse.json({ error: 'A propertyId is required.' }, { status: 400 })
    const property = await getProperty(propertyId)
    if (!property) return NextResponse.json({ error: 'This listing does not exist.' }, { status: 404 })
    const type = body.type === 'INQUIRY' ? 'INQUIRY' : 'VIEWING'
    const record: Record<string, unknown> = { userId: user._id!.toString(), propertyId, agentId: property.agentId, type, status: 'PENDING' }
    if (type === 'VIEWING') {
      const preferredDate = body.preferredDate ? new Date(String(body.preferredDate)) : null
      if (!preferredDate || Number.isNaN(preferredDate.getTime())) return NextResponse.json({ error: 'Choose a valid viewing date.' }, { status: 400 })
      record.preferredDate = preferredDate
      record.preferredTime = typeof body.preferredTime === 'string' ? body.preferredTime.slice(0, 40) : 'Morning'
    } else {
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 800) : ''
      if (message.length < 5) return NextResponse.json({ error: 'Write a short message for the agent.' }, { status: 400 })
      record.message = message
    }
    if (typeof body.notes === 'string' && body.notes.trim()) record.notes = body.notes.trim().slice(0, 500)
    const id = await createRequest(record)
    return NextResponse.json({ id, message: type === 'VIEWING' ? 'Viewing request sent.' : 'Message sent to the agent.' })
  } catch (error) { console.error('[oliv] requests POST failed:', error); return NextResponse.json({ error: 'Unable to submit request.' }, { status: 500 }) }
}