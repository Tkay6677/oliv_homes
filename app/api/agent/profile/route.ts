import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { updateAgentProfile } from '@/lib/oliv-db'

export const runtime = 'nodejs'

// Agent profile — view and update settings from the dashboard.
export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    return NextResponse.json({ agent: { name: user.name, email: user.email, phone: user.phone ?? '', role: user.role, agentVerificationStatus: user.agentVerificationStatus ?? 'NOT_STARTED', agentCompanyName: user.agentCompanyName, agentLicenseNumber: user.agentLicenseNumber, agentBio: user.agentBio, agentStatesServed: user.agentStatesServed ?? [], agentOfficeLocation: user.agentOfficeLocation } })
  } catch (error) { console.error('[oliv] agent profile GET failed:', error); return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const statesServed = Array.isArray(body.statesServed) ? body.statesServed.filter((item: unknown): item is string => typeof item === 'string') : undefined
    const officeBody = (body.officeLocation ?? null) as Record<string, unknown> | null
    const officeLocation = officeBody && Number.isFinite(Number(officeBody.lat)) && Number.isFinite(Number(officeBody.lng))
      ? { lat: Number(officeBody.lat), lng: Number(officeBody.lng), address: officeBody.address ? String(officeBody.address) : undefined, city: officeBody.city ? String(officeBody.city) : undefined, state: officeBody.state ? String(officeBody.state) : undefined }
      : undefined
    const agent = await updateAgentProfile(user._id!.toString(), {
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      agentCompanyName: typeof body.companyName === 'string' ? body.companyName : undefined,
      agentLicenseNumber: typeof body.licenseNumber === 'string' ? body.licenseNumber : undefined,
      agentBio: typeof body.bio === 'string' ? body.bio : undefined,
      agentStatesServed: statesServed,
      agentOfficeLocation: officeLocation,
    })
    return NextResponse.json({ agent })
  } catch (error) { console.error('[oliv] agent profile PATCH failed:', error); return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 }) }
}