import { NextRequest } from 'next/server'
import { ok, serverError, textQuery } from '@/lib/authz'
import { addReview, listReviewsForProperty, listReviewsVisible } from '@/lib/oliv-db'
import { currentUser } from '@/lib/oliv-auth'
export const runtime = 'nodejs'
// GET ?propertyId=... returns that listing's published reviews plus any pending review by the signed-in user.
// GET without propertyId returns all visible reviews (used by the global client store so reviews survive refresh).
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    const propertyId = textQuery(request.nextUrl.searchParams.get('propertyId'), 80)
    if (propertyId) return ok({ items: await listReviewsForProperty(propertyId, user?._id?.toString()) })
    return ok({ items: await listReviewsVisible(user?._id?.toString()) })
  } catch (error) { console.error('[v0] Failed to load reviews:', error); return serverError() }
}
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(); if (!user) return Response.json({ success: false, error: 'Sign in required' }, { status: 401 })
    const body = await request.json()
    const propertyId = textQuery(body.propertyId, 80)
    const text = textQuery(body.text, 1000)
    const rating = Number(body.rating)
    if (!propertyId || !text || !Number.isInteger(rating) || rating < 1 || rating > 5) return Response.json({ success: false, error: 'Valid propertyId, text and rating are required' }, { status: 400 })
    const review = await addReview({ propertyId, userId: user._id!, authorName: user.name, rating, text })
    return ok({ review }, 201)
  } catch (error) { console.error('[v0] Failed to create review:', error); return serverError() }
}
