import { NextRequest } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import { ensureOlivIndexes } from '@/lib/mongodb-indexes'
import { escapeRegex, ok, parseLimit, parsePage, serverError, textQuery } from '@/lib/authz'
import { OLIV_MARKET } from '@/lib/oliv-data'
import type { Property } from '@/lib/types'

export const runtime = 'nodejs'

function serializeProperty(property: Property & { _id?: unknown }) {
  return { ...property, _id: property._id ? String(property._id) : undefined }
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const query = textQuery(params.get('q'), 80)
    const city = textQuery(params.get('city'), 80)
    const type = textQuery(params.get('type'), 30)
    const page = parsePage(params.get('page'))
    const limit = parseLimit(params.get('limit'))
    const filter: Record<string, unknown> = { published: true, 'location.city': new RegExp(`^${escapeRegex(OLIV_MARKET.city)}$`, 'i') }

    if (query) {
      const pattern = new RegExp(escapeRegex(query), 'i')
      filter.$or = [{ title: pattern }, { description: pattern }, { 'location.city': pattern }, { 'location.address': pattern }]
    }
    if (city && city.toLowerCase() === OLIV_MARKET.city.toLowerCase()) filter['location.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i')
    if (type && ['apartment', 'house', 'studio', 'townhouse', 'shared'].includes(type)) filter.type = type

    const db = await getMongoDb()
    await ensureOlivIndexes(db)
    const collection = db.collection<Property>('properties')
    const [properties, total] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(filter),
    ])

    return ok({ items: properties.map(serializeProperty), page, limit, total, hasMore: page * limit < total })
  } catch (error) {
    console.error('[v0] Failed to load properties:', error)
    return serverError()
  }
}
