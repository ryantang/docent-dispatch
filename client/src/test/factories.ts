import { format, addDays, addWeeks } from 'date-fns'
import type { User, TagRequest } from '@shared/schema'

// User factory functions - independent data for tests
export function createMockUser(
  role: 'new_docent' | 'seasoned_docent' | 'coordinator',
  overrides: Partial<User> = {}
): User {
  const baseUsers = {
    new_docent: {
      id: 1,
      email: 'newdocent@test.com',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '(415) 555-1234',
    },
    seasoned_docent: {
      id: 2,
      email: 'seasoned@test.com',
      firstName: 'John',
      lastName: 'Smith',
      phone: '(415) 555-5678',
    },
    coordinator: {
      id: 3,
      email: 'coordinator@test.com',
      firstName: 'Admin',
      lastName: 'User',
      phone: '(415) 555-9999',
    },
  }

  return {
    ...baseUsers[role],
    role,
    password: 'hashedpassword',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    ...overrides,
  }
}

// Tag request factory functions - independent data for tests
export function createMockTagRequest(
  overrides: Partial<TagRequest> & {
    date?: Date | string
    timeSlot?: 'AM' | 'PM'
    newDocentId?: number
  } = {}
): TagRequest {
  const defaultDate = addDays(new Date(), 3) // 3 days from now
  
  return {
    id: Math.floor(Math.random() * 1000) + 1,
    date: typeof overrides.date === 'string' 
      ? overrides.date 
      : format(overrides.date || defaultDate, 'yyyy-MM-dd'),
    timeSlot: overrides.timeSlot || 'AM',
    status: 'requested',
    newDocentId: overrides.newDocentId || 1,
    seasonedDocentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// Convenience functions for common test scenarios
export function createCalendarWeekData(startDate: Date = new Date()) {
  const requests: TagRequest[] = []
  
  // Create some sample requests across different days and time slots
  const dates = [
    addDays(startDate, 1), // tomorrow
    addDays(startDate, 3), // 3 days from now
    addDays(startDate, 5), // 5 days from now
    addWeeks(startDate, 1), // next week
  ]

  dates.forEach((date, index) => {
    // Mix of AM and PM slots
    const timeSlot = index % 2 === 0 ? 'AM' : 'PM'
    // Mix of different new docents
    const newDocentId = (index % 2) + 1
    
    requests.push(createMockTagRequest({
      date,
      timeSlot,
      newDocentId,
      id: index + 1,
    }))
  })

  return requests
}

export function createFilledTagRequest(
  overrides: Partial<TagRequest> = {}
): TagRequest {
  return createMockTagRequest({
    status: 'filled',
    seasonedDocentId: 2, // seasoned docent user
    ...overrides,
  })
}

export function createPastTagRequest(
  daysAgo: number = 3,
  overrides: Partial<TagRequest> = {}
): TagRequest {
  const pastDate = addDays(new Date(), -daysAgo)
  
  return createMockTagRequest({
    date: pastDate,
    ...overrides,
  })
}

// Factory for creating multiple requests for testing pagination/filtering
export function createMultipleTagRequests(
  count: number,
  baseOverrides: Partial<TagRequest> = {}
): TagRequest[] {
  return Array.from({ length: count }, (_, index) => 
    createMockTagRequest({
      id: index + 1,
      date: addDays(new Date(), index + 1), // Spread across future dates
      timeSlot: index % 2 === 0 ? 'AM' : 'PM',
      newDocentId: (index % 2) + 1, // Alternate between docent 1 and 2
      ...baseOverrides,
    })
  )
}

// Helper to create requests for specific date range (useful for calendar tests)
export function createRequestsForDateRange(
  startDate: Date,
  endDate: Date,
  options: {
    frequency?: 'daily' | 'every-other-day' | 'weekly'
    timeSlots?: ('AM' | 'PM')[]
    newDocentId?: number
  } = {}
): TagRequest[] {
  const {
    frequency = 'every-other-day',
    timeSlots = ['AM', 'PM'],
    newDocentId = 1,
  } = options

  const requests: TagRequest[] = []
  let currentDate = new Date(startDate)
  let requestId = 1

  while (currentDate <= endDate) {
    timeSlots.forEach(timeSlot => {
      requests.push(createMockTagRequest({
        id: requestId++,
        date: currentDate,
        timeSlot,
        newDocentId,
      }))
    })

    // Increment date based on frequency
    switch (frequency) {
      case 'daily':
        currentDate = addDays(currentDate, 1)
        break
      case 'every-other-day':
        currentDate = addDays(currentDate, 2)
        break
      case 'weekly':
        currentDate = addDays(currentDate, 7)
        break
    }
  }

  return requests
}