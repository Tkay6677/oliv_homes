'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Bell, BellDot, Building2, CalendarDays, Check, Heart, ImagePlus, LogOut, Map, MapPin, Menu, MessageCircle, Moon, Plus, Search, Settings, ShieldCheck, Star, Sun, Trash2, UserCircle, X } from 'lucide-react'
import { formatNaira, homeImage, nigerianStates, OLIV_MARKET } from '@/lib/oliv-data'
import { useOlivState } from '@/lib/oliv-client-state'
import type { PickedLocation } from '@/components/oliv-map'
import type { Property } from '@/lib/types'

const MapSkeleton = ({ tall = false }: { tall?: boolean }) => <div className={`animate-pulse rounded-2xl border border-border bg-muted ${tall ? 'h-[420px]' : 'h-64'}`} />

const PropertyListMap = dynamic(() => import('@/components/oliv-map').then((module) => module.PropertyListMap), { ssr: false, loading: () => <MapSkeleton tall /> })
const PropertyLocationMap = dynamic(() => import('@/components/oliv-map').then((module) => module.PropertyLocationMap), { ssr: false, loading: () => <MapSkeleton /> })
const MapPicker = dynamic(() => import('@/components/oliv-map').then((module) => module.MapPicker), { ssr: false })

// State filtering uses lib/oliv-data's full state list + city inference (stateForCity).
const formatDate = (value?: string | Date | null) => value ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const formatRelative = (value?: string | Date | null) => {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}
const STATUS_LABEL: Record<string, string> = { NOT_STARTED: 'Not started', SUBMITTED: 'Submitted for review', UNDER_REVIEW: 'Under review', VERIFIED: 'Verified agent', REJECTED: 'Not approved', SUSPENDED: 'Suspended' }

function NotificationBell() {
  const { user, notifications, unread, markNotificationRead, markAllNotificationsRead } = useOlivState()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!boxRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  if (!user) return null
  const iconFor = (type?: string) => {
    switch (type) {
      case 'VIEWING_REQUEST': case 'VIEWING_CONFIRMED': case 'VIEWING_DECLINED': case 'VIEWING_COMPLETED': return <CalendarDays className="size-4 text-primary" />
      case 'INQUIRY': case 'INQUIRY_REPLIED': return <MessageCircle className="size-4 text-primary" />
      case 'REVIEW_RECEIVED': return <Star className="size-4 text-accent-foreground" />
      case 'AGENT_APPLICATION': case 'LISTING_PUBLISHED': return <Building2 className="size-4 text-primary" />
      case 'VERIFICATION_APPROVED': return <ShieldCheck className="size-4 text-green-600" />
      case 'VERIFICATION_REJECTED': case 'VERIFICATION_SUSPENDED': return <ShieldCheck className="size-4 text-red-500" />
      default: return <Bell className="size-4 text-muted-foreground" />
    }
  }
  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close notifications' : 'Open notifications'} aria-expanded={open} className="relative grid size-9 place-items-center rounded-full border border-border bg-card">
        {unread > 0 ? <BellDot className="size-5" /> : <Bell className="size-5" />}
        {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-[600] mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-serif text-lg">Notifications{unread > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{unread}</span>}</p>
            {unread > 0 && <button onClick={() => void markAllNotificationsRead()} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length ? notifications.slice(0, 30).map((item) => (
              <a key={item._id} href={item.link || '/profile'} onClick={() => { if (item._id && !item.readAt) void markNotificationRead(item._id); setOpen(false) }} className={`flex gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-muted ${item.readAt ? '' : 'bg-muted/40'}`}>
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted">{iconFor(item.type)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  {item.body && <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>}
                  <span className="mt-1 block text-[11px] text-muted-foreground/70">{formatRelative(item.createdAt)}</span>
                </span>
              </a>
            )) : <p className="p-8 text-center text-sm text-muted-foreground">You&apos;re all caught up — no notifications yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export function Header() {
  const { user } = useOlivState()
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)
  useEffect(() => { const savedTheme = localStorage.getItem('oliv-theme'); const isDark = savedTheme !== 'light'; setDark(isDark); document.documentElement.classList.toggle('dark', isDark) }, [])
  const toggleTheme = () => { const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next); localStorage.setItem('oliv-theme', next ? 'dark' : 'light') }
  const close = () => setOpen(false)
  const logout = async () => { close(); await fetch('/api/auth', { method: 'DELETE' }).catch(() => null); window.location.href = '/' }
  const navLinks = (
    <>
      <a href="/discover" onClick={close}>Discover</a>
      {user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN' ? <a href="/agent/dashboard" onClick={close}>Agent workspace</a> : <a href="/agent/onboarding" onClick={close}>For agents</a>}
      {user?.role === 'SUPER_ADMIN' && <a href="/admin" onClick={close}>Admin</a>}
      <a href="/profile" onClick={close}>Saved homes</a>
    </>
  )
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2" onClick={close}><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="size-4" /></span><span className="font-serif text-xl font-semibold">OLIV<span className="text-accent-foreground"> Homes</span></span></a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">{navLinks}</nav>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} aria-label={dark ? 'Use light theme' : 'Use dark theme'} title={dark ? 'Use light theme' : 'Use dark theme'} className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground">{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
          {!user && <a href="/login" className="hidden rounded-full px-3 py-2 text-sm font-medium sm:block">Log in</a>}
          {user && <>
            <NotificationBell />
            <button onClick={logout} aria-label="Log out" title="Log out" className="hidden size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground sm:grid"><LogOut className="size-4" /></button>
          </>}
          <a href="/profile" aria-label="Open profile" onClick={close} className="grid size-9 place-items-center rounded-full border border-border bg-card"><UserCircle className="size-5" /></a>
          <button onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} className="grid size-9 place-items-center rounded-full border border-border bg-card md:hidden">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium text-muted-foreground [&>a]:rounded-xl [&>a]:px-3 [&>a]:py-2.5 [&>a:hover]:bg-muted [&>a:hover]:text-foreground">{navLinks}</nav>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            {user ? (
              <button onClick={logout} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"><LogOut className="size-4" />Log out</button>
            ) : (
              <>
                <a href="/login" onClick={close} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Log in</a>
                <a href="/signup" onClick={close} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Get started</a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function Toast({ text }: { text: string }) { return text ? <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-xl">{text}</div> : null }

function PropertyCard({ id }: { id: string }) {
  const { homes, saved, toggleSaved } = useOlivState()
  const home = homes.find((item) => item._id === id)
  if (!home) return null
  const isSaved = saved.includes(id)
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative">
        <a href={`/listing/${id}`}><img src={homeImage(home)} alt={home.title} className="aspect-[1.28/1] w-full object-cover" /></a>
        <button onClick={() => toggleSaved(id)} aria-label={isSaved ? `Remove ${home.title}` : `Save ${home.title}`} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-card/95"><Heart className={isSaved ? 'size-4 fill-accent-foreground text-accent-foreground' : 'size-4'} /></button>
      </div>
      <div className="p-4">
        <a href={`/listing/${id}`}>
          <h3 className="font-serif text-xl">{home.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{home.location.city}, {home.location.address}</p>
        </a>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="font-semibold">{formatNaira(home.price)}<small className="ml-1 font-normal text-muted-foreground">/ year</small></span>
          <span className="text-xs text-muted-foreground">{home.bedrooms} bd · {home.bathrooms} ba</span>
        </div>
      </div>
    </article>
  )
}

export function DiscoverPage() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'list' | 'map'>('list')
  const { homes, loading } = useOlivState()
  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return homes.filter((home) => {
      const haystack = `${home.title} ${home.location.city} ${home.location.state ?? ''} ${home.location.address}`.toLowerCase()
      const matchesQuery = !terms.length || terms.every((term) => haystack.includes(term))
      return matchesQuery
    })
  }, [homes, query])
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-accent-foreground">Amassoma · Bayelsa</p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Find your next place</h1>
            <p className="mt-2 text-sm text-muted-foreground">Homes and rentals around {OLIV_MARKET.city} town.</p>
          </div>
          <div className="flex rounded-full border border-border bg-card p-1 text-sm">
            <button onClick={() => setMode('list')} className={`rounded-full px-4 py-2 ${mode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>List</button>
            <button onClick={() => setMode('map')} className={`flex items-center gap-1 rounded-full px-4 py-2 ${mode === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><Map className="size-4" />Map</button>
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
            <Search className="size-4 text-muted-foreground" />
            <input aria-label={`Search ${OLIV_MARKET.city} homes`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${OLIV_MARKET.city} homes...`} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">{OLIV_MARKET.city}, {OLIV_MARKET.state}</div>
        </div>
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>{loading ? 'Loading Nigerian homes…' : `${filtered.length} home${filtered.length === 1 ? '' : 's'} found`}</span>
          {mode === 'map' && <span className="hidden sm:block">Click a pin to open the listing.</span>}
        </div>
        {mode === 'list' ? (
          <div className="mt-4 grid gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((home) => <PropertyCard key={home._id} id={home._id!} />)}
            {!loading && !filtered.length && <p className="col-span-full rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No homes match your search yet. Try another city or clear the filters.</p>}
          </div>
        ) : (
          <div className="mt-4 pb-16">
            {loading ? <MapSkeleton tall /> : <PropertyListMap homes={filtered} />}
          </div>
        )}
      </main>
    </div>
  )
}

export function ListingPage({ id = '' }: { id?: string }) {
  const { homes, saved, toggleSaved, requests, requestViewing, sendInquiry, reviews, addReview, loading } = useOlivState()
  const [viewDate, setViewDate] = useState('')
  const [viewTime, setViewTime] = useState('Morning')
  const [message, setMessage] = useState('')
  const [review, setReview] = useState('')
  const [rating, setRating] = useState(5)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const home = homes.find((item) => item._id === id)
  const notify = (text: string) => { setToast(text); setTimeout(() => setToast(''), 2600) }
  const propertyReviews = reviews.filter((item) => item.propertyId === id)
  const hasRequested = requests.some((item) => item.propertyId === id && item.type === 'VIEWING')
  if (!home && !loading) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-serif text-4xl">Listing unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">This listing is not currently available in the catalog.</p>
          <a href="/discover" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Back to discover</a>
        </main>
      </div>
    )
  }
  if (!home) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-10">
          <div className="aspect-[1.35/1] animate-pulse rounded-2xl bg-muted" />
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-muted" />
          <div className="h-6 w-1/3 animate-pulse rounded-xl bg-muted" />
        </main>
      </div>
    )
  }
  const isSaved = saved.includes(id)
  const submitViewing = async () => {
    if (!viewDate) { notify('Pick a preferred date first'); return }
    setBusy(true)
    try { notify(await requestViewing(id, new Date(`${viewDate}T09:00:00`).toISOString(), viewTime) ?? 'Viewing request sent'); setViewDate('') } catch (error) { notify(error instanceof Error ? error.message : 'Unable to request viewing') } finally { setBusy(false) }
  }
  const submitInquiry = async () => {
    if (message.trim().length < 5) { notify('Write a short message for the agent'); return }
    setBusy(true)
    try { await sendInquiry(id, message); setMessage(''); notify('Message sent to the agent') } catch (error) { notify(error instanceof Error ? error.message : 'Unable to send message') } finally { setBusy(false) }
  }
  const submitReview = async () => {
    if (review.trim().length < 5) { notify('Write a little more about the home'); return }
    setBusy(true)
    try { await addReview(id, rating, review); setReview(''); notify('Review submitted — thank you!') } catch (error) { notify(error instanceof Error ? error.message : 'Unable to submit review') } finally { setBusy(false) }
  }
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <a href="/discover" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"><ArrowLeft className="size-4" />Back to discover</a>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <section>
            <div className="grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-[1.45fr_.55fr]">
              <img src={homeImage(home)} alt={`${home.title} main view`} className="aspect-[1.35/1] h-full w-full object-cover" />
              <img src={home.images?.[1] ?? homeImage(home)} alt="Interior detail" className="hidden h-full min-h-32 w-full object-cover sm:block" />
            </div>
            <div className="mt-4"><PropertyLocationMap home={home} /></div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">{home.verificationBadge ? 'Verified listing' : 'New listing'}</span>
                <h1 className="mt-2 font-serif text-4xl">{home.title}</h1>
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" />{home.location.address}, {home.location.city}, {home.location.country}</p>
              </div>
              <button onClick={() => toggleSaved(id)} aria-label={isSaved ? 'Remove from saved homes' : 'Save this home'} className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card"><Heart className={isSaved ? 'size-5 fill-accent-foreground text-accent-foreground' : 'size-5'} /></button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-muted px-3 py-1.5">{home.bedrooms} bedrooms</span>
              <span className="rounded-full bg-muted px-3 py-1.5">{home.bathrooms} bathrooms</span>
              <span className="rounded-full bg-muted px-3 py-1.5">{home.squareMeters} m²</span>
              <span className="rounded-full bg-muted px-3 py-1.5">{home.furnished ? 'Furnished' : 'Unfurnished'}</span>
              <span className="rounded-full bg-muted px-3 py-1.5 capitalize">{home.type}</span>
            </div>
            <p className="mt-5 font-serif text-3xl">{formatNaira(home.price)}<small className="ml-2 text-sm font-normal text-muted-foreground">/ year</small></p>
            <p className="mt-5 leading-relaxed text-muted-foreground">{home.description}</p>
            {home.amenities?.length > 0 && (
              <div className="mt-6">
                <h2 className="font-serif text-2xl">What this home offers</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">{home.amenities.map((amenity) => <span key={amenity} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"><Check className="size-3.5 text-accent-foreground" />{amenity}</span>)}</div>
              </div>
            )}
            <div className="mt-8 rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-serif text-2xl"><MessageCircle className="size-5" />Ask about this home</h2>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Hi, is this home still available? I would love to visit." className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring" />
              <button onClick={submitInquiry} disabled={busy} className="mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">Send message</button>
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-serif text-2xl"><CalendarDays className="size-5" />Book a viewing</h2>
              {hasRequested ? <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm">Your viewing request is with the agent. You will hear back within 24 hours.</p> : (
                <div className="mt-3 flex flex-col gap-3">
                  <input type="date" value={viewDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setViewDate(event.target.value)} aria-label="Preferred viewing date" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" />
                  <select value={viewTime} onChange={(event) => setViewTime(event.target.value)} aria-label="Preferred time of day" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none">
                    {['Morning', 'Afternoon', 'Evening'].map((slot) => <option key={slot}>{slot}</option>)}
                  </select>
                  <button onClick={submitViewing} disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">Request viewing</button>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-serif text-2xl"><Star className="size-5" />Reviews</h2>
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} onClick={() => setRating(value)} aria-label={`Rate ${value} stars`}><Star className={value <= rating ? 'size-5 fill-accent-foreground text-accent-foreground' : 'size-5 text-muted-foreground'} /></button>)}</div>
                <textarea value={review} onChange={(event) => setReview(event.target.value)} rows={3} placeholder="Share your experience with this home…" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring" />
                <button onClick={submitReview} disabled={busy} className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60">Submit review</button>
              </div>
              <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4">
                {propertyReviews.length ? propertyReviews.map((item) => (
                  <div key={item._id ?? item.createdAt}>
                    <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((value) => <Star key={value} className={value <= item.rating ? 'size-3.5 fill-accent-foreground text-accent-foreground' : 'size-3.5 text-muted-foreground'} />)}</div>
                    <p className="mt-1 text-sm">{item.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.authorName ?? item.author ?? 'Resident'} · {formatDate(item.createdAt)}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No published reviews yet for this home.</p>}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Toast text={toast} />
    </div>
  )
}

// __NEXT_LOGIN__

export function LoginPage({ signup = false }: { signup?: boolean }) {
  const { refresh } = useOlivState()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: signup ? 'signup' : 'login', name, email, password }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error ?? 'Authentication failed. Please try again.')
      await refresh()
      window.location.href = '/'
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'Authentication failed. Please try again.') } finally { setBusy(false) }
  }
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <a href="/" className="mb-8 flex items-center justify-center gap-2"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="size-5" /></span><span className="font-serif text-2xl font-semibold">OLIV<span className="text-accent-foreground"> Homes</span></span></a>
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 shadow-sm">
          <div>
            <h1 className="font-serif text-3xl">{signup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{signup ? 'Find and save Nigerian homes.' : 'Sign in to your saved homes and requests.'}</p>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-200">{error}</p>}
          {signup && (
            <label className="flex flex-col gap-1.5 text-sm font-medium">Full name
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" placeholder="Ada Okoro" />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium">Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" placeholder="you@example.com" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" placeholder="At least 8 characters" />
          </label>
          <button type="submit" disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
          <p className="text-center text-sm text-muted-foreground">{signup ? 'Already have an account? ' : 'New to OLIV Homes? '}<a href={signup ? '/login' : '/signup'} className="font-semibold underline">{signup ? 'Sign in' : 'Create an account'}</a></p>
          <p className="rounded-xl bg-muted px-4 py-3 text-center text-xs text-muted-foreground">Want to list homes? <a href="/agent/onboarding" className="font-semibold underline">Apply as an agent</a></p>
        </form>
      </div>
    </div>
  )
}

// __NEXT_PROFILE__

export function ProfilePage() {
  const { user, saved, homes, requests, loading } = useOlivState()
  const savedHomes = homes.filter((home) => saved.includes(home._id!))
  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <UserCircle className="mx-auto size-14 text-muted-foreground" />
          <h1 className="mt-4 font-serif text-3xl">Sign in to see your saved homes</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your favorites, viewing requests and inquiries live here.</p>
          <a href="/login" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Sign in</a>
        </main>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl">Hello, {user?.name?.split(' ')[0] ?? 'there'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN' ? <a href="/agent/dashboard" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">Agent workspace</a> : <a href="/agent/onboarding" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">Become an agent</a>}
            {user?.role === 'SUPER_ADMIN' && <a href="/admin" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Admin</a>}
          </div>
        </div>
        <section className="mt-8">
          <h2 className="font-serif text-2xl">Saved homes</h2>
          <div className="mt-4 grid gap-5 pb-10 sm:grid-cols-2 lg:grid-cols-3">
            {savedHomes.map((home) => <PropertyCard key={home._id} id={home._id!} />)}
            {!loading && !savedHomes.length && <p className="col-span-full rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No saved homes yet. Tap the heart on any listing to save it here.</p>}
          </div>
        </section>
        <section className="pb-16">
          <h2 className="font-serif text-2xl">Viewings &amp; inquiries</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {requests.length ? requests.map((item) => {
              const home = homes.find((candidate) => candidate._id === item.propertyId)
              return (
                <div key={item._id ?? `${item.propertyId}-${item.createdAt}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0">
                  <div>
                    <p className="font-medium">{home?.title ?? 'Listing'}</p>
                    <p className="text-xs text-muted-foreground">{item.type === 'VIEWING' ? `Viewing · ${formatDate(item.preferredDate)}` : `Inquiry${item.message ? ` · "${item.message.slice(0, 60)}"` : ''}`} · {formatDate(item.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : item.status === 'CANCELLED' || item.status === 'ARCHIVED' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>{item.status}</span>
                </div>
              )
            }) : <p className="p-8 text-center text-sm text-muted-foreground">No viewing requests or inquiries yet.</p>}
          </div>
        </section>
      </main>
    </div>
  )
}

// __NEXT_ONBOARD__

const STATUS_STEPS = ['Your identity', 'Agency details', 'Coverage & location'] as const

export function AgentOnboardingPage() {
  const { refresh } = useOlivState()
  const [status, setStatus] = useState<'loading' | 'guest' | 'form' | 'pending' | 'verified' | 'suspended' | 'rejected'>('loading')
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [bio, setBio] = useState('')
  const [statesServed] = useState<string[]>([OLIV_MARKET.state])
  const [office, setOffice] = useState<PickedLocation | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/agent/onboarding').then((response) => response.json()).then((data) => {
      if (!active) return
      const agentUser = data.user
      if (!agentUser) { setStatus('guest'); return }
      setName(agentUser.name ?? '')
      if (agentUser.agentVerificationStatus === 'VERIFIED') setStatus('verified')
      else if (agentUser.agentVerificationStatus === 'SUSPENDED') setStatus('suspended')
      else if (agentUser.agentVerificationStatus === 'SUBMITTED' || agentUser.agentVerificationStatus === 'UNDER_REVIEW') setStatus('pending')
      else if (agentUser.agentVerificationStatus === 'REJECTED') { setStatus('form'); setName(agentUser.name ?? '') }
      else setStatus('form')
    }).catch(() => { if (active) setStatus('guest') })
    return () => { active = false }
  }, [])

  const stepValid = step === 0 ? name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 7 : step === 1 ? companyName.trim().length >= 2 && licenseNumber.trim().length >= 3 : statesServed.length > 0
  const submit = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/agent/onboarding', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, phone, companyName, licenseNumber, bio, statesServed, officeLocation: office ? { lat: office.lat, lng: office.lng, address: office.address, city: office.city, state: office.state } : undefined }) })
      if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error ?? 'Unable to submit application.') }
      await refresh()
      setStatus('pending')
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'Unable to submit application.') } finally { setBusy(false) }
  }

  if (status === 'loading') return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-muted-foreground">Loading your agent workspace…</main></div>

  if (status === 'guest') return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <ShieldCheck className="mx-auto size-14 text-accent-foreground" />
        <h1 className="mt-4 font-serif text-4xl">Become an OLIV agent</h1>
        <p className="mt-3 text-sm text-muted-foreground">List verified homes in Amassoma, Bayelsa. Sign in or create an account to start your application — it takes about 3 minutes.</p>
        <div className="mt-7 flex justify-center gap-3">
          <a href="/login?next=/agent/onboarding" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Sign in</a>
          <a href="/signup" className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold">Create account</a>
        </div>
      </main>
    </div>
  )

  if (status === 'verified') return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <Check className="mx-auto size-14 text-green-600" />
        <h1 className="mt-4 font-serif text-4xl">You are a verified agent</h1>
        <p className="mt-3 text-sm text-muted-foreground">Your account already has listing access. Head to your workspace to manage homes and requests.</p>
        <a href="/agent/dashboard" className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Open agent workspace</a>
      </main>
    </div>
  )

  if (status === 'suspended') return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <ShieldCheck className="mx-auto size-14 text-red-500" />
        <h1 className="mt-4 font-serif text-4xl">Account suspended</h1>
        <p className="mt-3 text-sm text-muted-foreground">This agent account is suspended. Contact support to resolve it before reapplying.</p>
      </main>
    </div>
  )

  if (status === 'pending') return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-muted"><CalendarDays className="size-7 text-muted-foreground" /></span>
        <h1 className="mt-4 font-serif text-4xl">Application received</h1>
        <p className="mt-3 text-sm text-muted-foreground">Our team reviews agent applications within 48 hours. You will see your verification status update here and on your profile.</p>
        <div className="mt-7 flex justify-center gap-3">
          <a href="/profile" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Go to profile</a>
          <a href="/discover" className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold">Keep exploring</a>
        </div>
      </main>
    </div>
  )

// __NEXT_DASH__

  return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-accent-foreground">Agent onboarding</p>
        <h1 className="mt-2 font-serif text-4xl">Apply to list homes on OLIV</h1>
        <p className="mt-2 text-sm text-muted-foreground">Verified agents get a badge, appear in search results and manage their own listings.</p>
        <div className="mt-8 flex items-center gap-2">
          {STATUS_STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 flex-col gap-2">
              <div className={`h-1.5 rounded-full ${index <= step ? 'bg-primary' : 'bg-muted'}`} />
              <span className={`text-xs font-medium ${index <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{index + 1}. {label}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-200">{error}</p>}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl">Tell us who you are</h2>
              <label className="flex flex-col gap-1.5 text-sm font-medium">Full name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Chidi Ebi" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">Phone number
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+234 803 000 0002" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" />
              </label>
            </div>
          )}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl">Your agency</h2>
              <label className="flex flex-col gap-1.5 text-sm font-medium">Agency or company name
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ebi Homes Ltd" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">License or registration number
                <input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} placeholder="BAY-AG-003" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">About your agency <span className="font-normal text-muted-foreground">(optional)</span>
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="We rent and manage quality homes in Bayelsa and Rivers State." className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" />
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <h2 className="font-serif text-2xl">Where do you operate?</h2>
              <div>
                <p className="text-sm font-medium">Market coverage</p>
                <div className="mt-2 rounded-xl border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">{OLIV_MARKET.city}, {OLIV_MARKET.state}</div>
                <p className="mt-2 text-xs text-muted-foreground">OLIV currently accepts agent applications for homes within Amassoma town.</p>
              </div>
              <div>
                <p className="text-sm font-medium">Office location <span className="font-normal text-muted-foreground">(optional)</span></p>
                <div className="mt-2"><MapPicker value={office} onChange={setOffice} /></div>
              </div>
            </div>
          )}
          <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
            <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || busy} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold disabled:opacity-40">Back</button>
            {step < STATUS_STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep((current) => current + 1)} disabled={!stepValid} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Continue</button>
            ) : (
              <button type="button" onClick={submit} disabled={!stepValid || busy} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">{busy ? 'Submitting…' : 'Submit application'}</button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// __NEXT_ADMIN__

type AgentOverview = {
  agent?: { name?: string; email?: string; phone?: string; agentVerificationStatus?: string; agentVerificationLevel?: number; agentCompanyName?: string; agentLicenseNumber?: string; agentBio?: string; agentStatesServed?: string[]; agentOfficeLocation?: { lat: number; lng: number; address?: string; city?: string; state?: string } }
  properties?: Property[]
  metrics?: { activeListings: number; draftListings: number; viewingRequests: number; inquiries: number }
  error?: string
  needsOnboarding?: boolean
}
type AgentRequest = { _id: string; propertyId: string; propertyTitle?: string; userId: string; userName?: string; userEmail?: string; type?: 'VIEWING' | 'INQUIRY'; status: string; preferredDate?: string; preferredTime?: string; message?: string; agentReply?: string; createdAt?: string }
type AgentReview = { _id: string; propertyId: string; propertyTitle?: string; authorName: string; rating: number; text: string; status?: string; createdAt?: string }

function AddListingForm({ property, onCreated, onCancel }: { property?: Property; onCreated: (property: Property) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(property?.title ?? '')
  const [description, setDescription] = useState(property?.description ?? '')
  const [type, setType] = useState<Property['type']>(property?.type ?? 'apartment')
  const [price, setPrice] = useState(property ? String(property.price) : '')
  const [address, setAddress] = useState(property?.location.address ?? '')
  const [city, setCity] = useState(property?.location.city ?? OLIV_MARKET.city)
  const [state, setState] = useState(property?.location.state ?? OLIV_MARKET.state)
  const [postalCode, setPostalCode] = useState(property?.location.postalCode ?? '')
  const [bedrooms, setBedrooms] = useState(property ? String(property.bedrooms) : '2')
  const [bathrooms, setBathrooms] = useState(property ? String(property.bathrooms) : '2')
  const [squareMeters, setSquareMeters] = useState(property ? String(property.squareMeters) : '100')
  const [furnished, setFurnished] = useState(property?.furnished ?? false)
  const [amenities, setAmenities] = useState(property?.amenities.join(', ') ?? '')
  const [images, setImages] = useState<string[]>(property?.images ?? [])
  const [imageUrl, setImageUrl] = useState('')
  const [coordinates, setCoordinates] = useState<PickedLocation | null>(property?.location.coordinates ? { ...property.location.coordinates, address: property.location.address, city: property.location.city, state: property.location.state } : null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const notify = (text: string) => { setToast(text); setTimeout(() => setToast(''), 3200) }

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { notify(result.error ?? 'Image upload failed.'); return }
      setImages((current) => current.length >= 12 ? current : [...current, result.url])
      notify('Image uploaded')
    } finally { setUploading(false) }
  }
  const addImageUrl = () => {
    const value = imageUrl.trim()
    if (!/^https:\/\//.test(value)) { notify('Paste an https:// image link.'); return }
    setImages((current) => current.length >= 12 ? current : [...current, value])
    setImageUrl('')
  }
  const submit = async () => {
    if (title.trim().length < 4) { notify('Give the listing a title of at least 4 characters.'); return }
    if (description.trim().length < 20) { notify('Describe the home in at least 20 characters.'); return }
    if (!Number(price) || Number(price) < 1000) { notify('Enter a yearly price of at least ₦1,000.'); return }
    if (address.trim().length < 4 || city.trim().length < 2) { notify('Enter the street address and city.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/agent/properties', { method: property ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...(property?._id ? { propertyId: property._id } : {}),
        title, description, type, price: Number(price),
        location: { address, city, ...(state ? { state } : {}), postalCode, ...(coordinates ? { coordinates: { lat: coordinates.lat, lng: coordinates.lng } } : {}) },
        bedrooms: Number(bedrooms), bathrooms: Number(bathrooms), squareMeters: Number(squareMeters),
        furnished, amenities: amenities.split(',').map((item) => item.trim()).filter(Boolean), images, published: true,
      }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { notify(result.error ?? 'Unable to create the listing.'); return }
      onCreated(result.property)
    } catch { notify('Unable to create the listing. Check your connection.') } finally { setBusy(false) }
  }
  const field = 'w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring'
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-serif text-2xl"><ImagePlus className="size-5" />{property ? 'Edit listing' : 'Add a new listing'}</h2>
        <button onClick={onCancel} aria-label="Close form" className="grid size-9 place-items-center rounded-full border border-border"><X className="size-4" /></button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Riverside three-bedroom apartment" className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Yearly price (₦)<input value={price} onChange={(event) => setPrice(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="1250000" className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Property type<select value={type} onChange={(event) => setType(event.target.value as Property['type'])} className={field}>{['apartment', 'house', 'studio', 'townhouse', 'shared'].map((option) => <option key={option} value={option} className="capitalize">{option}</option>)}</select></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Amenities (comma separated)<input value={amenities} onChange={(event) => setAmenities(event.target.value)} placeholder="24/7 security, Parking, Generator" className={field} /></label>
      </div>
      <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Describe the home, the neighbourhood, and what makes it special…" className={field} /></label>
      <div className="mt-4">
        <p className="text-sm font-medium">Photos <span className="font-normal text-muted-foreground">(up to 12, first photo is the cover)</span></p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold ${uploading ? 'opacity-60' : ''}`}>{uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = '' }} /></label>
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addImageUrl() } }} placeholder="…or paste an https:// image URL" className={`${field} max-w-72 flex-1`} aria-label="Image URL" />
          <button type="button" onClick={addImageUrl} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Add link</button>
        </div>
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div key={`${image}-${index}`} className="relative">
                <img src={image} alt={`Listing photo ${index + 1}`} className="size-20 rounded-xl border border-border object-cover" />
                <button type="button" onClick={() => setImages((current) => current.filter((_, position) => position !== index))} aria-label={`Remove photo ${index + 1}`} className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-card border border-border"><Trash2 className="size-3" /></button>
                {index === 0 && <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Cover</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">Street address<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="201 Grand Key Loop East" className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">City<input value={city} onChange={(event) => setCity(event.target.value)} placeholder={OLIV_MARKET.city} className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">State <span className="font-normal text-muted-foreground">(auto-filled when you pin the map)</span>
          <select value={state} onChange={(event) => setState(event.target.value)} className={field}><option value={OLIV_MARKET.state}>{OLIV_MARKET.state}</option></select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Postal code<input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="560001" className={field} /></label>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium">Pin the location on the map <span className="font-normal text-muted-foreground">(optional — helps renters find you)</span></p>
        <div className="mt-2"><MapPicker value={coordinates} onChange={(location) => { setCoordinates(location); if (location?.address && !address) setAddress(location.address); if (location?.city && !city) setCity(location.city); if (location?.state && !state) setState(location.state) }} /></div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">Bedrooms<input value={bedrooms} onChange={(event) => setBedrooms(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Bathrooms<input value={bathrooms} onChange={(event) => setBathrooms(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Size (m²)<input value={squareMeters} onChange={(event) => setSquareMeters(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={field} /></label>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium"><input type="checkbox" checked={furnished} onChange={(event) => setFurnished(event.target.checked)} className="size-4" />Furnished</label>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button type="button" onClick={submit} disabled={busy} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? (property ? 'Saving…' : 'Publishing…') : (property ? 'Save changes' : 'Publish listing')}</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-border px-5 py-3 text-sm font-semibold">Cancel</button>
        <p className="text-xs text-muted-foreground">Listings go live instantly and appear on Discover.</p>
      </div>
      <Toast text={toast} />
    </div>
  )
}

function AgentSettingsForm({ agent, onSaved, onCancel }: { agent: NonNullable<AgentOverview['agent']>; onSaved: (agent: Record<string, unknown>) => void; onCancel: () => void }) {
  const [companyName, setCompanyName] = useState(agent.agentCompanyName ?? '')
  const [licenseNumber, setLicenseNumber] = useState(agent.agentLicenseNumber ?? '')
  const [phone, setPhone] = useState(agent.phone ?? '')
  const [bio, setBio] = useState(agent.agentBio ?? '')
  const [statesServed, setStatesServed] = useState<string[]>(agent.agentStatesServed ?? [])
  const [officeLocation, setOfficeLocation] = useState<PickedLocation | null>(agent.agentOfficeLocation ? { lat: agent.agentOfficeLocation.lat, lng: agent.agentOfficeLocation.lng, address: agent.agentOfficeLocation.address, city: agent.agentOfficeLocation.city, state: agent.agentOfficeLocation.state } : null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const notify = (text: string) => { setToast(text); setTimeout(() => setToast(''), 3200) }
  const toggleState = (state: string) => setStatesServed((current) => current.includes(state) ? current.filter((item) => item !== state) : [...current, state])
  const field = 'w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring'
  const save = async () => {
    if (companyName.trim().length < 2) { notify('Enter your company name.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/agent/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ companyName: companyName.trim(), licenseNumber: licenseNumber.trim(), phone: phone.trim(), bio: bio.trim(), statesServed, officeLocation }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { notify(result.error ?? 'Unable to save settings.'); return }
      onSaved(result.agent ?? {})
      notify('Profile settings saved')
    } catch { notify('Unable to save settings. Check your connection.') } finally { setBusy(false) }
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-serif text-2xl"><Settings className="size-5" />Agent settings</h2>
        <button onClick={onCancel} aria-label="Close settings" className="grid size-9 place-items-center rounded-full border border-border"><X className="size-4" /></button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ebi Homes" className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">License number<input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} placeholder="BAY-AG-003" className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+234 803 000 0002" className={field} /></label>
      </div>
      <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">Short bio
        <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="Tell renters about your agency…" className={field} />
      </label>
      <div className="mt-4">
        <p className="text-sm font-medium">States you serve</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {nigerianStates.map((state) => (
            <label key={state} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input type="checkbox" checked={statesServed.includes(state)} onChange={() => toggleState(state)} className="size-4" />
              <span className="truncate">{state === 'FCT' ? 'FCT · Abuja' : state}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium">Office location <span className="font-normal text-muted-foreground">(shown to renters)</span></p>
        <div className="mt-2"><MapPicker value={officeLocation} onChange={setOfficeLocation} /></div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button type="button" onClick={() => void save()} disabled={busy} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Saving…' : 'Save settings'}</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-border px-5 py-3 text-sm font-semibold">Cancel</button>
      </div>
      <Toast text={toast} />
    </div>
  )
}

export function AgentDashboardPage() {
  const [data, setData] = useState<AgentOverview | null>(null)
  const [requests, setRequests] = useState<AgentRequest[]>([])
  const [reviews, setReviews] = useState<AgentReview[]>([])
  const [tab, setTab] = useState<'listings' | 'requests' | 'reviews'>('listings')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState('')
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const notify = (text: string) => { setNotice(text); setTimeout(() => setNotice(''), 3200) }
  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/agent/overview').then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) })),
      fetch('/api/agent/requests').then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) })),
      fetch('/api/agent/reviews').then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) })),
    ]).then(([overview, requestData, reviewData]) => {
      if (!active) return
      if (!overview.ok) { setError(overview.body.needsOnboarding ? 'onboarding' : overview.body.error ?? 'Unable to load workspace.'); return }
      setData(overview.body)
      setRequests(requestData.ok ? (requestData.body.items ?? []) : [])
      setReviews(reviewData.ok ? (reviewData.body.reviews ?? []) : [])
    }).catch(() => { if (active) setError('Unable to load workspace.') })
    return () => { active = false }
  }, [reload])
  const respond = async (requestId: string, action: 'CONFIRM' | 'COMPLETE' | 'CANCEL' | 'REPLY') => {
    const reply = (replyText[requestId] ?? '').trim()
    if (action === 'REPLY' && reply.length < 2) { notify('Write a reply for the renter first.'); return }
    setBusyId(requestId)
    try {
      const response = await fetch('/api/agent/requests', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId, action, reply }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { notify(result.error ?? 'Unable to update the request.'); return }
      const statusByAction: Record<string, string> = { CONFIRM: 'CONFIRMED', COMPLETE: 'COMPLETED', CANCEL: 'CANCELLED', REPLY: 'REPLIED' }
      setRequests((items) => items.map((item) => item._id === requestId ? { ...item, status: statusByAction[action], agentReply: action === 'REPLY' ? reply : item.agentReply } : item))
      setReplyText((current) => { const next = { ...current }; delete next[requestId]; return next })
      notify(action === 'REPLY' ? 'Reply sent to the renter' : 'Request updated')
      setReload((value) => value + 1)
    } catch { notify('Unable to update the request.') } finally { setBusyId('') }
  }
  const deleteListing = async (property: Property) => {
    if (!property._id || !window.confirm(`Delete “${property.title}”? This cannot be undone.`)) return
    setBusyId(property._id)
    try {
      const response = await fetch(`/api/agent/properties?id=${encodeURIComponent(property._id)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { notify(result.error ?? 'Unable to delete the listing.'); return }
      notify('Listing deleted'); setReload((value) => value + 1)
    } catch { notify('Unable to delete the listing.') } finally { setBusyId('') }
  }
  if (error === 'onboarding') return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">Finish agent onboarding first</h1>
        <p className="mt-3 text-sm text-muted-foreground">Your account is not yet a verified agent. Complete the application to unlock the workspace.</p>
        <a href="/agent/onboarding" className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Start agent application</a>
      </main>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">Sign in to continue</h1>
        <p className="mt-3 text-sm text-muted-foreground">The agent workspace requires an agent account.</p>
        <a href="/login?next=/agent/dashboard" className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Sign in</a>
      </main>
    </div>
  )
  if (!data) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-7xl px-4 py-24 text-center text-sm text-muted-foreground">Loading your workspace…</main></div>
  const metrics = data.metrics ?? { activeListings: 0, draftListings: 0, viewingRequests: 0, inquiries: 0 }
  const status = data.agent?.agentVerificationStatus ?? 'NOT_STARTED'
  return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-accent-foreground">Agent workspace</p>
            <h1 className="mt-2 font-serif text-4xl">{data.agent?.agentCompanyName ?? data.agent?.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status === 'VERIFIED' ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200' : status === 'SUBMITTED' || status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200' : 'bg-muted text-muted-foreground'}`}>{status.replace('_', ' ')}</span>
              {data.agent?.agentStatesServed?.length ? `Serving ${data.agent.agentStatesServed.join(', ')}` : 'No states listed yet'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setSettingsOpen((open) => !open)} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold"><Settings className="size-4" />{settingsOpen ? 'Close settings' : 'Settings'}</button>
            <button onClick={() => setShowForm((open) => !open)} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">{showForm ? 'Close form' : '+ Add listing'}</button>
            <a href="/discover" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">View public site</a>
          </div>
        </div>
        {settingsOpen && data.agent && (
          <div className="mt-6">
            <AgentSettingsForm agent={data.agent} onSaved={(agent) => { setData((current) => current ? { ...current, agent: { ...current.agent, ...agent } } : current); setReload((value) => value + 1) }} onCancel={() => setSettingsOpen(false)} />
          </div>
        )}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => setTab('listings')} className="rounded-2xl border border-border bg-card p-5 text-left"><p className="text-sm text-muted-foreground">Active listings</p><p className="mt-1 font-serif text-3xl">{metrics.activeListings}</p></button>
          <button onClick={() => setTab('listings')} className="rounded-2xl border border-border bg-card p-5 text-left"><p className="text-sm text-muted-foreground">Drafts</p><p className="mt-1 font-serif text-3xl">{metrics.draftListings}</p></button>
          <button onClick={() => setTab('requests')} className="rounded-2xl border border-border bg-card p-5 text-left"><p className="text-sm text-muted-foreground">Viewing requests</p><p className="mt-1 font-serif text-3xl">{metrics.viewingRequests}</p></button>
          <button onClick={() => setTab('requests')} className="rounded-2xl border border-border bg-card p-5 text-left"><p className="text-sm text-muted-foreground">Inquiries</p><p className="mt-1 font-serif text-3xl">{metrics.inquiries}</p></button>
        </div>
        {showForm && (
          <div className="mt-8">
            <AddListingForm onCreated={() => { setShowForm(false); setReload((value) => value + 1) }} onCancel={() => setShowForm(false)} />
          </div>
        )}
        {editingProperty && (
          <div className="mt-8"><AddListingForm property={editingProperty} onCreated={() => { setEditingProperty(null); setReload((value) => value + 1) }} onCancel={() => setEditingProperty(null)} /></div>
        )}
        <div className="mt-9 flex gap-2 border-b border-border pb-px">
          {([['listings', `Listings (${(data.properties ?? []).length})`], ['requests', `Requests (${requests.length})`], ['reviews', `Reviews (${reviews.length})`]] as const).map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)} className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold ${tab === value ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>{label}</button>
          ))}
        </div>
        {tab === 'listings' && (
          <section className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {data.properties?.length ? data.properties.map((property) => (
                <div key={property._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <a href={`/listing/${property._id}`} className="font-medium hover:underline">{property.title}</a>
                    <p className="text-xs text-muted-foreground">{property.location.city}{property.location.state ? `, ${property.location.state}` : ''} · {formatNaira(property.price)} / year</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${property.published ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200' : 'bg-muted text-muted-foreground'}`}>{property.published ? 'Published' : 'Draft'}</span>
                    <button type="button" onClick={() => { setEditingProperty(property); setShowForm(false) }} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Edit</button>
                    <button type="button" disabled={busyId === property._id} onClick={() => void deleteListing(property)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">{busyId === property._id ? 'Deleting…' : 'Delete'}</button>
                  </div>
                </div>
              )) : <p className="p-8 text-center text-sm text-muted-foreground">No listings yet. Once verified you can publish homes from here.</p>}
            </div>
          </section>
        )}
        {tab === 'requests' && (
          <section className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {requests.length ? requests.map((request) => (
                <div key={request._id} className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{request.propertyTitle ?? 'Listing'} <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{request.type === 'INQUIRY' ? 'Inquiry' : 'Viewing'}</span></p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{request.userName}{request.userEmail ? ` · ${request.userEmail}` : ''}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200' : request.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200' : request.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200' : request.status === 'CANCELLED' || request.status === 'ARCHIVED' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200' : 'bg-muted text-muted-foreground'}`}>{request.status.replace('_', ' ')}</span>
                  </div>
                  {request.type === 'VIEWING' ? (
                    <p className="text-sm">Would like to view it on <strong>{formatDate(request.preferredDate)}</strong>{request.preferredTime ? ` (${request.preferredTime})` : ''}</p>
                  ) : <p className="text-sm">{request.message}</p>}
                  {request.agentReply && <p className="rounded-lg bg-muted px-3 py-2 text-xs"><strong>Your reply: </strong>{request.agentReply}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    {request.type === 'VIEWING' && request.status === 'PENDING' && (<>
                      <button onClick={() => void respond(request._id, 'CONFIRM')} disabled={busyId === request._id} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">Confirm viewing</button>
                      <button onClick={() => void respond(request._id, 'CANCEL')} disabled={busyId === request._id} className="rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-60">Decline</button>
                    </>)}
                    {request.type === 'VIEWING' && request.status === 'CONFIRMED' && (<>
                      <button onClick={() => void respond(request._id, 'COMPLETE')} disabled={busyId === request._id} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">Mark completed</button>
                      <button onClick={() => void respond(request._id, 'CANCEL')} disabled={busyId === request._id} className="rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-60">Cancel</button>
                    </>)}
                    {request.type === 'INQUIRY' && request.status !== 'REPLIED' && (
                      <div className="flex min-w-0 flex-1 gap-2">
                        <input value={replyText[request._id] ?? ''} onChange={(event) => setReplyText((current) => ({ ...current, [request._id]: event.target.value }))} placeholder="Write your reply…" className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-xs outline-none focus:border-ring" />
                        <button onClick={() => void respond(request._id, 'REPLY')} disabled={busyId === request._id} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">Send</button>
                      </div>
                    )}
                  </div>
                </div>
              )) : <p className="p-8 text-center text-sm text-muted-foreground">No viewing requests or inquiries yet. They will appear here the moment a renter books or messages you.</p>}
            </div>
          </section>
        )}
        {tab === 'reviews' && (
          <section className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {reviews.length ? reviews.map((review) => (
                <div key={review._id} className="border-b border-border px-5 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{review.propertyTitle ?? 'Listing'}</p>
                    <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((value) => <Star key={value} className={value <= review.rating ? 'size-3.5 fill-accent-foreground text-accent-foreground' : 'size-3.5 text-muted-foreground'} />)}</div>
                  </div>
                  <p className="mt-1 text-sm">{review.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{review.authorName} · {formatDate(review.createdAt)}{review.status && review.status !== 'PUBLISHED' ? ` · ${review.status.replace('_', ' ')}` : ''}</p>
                </div>
              )) : <p className="p-8 text-center text-sm text-muted-foreground">No reviews on your listings yet.</p>}
            </div>
          </section>
        )}
        {/* __DASHBOARD_REQUEST_SECTION__ */}
      </main>
      <Toast text={notice} />
    </div>
  )
}

// __NEXT_ADMIN_QUEUE__

type QueueAgent = { _id: string; name: string; email: string; phone?: string; agentCompanyName?: string; agentLicenseNumber?: string; agentBio?: string; agentStatesServed?: string[]; agentOfficeLocation?: { address?: string; city?: string; state?: string }; agentVerificationStatus?: string }

export function AdminDashboardPage() {
  const { user } = useOlivState()
  const [queue, setQueue] = useState<QueueAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [denied, setDenied] = useState(false)
  const load = () => {
    setLoading(true)
    fetch('/api/admin/verification').then(async (response) => {
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { setDenied(true); return }
      setQueue(result.queue ?? [])
    }).catch(() => setDenied(true)).finally(() => setLoading(false))
  }
  useEffect(load, [])
  const act = async (userId: string, action: 'approve' | 'reject' | 'review' | 'suspend') => {
    setMessage('')
    const response = await fetch('/api/admin/verification', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, action }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setMessage(result.error ?? 'Action failed.'); return }
    setMessage(`${result.agent?.name ?? 'Agent'} → ${String(result.agent?.agentVerificationStatus ?? action).replace('_', ' ')}`)
    setQueue((items) => action === 'review' ? items.map((item) => item._id === userId ? { ...item, agentVerificationStatus: 'UNDER_REVIEW' } : item) : items.filter((item) => item._id !== userId))
  }
  return (
    <div className="min-h-screen bg-background"><Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-accent-foreground">Super admin</p>
        <h1 className="mt-2 font-serif text-4xl">Agent verification queue</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review agent applications, then approve or reject. Approved agents can publish listings immediately.</p>
        {message && <p role="status" className="mt-5 rounded-xl bg-muted px-4 py-3 text-sm">{message}</p>}
        {denied ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
            <h2 className="font-serif text-2xl">Admin access required</h2>
            <p className="mt-2 text-sm text-muted-foreground">{user ? 'This account does not have super admin rights.' : 'Sign in with a super admin account to manage verifications.'}</p>
            {!user && <a href="/login?next=/admin" className="mt-5 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Sign in</a>}
          </div>
        ) : loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading queue…</p>
        ) : queue.length ? (
          <div className="mt-7 flex flex-col gap-4">
            {queue.map((agent) => (
              <div key={agent._id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-xl">{agent.agentCompanyName ?? agent.name}</h2>
                    <p className="text-sm text-muted-foreground">{agent.name} · {agent.email}{agent.phone ? ` · ${agent.phone}` : ''}</p>
                    <p className="mt-1 text-xs text-muted-foreground">License: {agent.agentLicenseNumber ?? '—'} · States: {agent.agentStatesServed?.join(', ') || '—'}</p>
                    {agent.agentOfficeLocation && <p className="text-xs text-muted-foreground">Office: {[agent.agentOfficeLocation.address, agent.agentOfficeLocation.city, agent.agentOfficeLocation.state].filter(Boolean).join(', ') || 'pinned on map'}</p>}
                    {agent.agentBio && <p className="mt-2 max-w-xl text-sm">{agent.agentBio}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${agent.agentVerificationStatus === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}`}>{(agent.agentVerificationStatus ?? 'SUBMITTED').replace('_', ' ')}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <button onClick={() => act(agent._id, 'approve')} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Approve &amp; verify</button>
                  <button onClick={() => act(agent._id, 'review')} className="rounded-full border border-border px-5 py-2 text-sm font-semibold">Mark under review</button>
                  <button onClick={() => act(agent._id, 'reject')} className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-red-600">Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">The queue is clear — no agent applications waiting for review.</p>
        )}
      </main>
    </div>
  )
}