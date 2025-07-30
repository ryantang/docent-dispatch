import React from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import type { User } from '@shared/types'
import { AuthProvider } from '@/hooks/use-auth'
import { 
  clearMockSessions, 
  createMockSession, 
  setMockUser,
  mockUsers 
} from './mocks/auth'
import { resetMockTagRequests } from './mocks/tag-requests'

// Test wrapper for React Query
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Keep cache forever in tests
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Custom render function with QueryClient and AuthProvider wrapper
export function renderWithQueryClient(
  ui: ReactElement,
  options: {
    queryClient?: QueryClient
  } = {}
) {
  const queryClient = options.queryClient || createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  }
}

// Authentication helper functions
export function loginAs(user: User): string {
  // Set the user in mock database if not already there
  setMockUser(user)
  
  // Create a session for the user
  const sessionId = createMockSession(user)
  
  // Set the session cookie in document
  document.cookie = `session=${sessionId}; path=/`
  
  return sessionId
}

export function logout() {
  // Clear the session cookie
  document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

// Test data cleanup
export function resetAllMockData() {
  clearMockSessions()
  resetMockTagRequests()
  
  // Reset cookies
  document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

// Role-based login helpers
export function loginAsNewDocent() {
  const newDocent = mockUsers.find(u => u.role === 'new_docent')!
  return loginAs(newDocent)
}

export function loginAsSeasonedDocent() {
  const seasonedDocent = mockUsers.find(u => u.role === 'seasoned_docent')!
  return loginAs(seasonedDocent)
}

export function loginAsCoordinator() {
  const coordinator = mockUsers.find(u => u.role === 'coordinator')!
  return loginAs(coordinator)
}

// Common test setup patterns
export function setupAuthenticatedTest(role: 'new_docent' | 'seasoned_docent' | 'coordinator') {
  beforeEach(() => {
    resetAllMockData()
    
    switch (role) {
      case 'new_docent':
        loginAsNewDocent()
        break
      case 'seasoned_docent':
        loginAsSeasonedDocent()
        break
      case 'coordinator':
        loginAsCoordinator()
        break
    }
  })
}

// Wait for async operations (useful for testing loading states)
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper to simulate user interaction delays
export const userDelay = {
  short: 100,   // Quick interactions
  medium: 300,  // Normal user thinking time
  long: 1000,   // Slow user interactions
}

// Date helpers for consistent test dates
export function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0] // YYYY-MM-DD format
}

export function getFutureDateString(daysFromNow: number): string {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysFromNow)
  return futureDate.toISOString().split('T')[0] // YYYY-MM-DD format
}

export function getPastDateString(daysAgo: number): string {
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - daysAgo)
  return pastDate.toISOString().split('T')[0] // YYYY-MM-DD format
}

// Helper functions for test IDs (following best practices)
export function getCalendarDayTestId(daysFromNow: number): string {
  return `calendar-day-${getFutureDateString(daysFromNow)}`
}

export function getTagRequestTestId(daysFromNow: number, timeSlot: 'am' | 'pm'): string {
  return `tag-request-${getFutureDateString(daysFromNow)}-${timeSlot}`
}

export function getTimeSlotTestId(daysFromNow: number, timeSlot: 'am' | 'pm'): string {
  return `slot-${getFutureDateString(daysFromNow)}-${timeSlot}`
}