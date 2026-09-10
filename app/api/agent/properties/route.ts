import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { createAgentProperty, deleteAgentProperty, listAgentProperties, updateAgentProperty } from '@/lib/oliv-db'
import { OLIV_MARKET } from '@/lib/oliv-data'
import type { Property } from '@/lib/types'

export const runtime = 'nodejs'

const PROPERTY_TYPES: Property['type'][] = ['apartment', 'house', 'studio', 'townhouse', 'shared']
const asText = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const asInt = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? Math.round(n) : NaN }
const parseInput = (body: Record<string, unknown>) => {
  const locationBody = (body.location ?? {}) as Record<string, unknown>
  const coordinateBody = (locationBody.coordinates ?? null) as Record<string, unknown> | null
  const lat = coordinateBody ? Number(coordinateBody.lat) : NaN
  const lng = coordinateBody ? Number(coordinateBody.lng) : NaN
  const coordinates = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : undefined
  return {
    title: asText(body.title, 120), description: asText(body.description, 4000), type: PROPERTY_TYPES.includes(body.type as Property['type']) ? body.type as Property['type'] : null,
    price: asInt(body.price),
    location: { address: asText(locationBody.address, 200), city: asText(locationBody.city, 60), state: asText(locationBody.state, 60), postalCode: asText(locationBody.postalCode, 12), country: 'Nigeria', ...(coordinates ? { coordinates } : {}) },
    bedrooms: asInt(body.bedrooms), bathrooms: asInt(body.bathrooms), squareMeters: asInt(body.squareMeters), furnished: Boolean(body.furnished),
    amenities: Array.isArray(body.amenities) ? body.amenities.map((item: unknown) => asText(item, 40)).filter(Boolean).slice(0, 15) : [],
    images: Array.isArray(body.images) ? body.images.map((item: unknown) => asText(item, 500)).filter((item: string) => /^https:\/\//.test(item)).slice(0, 12) : [], published: body.published === false ? false : true,
  }
}
const validateInput = (input: ReturnType<typeof parseInput>) => {
  if (input.title.length < 4) return 'Give the listing a title of at least 4 characters.'
  if (input.description.length < 20) return 'Describe the home in at least 20 characters.'
  if (!input.type) return 'Choose a valid property type.'
  if (!Number.isInteger(input.price) || input.price < 1000 || input.price > 1_000_000_000) return 'Enter a yearly price between ₦1,000 and ₦1,000,000,000.'
  if (input.location.address.length < 4) return 'Enter the street address of the home.'
  if (input.location.city.length < 2 || input.location.city.toLowerCase() !== OLIV_MARKET.city.toLowerCase()) return `Listings are currently limited to ${OLIV_MARKET.city}, ${OLIV_MARKET.state}.`
  if (!Number.isInteger(input.bedrooms) || input.bedrooms < 0 || input.bedrooms > 20) return 'Bedrooms must be between 0 and 20.'
  if (!Number.isInteger(input.bathrooms) || input.bathrooms < 0 || input.bathrooms > 20) return 'Bathrooms must be between 0 and 20.'
  if (!Number.isInteger(input.squareMeters) || input.squareMeters < 5 || input.squareMeters > 5000) return 'Size must be between 5 and 5000 m².'
  return null
}

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

    const input = parseInput(body as Record<string, unknown>); const validationError = validateInput(input)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    const property = await createAgentProperty(user._id!.toString(), { ...input, type: input.type! })
    return NextResponse.json({ property }, { status: 201 })
  } catch (error) { console.error('[oliv] agent property create failed:', error); return NextResponse.json({ error: 'Unable to create the listing.' }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const propertyId = typeof body?.propertyId === 'string' ? body.propertyId : ''
    if (!body || !propertyId) return NextResponse.json({ error: 'Listing id is required.' }, { status: 400 })
    const input = parseInput(body); const validationError = validateInput(input)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    return NextResponse.json({ property: await updateAgentProperty(user._id!.toString(), propertyId, { ...input, type: input.type! }) })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update the listing.' }, { status: 400 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    const propertyId = request.nextUrl.searchParams.get('id') ?? ''; await deleteAgentProperty(user._id!.toString(), propertyId)
    return NextResponse.json({ ok: true })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete the listing.' }, { status: 400 }) }
}