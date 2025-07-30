import { http, HttpResponse } from 'msw'
import type { User } from '@shared/types'

// Mock session storage
export const mockSessions = new Map<string, User>()

// Mock user database - simple inline data for handlers
export const mockUsers: User[] = [
  {
    id: 1,
    email: 'newdocent@test.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'new_docent',
    phone: '(415) 555-1234',
    password: 'hashedpassword',
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    email: 'seasoned@test.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'seasoned_docent',
    phone: '(415) 555-5678',
    password: 'hashedpassword',
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    email: 'coordinator@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'coordinator',
    phone: '(415) 555-9999',
    password: 'hashedpassword',
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    createdAt: new Date().toISOString(),
  },
]

// Helper to get session from request
function getSessionFromRequest(request: Request): User | null {
  const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1]
  return sessionId ? mockSessions.get(sessionId) || null : null
}

export const authHandlers = [
  // POST /api/login
  http.post('/api/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    const user = mockUsers.find(u => u.email === body.email)
    
    if (!user || body.password !== 'password') {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if account is locked
    if (user.accountLockedUntil && new Date() < new Date(user.accountLockedUntil)) {
      return HttpResponse.json(
        { error: 'Account is locked' },
        { status: 401 }
      )
    }

    // Create session
    const sessionId = `session_${user.id}_${Date.now()}`
    mockSessions.set(sessionId, user)

    // Return user without password
    const { password, ...userWithoutPassword } = user
    return HttpResponse.json(userWithoutPassword, {
      headers: {
        'Set-Cookie': `session=${sessionId}; HttpOnly; Path=/`
      }
    })
  }),

  // POST /api/logout
  http.post('/api/logout', ({ request }) => {
    const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1]
    if (sessionId) {
      mockSessions.delete(sessionId)
    }
    
    return HttpResponse.json({ success: true }, {
      headers: {
        'Set-Cookie': 'session=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    })
  }),

  // GET /api/user
  http.get('/api/user', ({ request }) => {
    const user = getSessionFromRequest(request)
    
    if (!user) {
      return HttpResponse.json(null, { status: 401 })
    }

    const { password, ...userWithoutPassword } = user
    return HttpResponse.json(userWithoutPassword)
  }),

  // POST /api/request-password-reset
  http.post('/api/request-password-reset', async ({ request }) => {
    await request.json() // Read request body but don't use it
    
    // Always return success to prevent email enumeration
    return HttpResponse.json({ success: true })
  }),

  // POST /api/reset-password
  http.post('/api/reset-password', async ({ request }) => {
    const { token } = await request.json() as { token: string; password: string }
    
    // Mock token validation (in real app, would validate JWT)
    if (token === 'valid-token') {
      return HttpResponse.json({ success: true })
    }
    
    return HttpResponse.json(
      { error: 'Invalid or expired token' },
      { status: 400 }
    )
  }),
]

// Helper functions for tests
export function clearMockSessions() {
  mockSessions.clear()
}

export function setMockUser(user: User) {
  const existingIndex = mockUsers.findIndex(u => u.id === user.id)
  if (existingIndex >= 0) {
    mockUsers[existingIndex] = user
  } else {
    mockUsers.push(user)
  }
}

export function createMockSession(user: User): string {
  const sessionId = `test_session_${user.id}_${Date.now()}`
  mockSessions.set(sessionId, user)
  return sessionId
}