'use client'

import { useState } from 'react'
import { ArrowRight, Check, Search, Sparkles } from 'lucide-react'
import { Header } from '@/components/oliv-pages'
import { homeImage, OLIV_MARKET } from '@/lib/oliv-data'
import { useOlivState } from '@/lib/oliv-client-state'

export function OlivHome() {
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { homes, areas } = useOlivState()
  const results = homes.filter((home) => {
    const haystack = `${home.title} ${home.location.city} ${home.location.area ?? ''} ${home.location.address}`.toLowerCase()
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return (!terms.length || terms.every((term) => haystack.includes(term))) && (!areaFilter || home.location.area === areaFilter) && (!typeFilter || home.type === typeFilter)
  })
  const discoverUrl = `/discover?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(areaFilter ? { area: areaFilter } : {}), ...(typeFilter ? { type: typeFilter } : {}) }).toString()}`

  return <div className="min-h-screen bg-background">
    <Header />
    <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><Sparkles className="size-3.5 text-accent-foreground" /> {OLIV_MARKET.city} · {OLIV_MARKET.state}</div>
          <h1 className="max-w-xl font-serif text-5xl leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">A home that feels <em className="text-accent-foreground">like you.</em></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">Discover trusted homes in and around {OLIV_MARKET.city}, Bayelsa.</p>
          <div className="mt-9 max-w-2xl rounded-2xl border border-border bg-card p-2 shadow-lg"><div className="flex flex-col gap-2 sm:flex-row"><div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3"><Search className="size-5 shrink-0 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${OLIV_MARKET.city} homes...`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label={`Search ${OLIV_MARKET.city} homes`} /></div><select aria-label="Filter by Amassoma area" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"><option value="">All areas</option>{areas.map((area) => <option key={area.name} value={area.name}>{area.name}</option>)}</select><select aria-label="Filter by property type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"><option value="">All types</option>{['apartment', 'house', 'studio', 'townhouse', 'shared'].map((type) => <option key={type} value={type} className="capitalize">{type}</option>)}</select><a href={discoverUrl} className="rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-foreground">Search</a></div></div>
          <div className="mt-4 text-xs text-muted-foreground">{results.length} {results.length === 1 ? 'home' : 'homes'} match your filters in {OLIV_MARKET.city}.</div>
        </div>
        <div className="relative"><div className="overflow-hidden rounded-[2rem] bg-muted"><img src={homeImage(homes[0])} alt="Bright modern home in Amassoma" className="aspect-[4/5] w-full object-cover lg:aspect-[4/4.5]" /></div><div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl"><div className="grid size-10 place-items-center rounded-xl bg-accent"><Check className="size-5 text-accent-foreground" /></div><div><p className="text-sm font-semibold">Homes you can trust</p><p className="text-xs text-muted-foreground">Verified listings, real people</p></div></div></div>
      </section>
      <section className="border-y border-border bg-muted/40"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-10"><div className="flex items-end justify-between gap-6"><div><p className="text-sm font-semibold uppercase tracking-widest text-accent-foreground">Made for {OLIV_MARKET.city}</p><h2 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">Places worth coming home to</h2></div><a href={discoverUrl} className="hidden items-center gap-2 text-sm font-semibold sm:flex">View matching homes <ArrowRight className="size-4" /></a></div><div className="mt-10 grid gap-6 lg:grid-cols-3">{results.slice(0, 3).map((home) => <article key={home._id} className="overflow-hidden rounded-2xl border border-border bg-card"><a href={`/listing/${home._id}`}><img src={homeImage(home)} alt={home.title} className="aspect-[4/3] w-full object-cover" /></a><div className="p-5"><h3 className="font-serif text-xl">{home.title}</h3><p className="mt-1 text-sm text-muted-foreground">{home.location.area ? `${home.location.area}, ` : ''}{home.location.city}, {home.location.state}</p></div></article>)}</div></div></section>
    </main>
  </div>
}
