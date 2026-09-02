import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { publicUser, submitAgentApplication } from '@/lib/oliv-db'

export const runtime = 'nodejs'

const normalizeStates = (value: unknown) => Array.isArray(value) ? value.filter((state) => typeof state === 'string').slice(0, 10) : []
const normalizeOffice = (value: { lat?: unknown; lng?: unknown; address?: unknown; city?: unknown; state?: unknown } | undefined) => {
  const lat = Number(value?.lat); const lng = Number(value?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined
  return { lat, lng, address: typeof value?.address === 'string' ? value.address.slice(0, 200) : undefined, city: typeof value?.city === 'string' ? value.city.slice(0, 80) : undefined, state: typeof value?.state === 'string' ? value.state.slice(0, 80) : undefined }
}

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ user: null, canSubmit: false }, { status: 200 })
    const status = user.agentVerificationStatus ?? 'NOT_STARTED'
    return NextResponse.json({ user: publicUser(user as unknown as Record<string, unknown>), canSubmit: status === 'NOT_STARTED' || status === 'REJECTED' })
  } catch (error) { console.error('[oliv] onboarding GET failed:', error); return NextResponse.json({ error: 'Unable to load onboarding state.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in to start agent onboarding.' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : ''
    const licenseNumber = typeof body.licenseNumber === 'string' ? body.licenseNumber.trim() : ''
    const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 600) : ''
    const states = normalizeStates(body.statesServed)
    const office = normalizeOffice(body.officeLocation)
    if (name.length < 2) return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 })
    if (phone.replace(/\D/g, '').length < 7) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })
    if (companyName.length < 2) return NextResponse.json({ error: 'Enter your agency or company name.' }, { status: 400 })
    if (licenseNumber.length < 3) return NextResponse.json({ error: 'Enter your license or registration number.' }, { status: 400 })
    if (!states.length) return NextResponse.json({ error: 'Select at least one state you serve.' }, { status: 400 })
    const updated = await submitAgentApplication(user._id!.toString(), { name, phone, agentCompanyName: companyName, agentLicenseNumber: licenseNumber, agentBio: bio, agentStatesServed: states, agentOfficeLocation: office })
    return NextResponse.json({ user: publicUser(updated as unknown as Record<string, unknown>), message: 'Application submitted for review.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit application.'
    if (['Account not found.', 'This account is already a verified agent.', 'This account is suspended. Contact support.'].includes(message)) return NextResponse.json({ error: message }, { status: 409 })
    console.error('[oliv] onboarding POST failed:', error); return NextResponse.json({ error: message }, { status: 500 })
  }
}