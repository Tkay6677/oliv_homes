import type { Property } from '@/lib/types'

export const nigerianStates = ['Bayelsa', 'Rivers', 'FCT', 'Lagos', 'Edo', 'Cross River', 'Delta', 'Oyo', 'Enugu', 'Kaduna'] as const

// Property records are loaded from MongoDB at runtime. This module only contains presentation helpers.
export const olivHomes: Property[] = []
export const formatNaira = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
export const getHome = (id: string) => olivHomes.find((home) => home._id === id)
export const homeImage = (home?: Property) => home?.images?.[0] ?? ''
