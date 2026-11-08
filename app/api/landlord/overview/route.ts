import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { landlordRequestsSummary, listLandlordProperties } from '@/lib/oliv-db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in to view the landlord workspace.' }, { status: 401 })
    if (user.role !== 'LANDLORD' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Landlord access required.', needsOnboarding: true }, { status: 403 })
    const landlordId = user._id!.toString()
    const [properties, requests] = await Promise.all([listLandlordProperties(landlordId), landlordRequestsSummary(landlordId)])
    return NextResponse.json({
      landlord: { name: user.name, email: user.email, phone: user.phone ?? '', role: user.role, landlordVerificationStatus: user.landlordVerificationStatus ?? 'NOT_STARTED', landlordVerificationLevel: user.landlordVerificationLevel ?? 0, landlordCompanyName: user.landlordCompanyName, landlordLicenseNumber: user.landlordLicenseNumber, landlordBio: user.landlordBio, landlordStatesServed: user.landlordStatesServed ?? [], landlordOfficeLocation: user.landlordOfficeLocation },
      properties, requests,
      metrics: { activeListings: properties.filter((property) => property.published).length, draftListings: properties.filter((property) => !property.published).length, viewingRequests: requests.viewing, inquiries: requests.inquiries },
    })
  } catch (error) { console.error('[oliv] landlord overview failed:', error); return NextResponse.json({ error: 'Unable to load landlord workspace.' }, { status: 500 }) }
}