import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { updateLandlordProfile } from '@/lib/oliv-db'

export const runtime = 'nodejs'

// Landlord profile — view and update settings from the dashboard.
export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'LANDLORD' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Landlord access required.' }, { status: 403 })
    return NextResponse.json({ landlord: { name: user.name, email: user.email, phone: user.phone ?? '', role: user.role, landlordVerificationStatus: user.landlordVerificationStatus ?? 'NOT_STARTED', landlordCompanyName: user.landlordCompanyName, landlordLicenseNumber: user.landlordLicenseNumber, landlordBio: user.landlordBio, landlordStatesServed: user.landlordStatesServed ?? [], landlordOfficeLocation: user.landlordOfficeLocation } })
  } catch (error) { console.error('[oliv] landlord profile GET failed:', error); return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'LANDLORD' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Landlord access required.' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const statesServed = Array.isArray(body.statesServed) ? body.statesServed.filter((item: unknown): item is string => typeof item === 'string') : undefined
    const officeBody = (body.officeLocation ?? null) as Record<string, unknown> | null
    const officeLocation = officeBody && Number.isFinite(Number(officeBody.lat)) && Number.isFinite(Number(officeBody.lng))
      ? { lat: Number(officeBody.lat), lng: Number(officeBody.lng), address: officeBody.address ? String(officeBody.address) : undefined, city: officeBody.city ? String(officeBody.city) : undefined, state: officeBody.state ? String(officeBody.state) : undefined }
      : undefined
    const landlord = await updateLandlordProfile(user._id!.toString(), {
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      landlordCompanyName: typeof body.companyName === 'string' ? body.companyName : undefined,
      landlordLicenseNumber: typeof body.licenseNumber === 'string' ? body.licenseNumber : undefined,
      landlordBio: typeof body.bio === 'string' ? body.bio : undefined,
      landlordStatesServed: statesServed,
      landlordOfficeLocation: officeLocation,
    })
    return NextResponse.json({ landlord })
  } catch (error) { console.error('[oliv] landlord profile PATCH failed:', error); return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 }) }
}