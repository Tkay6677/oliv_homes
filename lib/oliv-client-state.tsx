'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Property } from './types'
import { olivHomes as seededHomes } from './oliv-data'

type Review = { _id?: string; id?: string; propertyId: string; author?: string; authorName?: string; rating: number; text: string; createdAt?: string }
type User = { _id?: string; name: string; email: string; role: 'USER' | 'AGENT' | 'SUPER_ADMIN'; agentVerificationStatus?: string; agentVerificationLevel?: number; agentCompanyName?: string; agentLicenseNumber?: string; agentBio?: string; agentStatesServed?: string[]; agentOfficeLocation?: { lat: number; lng: number; address?: string; city?: string; state?: string } }
type ViewingRequest = { _id?: string; id?: string; propertyId: string; type: 'VIEWING' | 'INQUIRY'; status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REPLIED' | 'ARCHIVED'; preferredDate?: string; message?: string; createdAt?: string }
type State = {
  saved: string[]
  reviews: Review[]
  requests: ViewingRequest[]
  homes: Property[]
  user: User | null
  loading: boolean
  toggleSaved: (id: string) => Promise<void>
  addReview: (propertyId: string, rating: number, text: string) => Promise<void>
  requestViewing: (propertyId: string, preferredDate?: string, preferredTime?: string) => Promise<string | undefined>
  sendInquiry: (propertyId: string, message: string) => Promise<void>
  refresh: () => Promise<void>
}
const Context = createContext<State | null>(null)

export function OlivStateProvider({ children }: { children: React.ReactNode }) {
  const [homes, setHomes] = useState<Property[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [requests, setRequests] = useState<ViewingRequest[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [properties, auth] = await Promise.all([fetch('/api/properties').then((r) => r.ok ? r.json() : { items: [] }), fetch('/api/auth').then((r) => r.ok ? r.json() : { user: null })])
      setHomes(properties.items ?? [])
      setUser(auth.user ?? null)
      if (auth.user?._id) {
        const [favorites, requestItems] = await Promise.all([
          fetch('/api/favorites').then((r) => r.ok ? r.json() : { items: [] }),
          fetch('/api/requests').then((r) => r.ok ? r.json() : { items: [] }),
        ])
        setSaved((favorites.items ?? []).map((item: { propertyId: string }) => item.propertyId))
        setRequests(requestItems.items ?? [])
      }
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  const toggleSaved = useCallback(async (id: string) => {
    const response = await fetch('/api/favorites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ propertyId: id }) })
    if (response.status === 401) { window.location.href = '/login?next=/profile'; return }
    if (response.ok) setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }, [])
  const addReview = useCallback(async (propertyId: string, rating: number, text: string) => {
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ propertyId, rating, text }) })
    if (response.status === 401) { window.location.href = `/login?next=/listing/${propertyId}`; return }
    if (!response.ok) throw new Error('Unable to submit review')
    const result = await response.json(); setReviews((items) => [result.review, ...items])
  }, [])
  const requestViewing = useCallback(async (propertyId: string, preferredDate?: string, preferredTime?: string) => {
    const response = await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ propertyId, type: 'VIEWING', preferredDate: preferredDate ?? new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), preferredTime: preferredTime ?? 'Morning' }) })
    if (response.status === 401) { window.location.href = `/login?next=/listing/${propertyId}`; return }
    if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error ?? 'Unable to request viewing') }
    const result = await response.json()
    setRequests((items) => items.some((item) => item.propertyId === propertyId && item.type === 'VIEWING') ? items : [{ propertyId, type: 'VIEWING', status: 'PENDING', preferredDate, createdAt: new Date().toISOString() }, ...items])
    return result.message as string | undefined
  }, [])
  const sendInquiry = useCallback(async (propertyId: string, message: string) => {
    const response = await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ propertyId, type: 'INQUIRY', message }) })
    if (response.status === 401) { window.location.href = `/login?next=/listing/${propertyId}`; return }
    if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error ?? 'Unable to send message') }
    setRequests((items) => [{ propertyId, type: 'INQUIRY', status: 'PENDING', message, createdAt: new Date().toISOString() }, ...items])
  }, [])
  const value = useMemo(() => ({ saved, reviews, requests, homes, user, loading, toggleSaved, addReview, requestViewing, sendInquiry, refresh }), [saved, reviews, requests, homes, user, loading, toggleSaved, addReview, requestViewing, sendInquiry, refresh])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useOlivState() { const value = useContext(Context); if (!value) throw new Error('useOlivState must be used inside OlivStateProvider'); return value }
export const olivHomes: Property[] = seededHomes

