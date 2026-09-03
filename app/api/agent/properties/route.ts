import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { createAgentProperty, listAgentProperties } from '@/lib/oliv-db'
import type { Property } from '@/lib/types'

export const runtime = 'nodejs'

const PROPERTY_TYPES: Property['type'][] = ['apartment', 'house', 'studio', 'townhouse', 'shared']
const asText = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const asInt = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? Math.round(n) : NaN }

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    return NextResponse.json({ properties: await listAgentProperties(user._id!.toString()) })
  } catch (error) { console.error('[oliv] agent properties list failed:', error); return NextResponse.json({ error: 'Unable to load listings.' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in to create a listing.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.', needsOnboarding: true }, { status: 403 })
    if (user.role === 'AGENT' && user.agentVerificationStatus !== 'VERIFIED') return NextResponse.json({ error: 'Only verified agents can publish listings. Finish verification first.' }, { status: 403 })
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

    const title = asText(body.title, 120)
    const description = asText(body.description, 4000)
    const type = PROPERTY_TYPES.includes(body.type) ? (body.type as Property['type']) : null
    const price = asInt(body.price)
    const locationBody = (body.location ?? {}) as Record<string, unknown>
    const address = asText(locationBody.address, 200)
    const city = asText(locationBody.city, 60)
    const state = asText(locationBody.state, 60)
    const postalCode = asText(locationBody.postalCode, 12)
    const coordinateBody = (locationBody.coordinates ?? null) as Record<string, unknown> | null
    const lat = coordinateBody ? Number(coordinateBody.lat) : NaN
    const lng = coordinateBody ? Number(coordinateBody.lng) : NaN
    const bedrooms = asInt(body.bedrooms)
    const bathrooms = asInt(body.bathrooms)
    const squareMeters = asInt(body.squareMeters)
    const amenities = Array.isArray(body.amenities) ? body.amenities.map((item: unknown) => asText(item, 40)).filter(Boolean).slice(0, 15) : []
    const images = Array.isArray(body.images) ? body.images.map((item: unknown) => asText(item, 500)).filter((item: string) => /^https:\/\//.test(item)).slice(0, 12) : []

    if (title.length < 4) return NextResponse.json({ error: 'Give the listing a title of at least 4 characters.' }, { status: 400 })
    if (description.length < 20) return NextResponse.json({ error: 'Describe the home in at least 20 characters.' }, { status: 400 })
    if (!type) return NextResponse.json({ error: 'Choose a valid property type.' }, { status: 400 })
    if (!Number.isInteger(price) || price < 1000 || price > 1_000_000_000) return NextResponse.json({ error: 'Enter a yearly price between ₦1,000 and ₦1,000,000,000.' }, { status: 400 })
    if (address.length < 4) return NextResponse.json({ error: 'Enter the street address of the home.' }, { status: 400 })
    if (city.length < 2) return NextResponse.json({ error: 'Enter the city of the home.' }, { status: 400 })
    if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 20) return NextResponse.json({ error: 'Bedrooms must be between 0 and 20.' }, { status: 400 })
    if (!Number.isInteger(bathrooms) || bathrooms < 0 || bathrooms > 20) return NextResponse.json({ error: 'Bathrooms must be between 0 and 20.' }, { status: 400 })
    if (!Number.isInteger(squareMeters) || squareMeters < 5 || squareMeters > 5000) return NextResponse.json({ error: 'Size must be between 5 and 5000 m².' }, { status: 400 })

    const coordinates = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : undefined
    const property = await createAgentProperty(user._id!.toString(), {
      title, description, type, price,
      location: { address, city, ...(state ? { state } : {}), postalCode, country: 'Nigeria', ...(coordinates ? { coordinates } : {}) },
      bedrooms, bathrooms, squareMeters, furnished: Boolean(body.furnished), amenities, images,
      published: body.published === false ? false : true,
    })
    return NextResponse.json({ property }, { status: 201 })
  } catch (error) { console.error('[oliv] agent property create failed:', error); return NextResponse.json({ error: 'Unable to create the listing.' }, { status: 500 }) }
}