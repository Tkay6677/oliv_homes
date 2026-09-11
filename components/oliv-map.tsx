'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { formatNaira, getAmassomaZone, OLIV_MARKET, type AmassomaZone } from '@/lib/oliv-data'

export type MapPoint = { lat: number; lng: number }
export type PickedLocation = MapPoint & { address?: string; city?: string; state?: string }
export type MapHome = { _id?: string; title: string; price: number; location: { address?: string; city?: string; area?: string; coordinates?: MapPoint | null } }

const AMASSOMA_CENTER: MapPoint = OLIV_MARKET.center

const pinIcon = (variant: 'primary' | 'accent' = 'primary') => L.divIcon({
  className: 'oliv-pin',
  html: `<span class="oliv-pin-dot oliv-pin-${variant}"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
})

const formatPoint = (point: MapPoint) => ({ lat: Number(point.lat.toFixed(5)), lng: Number(point.lng.toFixed(5)) })

async function geocodeQuery(query: string): Promise<PickedLocation[]> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=ng&q=${encodeURIComponent(query)}`, { headers: { 'Accept-Language': 'en' } })
  if (!response.ok) throw new Error('Location search failed. Try again.')
  return (await response.json()).map((item: { lat: string; lon: string; display_name: string; address?: Record<string, string> }) => ({
    ...formatPoint({ lat: Number(item.lat), lng: Number(item.lon) }),
    address: item.display_name.split(',').slice(0, 2).join(','),
    city: item.address?.city ?? item.address?.town ?? item.address?.village ?? item.address?.state_district ?? '',
    state: item.address?.state ?? '',
  }))
}

async function reverseGeocode(point: MapPoint): Promise<PickedLocation> {
  const fallback: PickedLocation = { ...formatPoint(point) }
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${point.lat}&lon=${point.lng}`, { headers: { 'Accept-Language': 'en' } })
    if (!response.ok) return fallback
    const item = await response.json()
    const address = item?.address ?? {}
    return { ...formatPoint(point), address: item?.display_name?.split(',').slice(0, 2).join(',') ?? '', city: address.city ?? address.town ?? address.village ?? address.state_district ?? '', state: address.state ?? '' }
  } catch { return fallback }
}

function FitPoints({ points }: { points: MapPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) { map.setView(AMASSOMA_CENTER, 14); return }
    if (points.length === 1) map.setView(points[0], 15, { animate: true })
    else map.fitBounds(L.latLngBounds(points.map((point) => [point.lat, point.lng])), { padding: [40, 40] })
  }, [map, points])
  return null
}

function ClickPicker({ onPick }: { onPick: (point: MapPoint) => void }) {
  useMapEvents({ click: (event) => onPick(formatPoint(event.latlng)) })
  return null
}

function Recenter({ point }: { point: MapPoint }) {
  const map = useMap()
  useEffect(() => { map.setView(point, map.getZoom(), { animate: true }) }, [map, point])
  return null
}

function MapShell({ center, zoom = 14, children }: { center?: MapPoint; zoom?: number; children: React.ReactNode }) {
  return (
    <MapContainer center={center ?? AMASSOMA_CENTER} zoom={zoom} scrollWheelZoom={false} className="h-full w-full" attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {children}
    </MapContainer>
  )
}
export function PropertyListMap({ homes, selectedArea, areas }: { homes: MapHome[]; selectedArea?: string; areas?: AmassomaZone[] }) {
  const points = useMemo(() => homes.filter((home) => home.location?.coordinates).map((home) => home.location.coordinates!), [homes])
  const zone = (areas ?? []).find((item) => item.name === selectedArea) ?? getAmassomaZone(selectedArea)
  if (!points.length && !zone) return <div className="grid min-h-72 place-items-center rounded-2xl border border-border bg-muted text-sm text-muted-foreground">No mapped listings in this view yet.</div>
  return (
    <div className="relative h-[420px] overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapShell>
        <FitPoints points={points} />
        {zone && <Circle center={zone.center} radius={zone.radius} pathOptions={{ color: '#d8ab52', fillColor: '#d8ab52', fillOpacity: 0.18, weight: 2 }} />}
        {homes.filter((home) => home.location?.coordinates).map((home) => (
          <Marker key={home._id ?? home.title} position={[home.location.coordinates!.lat, home.location.coordinates!.lng]} icon={pinIcon('primary')}>
            <Popup>
              <strong className="font-serif">{home.title}</strong><br />
              <span>{home.location.area ?? home.location.city ?? OLIV_MARKET.city}</span><br />
              <span className="font-semibold">{formatNaira(home.price)} / year</span><br />
              <a href={`/listing/${home._id}`} className="underline">View listing</a>
            </Popup>
          </Marker>
        ))}
      </MapShell>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium backdrop-blur">{homes.length} mapped listing{homes.length === 1 ? '' : 's'} · {OLIV_MARKET.city}</div>
    </div>
  )
}

export function PropertyLocationMap({ home, areas }: { home: MapHome; areas?: AmassomaZone[] }) {
  if (!home.location?.coordinates) return <div className="grid min-h-64 place-items-center rounded-2xl border border-border bg-muted text-sm text-muted-foreground">Precise map location coming soon for this listing.</div>
  const point = formatPoint(home.location.coordinates)
  return (
    <div className="relative h-64 overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapShell center={point} zoom={15}>
        <FitPoints points={[point]} />
        {home.location.area && (areas ?? []).find((item) => item.name === home.location.area) && <Circle center={(areas ?? []).find((item) => item.name === home.location.area)!.center} radius={(areas ?? []).find((item) => item.name === home.location.area)!.radius} pathOptions={{ color: '#d8ab52', fillColor: '#d8ab52', fillOpacity: 0.16, weight: 2 }} />}
        <Marker position={[point.lat, point.lng]} icon={pinIcon('accent')}>
          <Popup><strong className="font-serif">{home.title}</strong><br />{home.location.address ?? ''} {home.location.city ?? ''}</Popup>
        </Marker>
      </MapShell>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium backdrop-blur">{home.location.city ?? OLIV_MARKET.city}</div>
    </div>
  )
}
export function MapPicker({ value, onChange, area, areas }: { value: PickedLocation | null; onChange: (location: PickedLocation | null) => void; area?: string; areas?: AmassomaZone[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PickedLocation[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!boxRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = async () => {
    if (query.trim().length < 3) { setError('Type at least 3 characters to search.'); return }
    setBusy(true); setError(''); setOpen(true)
    try { setResults(await geocodeQuery(query)) } catch (issue) { setError(issue instanceof Error ? issue.message : 'Location search failed.') } finally { setBusy(false) }
  }

  const pick = async (point: MapPoint) => { setBusy(true); setError(''); onChange(await reverseGeocode(point)); setBusy(false) }

  return (
    <div className='flex flex-col gap-3' ref={boxRef}>
      <div className='flex gap-2'>
        <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void search() } }} placeholder={`Search an address or landmark in ${OLIV_MARKET.city}…`} className='min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring' aria-label='Search location' />
        <button type='button' onClick={() => void search()} disabled={busy} className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60'>{busy ? '…' : 'Search'}</button>
      </div>
      {error && <p className='text-xs text-red-600'>{error}</p>}
      {open && results.length > 0 && (
        <ul className='z-[600] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg'>
          {results.map((result) => (
            <li key={`${result.lat}-${result.lng}`}>
              <button type='button' onClick={() => { onChange(result); setOpen(false); setQuery(result.address ?? '') }} className='w-full px-4 py-2.5 text-left text-sm hover:bg-muted'>{result.address}<small className='block text-xs text-muted-foreground'>{[result.city, result.state].filter(Boolean).join(', ')}</small></button>
            </li>
          ))}
        </ul>
      )}
      <div className='relative h-64 overflow-hidden rounded-2xl border border-border shadow-sm'>
        <MapShell center={value ? formatPoint(value) : undefined} zoom={value ? 15 : 14}>
          <ClickPicker onPick={(point) => void pick(point)} />
          {area && (areas ?? []).find((item) => item.name === area) && <Circle center={(areas ?? []).find((item) => item.name === area)!.center} radius={(areas ?? []).find((item) => item.name === area)!.radius} pathOptions={{ color: '#d8ab52', fillColor: '#d8ab52', fillOpacity: 0.16, weight: 2 }} />}
          {value && <FitPoints points={[formatPoint(value)]} />}
          {value && <Marker position={[value.lat, value.lng]} icon={pinIcon('accent')} />}
        </MapShell>
        <div className='pointer-events-none absolute bottom-3 left-3 z-[500] rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium backdrop-blur'>Click the map to drop your pin</div>
      </div>
      {value ? (
        <p className='text-xs text-muted-foreground'>Selected: {value.address ?? 'Custom pin'}{value.city ? `, ${value.city}` : ''}{value.state ? `, ${value.state}` : ''} · {value.lat}, {value.lng} <button type='button' onClick={() => onChange(null)} className='ml-2 underline'>Clear</button></p>
      ) : <p className='text-xs text-muted-foreground'>Optional — pin your office or a landmark renters would know.</p>}
    </div>
  )
}

export function AreaRadiusEditor({ center, radius, onChange }: { center: MapPoint; radius: number; onChange: (value: { center: MapPoint; radius: number }) => void }) {
  return (
    <div className="relative h-80 overflow-hidden rounded-2xl border border-border">
      <MapShell center={center} zoom={15}>
        <Recenter point={center} />
        <ClickPicker onPick={(point) => onChange({ center: point, radius })} />
        <Circle center={center} radius={radius} pathOptions={{ color: '#d8ab52', fillColor: '#d8ab52', fillOpacity: 0.24, weight: 3 }} />
        <Marker position={[center.lat, center.lng]} icon={pinIcon('accent')} />
      </MapShell>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium backdrop-blur">Click the map to move the area center</div>
    </div>
  )
}
