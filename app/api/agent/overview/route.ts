import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { agentRequestsSummary, listAgentProperties } from '@/lib/oliv-db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in to view the agent workspace.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.', needsOnboarding: true }, { status: 403 })
    const agentId = user._id!.toString()
    const [properties, requests] = await Promise.all([listAgentProperties(agentId), agentRequestsSummary(agentId)])
    return NextResponse.json({
      agent: { name: user.name, email: user.email, phone: user.phone ?? '', role: user.role, agentVerificationStatus: user.agentVerificationStatus ?? 'NOT_STARTED', agentVerificationLevel: user.agentVerificationLevel ?? 0, agentCompanyName: user.agentCompanyName, agentLicenseNumber: user.agentLicenseNumber, agentBio: user.agentBio, agentStatesServed: user.agentStatesServed ?? [], agentOfficeLocation: user.agentOfficeLocation },
      properties, requests,
      metrics: { activeListings: properties.filter((property) => property.published).length, draftListings: properties.filter((property) => !property.published).length, viewingRequests: requests.viewing, inquiries: requests.inquiries },
    })
  } catch (error) { console.error('[oliv] agent overview failed:', error); return NextResponse.json({ error: 'Unable to load agent workspace.' }, { status: 500 }) }
}