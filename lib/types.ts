// User roles
export type UserRole = 'SUPER_ADMIN' | 'USER' | 'AGENT'

// Agent verification
export type VerificationStatus = 'NOT_STARTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
export type VerificationLevel = 0 | 1 | 2 | 3

// User document
export interface User {
  _id?: string
  name: string
  email: string
  phone: string
  password: string // hashed
  role: UserRole
  profileImage?: string
  createdAt?: Date
  updatedAt?: Date
  // Agent-specific fields
  agentVerificationStatus?: VerificationStatus
  agentVerificationLevel?: VerificationLevel
  agentCompanyName?: string
  agentLicenseNumber?: string
  agentBio?: string
  agentStatesServed?: string[]
  agentOfficeLocation?: {
    lat: number
    lng: number
    address?: string
    city?: string
    state?: string
  }
  agentSubmittedAt?: Date | string
  agentReviewedAt?: Date | string
}

// Property types
export type PropertyType = 'apartment' | 'house' | 'studio' | 'townhouse' | 'shared'

// Property document
export interface Property {
  _id?: string
  agentId: string
  title: string
  description: string
  type: PropertyType
  price: number
  currency: string
  location: {
    address: string
    city: string
    area?: string
    state?: string
    postalCode: string
    country: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  bedrooms: number
  bathrooms: number
  squareMeters: number
  furnished: boolean
  amenities: string[]
  images: string[]
  verificationBadge?: boolean
  published: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Favorite document
export interface Favorite {
  _id?: string
  userId: string
  propertyId: string
  createdAt?: Date
}

// Inquiry document
export interface Inquiry {
  _id?: string
  userId: string
  propertyId: string
  agentId: string
  message: string
  agentReply?: string
  status: 'PENDING' | 'REPLIED' | 'ARCHIVED'
  createdAt?: Date
  updatedAt?: Date
}

// Viewing request document (viewingRequests collection holds VIEWING + INQUIRY records)
export interface ViewingRequest {
  _id?: string
  userId: string
  propertyId: string
  agentId: string
  type?: 'VIEWING' | 'INQUIRY'
  preferredDate?: Date | string
  preferredTime?: string
  message?: string
  agentReply?: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REPLIED' | 'ARCHIVED'
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

// Review and comment document
export type ReviewStatus = 'PUBLISHED' | 'PENDING' | 'HIDDEN' | 'REPORTED'
export interface Review {
  _id?: string
  propertyId: string
  userId: string
  authorName: string
  rating: number
  text: string
  status: ReviewStatus
  createdAt?: Date
  updatedAt?: Date
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// In-app notification document (notifications collection)
export type NotificationType =
  | 'VIEWING_REQUEST'
  | 'INQUIRY'
  | 'VIEWING_CONFIRMED'
  | 'VIEWING_DECLINED'
  | 'VIEWING_COMPLETED'
  | 'INQUIRY_REPLIED'
  | 'REVIEW_RECEIVED'
  | 'AGENT_APPLICATION'
  | 'VERIFICATION_UNDER_REVIEW'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'VERIFICATION_SUSPENDED'
  | 'LISTING_PUBLISHED'
  | 'SYSTEM'

export interface Notification {
  _id?: string
  recipientId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  readAt?: Date | string | null
  createdAt?: Date | string
}

export interface AuthResponse {
  user: Omit<User, 'password'>
  token: string
}
