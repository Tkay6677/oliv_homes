import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getMongoDb } from '@/lib/mongodb'

export const runtime = 'nodejs'

function serializeProperty(property: Record<string, unknown>) {
  return { ...property, _id: property._id ? String(property._id) : undefined }
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
    }

    const db = await getMongoDb()
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) }, {
      projection: { password: 0, passwordHash: 0 },
    })

    if (!user || user.role !== 'AGENT') {
      return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
    }

    const listings = await db.collection('properties').find({ agentId: id, published: true }).sort({ createdAt: -1 }).limit(12).toArray()

    return NextResponse.json({
      agent: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        agentCompanyName: user.agentCompanyName,
        agentBio: user.agentBio,
        agentOfficeLocation: user.agentOfficeLocation,
        agentVerificationStatus: user.agentVerificationStatus,
        listings: listings.map(serializeProperty),
      },
    })
  } catch (error) {
    console.error('[oliv] public agent profile failed:', error)
    return NextResponse.json({ error: 'Unable to load agent profile.' }, { status: 500 })
  }
}
