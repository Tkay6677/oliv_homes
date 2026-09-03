import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { listRequestsForAgent, updateRequestStatus } from '@/lib/oliv-db'

export const runtime = 'nodejs'

// Agent request inbox — viewing requests and inquiries for the agent's listings.
export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    return NextResponse.json({ items: await listRequestsForAgent(user._id!.toString()) })
  } catch (error) { console.error('[oliv] agent request list failed:', error); return NextResponse.json({ error: 'Unable to load requests.' }, { status: 500 }) }
}

// Respond to a request: CONFIRM / COMPLETE / CANCEL update the status; REPLY stores the reply text (used for inquiries).
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const requestId = typeof body.requestId === 'string' ? body.requestId : ''
    const reply = typeof body.reply === 'string' ? body.reply.trim().slice(0, 1000) : ''
    const action = typeof body.action === 'string' ? body.action.toUpperCase() : ''
    if (!requestId) return NextResponse.json({ error: 'requestId is required.' }, { status: 400 })
    if (action === 'REPLY' && reply.length < 2) return NextResponse.json({ error: 'Write a reply for the renter.' }, { status: 400 })
    const statusByAction: Record<string, string | undefined> = { CONFIRM: 'CONFIRMED', COMPLETE: 'COMPLETED', CANCEL: 'CANCELLED', ARCHIVE: 'ARCHIVED', REPLY: 'REPLIED' }
    const status = statusByAction[action]
    if (!status) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
    const updated = await updateRequestStatus(requestId, user._id!.toString(), { status, ...(action === 'REPLY' && reply ? { agentReply: reply } : {}) })
    return NextResponse.json({ request: updated })
  } catch (error) { console.error('[oliv] agent request update failed:', error); return NextResponse.json({ error: 'Unable to update the request.' }, { status: 500 }) }
}