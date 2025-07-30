import { http, HttpResponse } from 'msw'
import { parseISO, isSameDay, isAfter, isBefore, addDays } from 'date-fns'
import type { TagRequest, InsertTagRequest, UpdateTagRequest } from '@shared/types'
import { mockUsers, mockSessions } from './auth'

// Mock tag requests database
export let mockTagRequests: (TagRequest & { 
  newDocent?: typeof mockUsers[0]; 
  seasonedDocent?: typeof mockUsers[0] 
})[] = []

// Helper to get session from request
function getSessionFromRequest(request: Request) {
  const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1]
  return sessionId ? mockSessions.get(sessionId) || null : null
}

// Helper to populate user relationships
function populateTagRequestRelations(tagRequest: TagRequest) {
  return {
    ...tagRequest,
    newDocent: mockUsers.find(u => u.id === tagRequest.newDocentId),
    seasonedDocent: tagRequest.seasonedDocentId 
      ? mockUsers.find(u => u.id === tagRequest.seasonedDocentId)
      : undefined
  }
}

// Helper to filter tag requests based on user role
function filterTagRequestsByRole(user: typeof mockUsers[0], tagRequests: typeof mockTagRequests) {
  switch (user.role) {
    case 'new_docent':
      // New docents see available requests + their own requests
      return tagRequests.filter(tr => 
        tr.status === 'requested' || tr.newDocentId === user.id
      )
    case 'seasoned_docent':
      // Seasoned docents see all available requests + requests they've accepted
      return tagRequests.filter(tr => 
        tr.status === 'requested' || tr.seasonedDocentId === user.id
      )
    case 'coordinator':
      // Coordinators see all requests
      return tagRequests
    default:
      return []
  }
}

export const tagRequestHandlers = [
  // GET /api/tag-requests
  http.get('/api/tag-requests', ({ request }) => {
    const user = getSessionFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    let filteredRequests = filterTagRequestsByRole(user, mockTagRequests)

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = parseISO(startDate)
      const end = parseISO(endDate)
      
      filteredRequests = filteredRequests.filter(tr => {
        const requestDate = parseISO(tr.date)
        return !isBefore(requestDate, start) && !isAfter(requestDate, end)
      })
    }

    // Populate user relationships
    const populatedRequests = filteredRequests.map(populateTagRequestRelations)

    return HttpResponse.json(populatedRequests)
  }),

  // GET /api/my-tag-requests
  http.get('/api/my-tag-requests', ({ request }) => {
    const user = getSessionFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let myRequests: typeof mockTagRequests = []

    if (user.role === 'new_docent') {
      myRequests = mockTagRequests.filter(tr => tr.newDocentId === user.id)
    } else if (user.role === 'seasoned_docent') {
      myRequests = mockTagRequests.filter(tr => tr.seasonedDocentId === user.id)
    }

    const populatedRequests = myRequests.map(populateTagRequestRelations)
    return HttpResponse.json(populatedRequests)
  }),

  // POST /api/tag-requests
  http.post('/api/tag-requests', async ({ request }) => {
    const user = getSessionFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'new_docent') {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as InsertTagRequest

    // Validate date is not in the past
    const requestDate = parseISO(body.date)
    const today = new Date()
    if (isBefore(requestDate, today) || isSameDay(requestDate, today)) {
      return HttpResponse.json(
        { error: 'Cannot request tags for past dates or today' },
        { status: 400 }
      )
    }

    // Check for duplicate request
    const existingRequest = mockTagRequests.find(tr => 
      tr.newDocentId === user.id && 
      isSameDay(parseISO(tr.date), requestDate) && 
      tr.timeSlot === body.timeSlot
    )

    if (existingRequest) {
      return HttpResponse.json(
        { error: 'A request already exists for this date and time slot' },
        { status: 400 }
      )
    }

    // Create new tag request
    const newTagRequest: TagRequest = {
      id: mockTagRequests.length + 1,
      date: body.date,
      timeSlot: body.timeSlot,
      status: 'requested',
      newDocentId: user.id,
      seasonedDocentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockTagRequests.push(newTagRequest)

    return HttpResponse.json(populateTagRequestRelations(newTagRequest), { status: 201 })
  }),

  // PATCH /api/tag-requests/:id
  http.patch('/api/tag-requests/:id', async ({ request, params }) => {
    const user = getSessionFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = parseInt(params.id as string)
    const body = await request.json() as UpdateTagRequest

    const tagRequestIndex = mockTagRequests.findIndex(tr => tr.id === requestId)
    
    if (tagRequestIndex === -1) {
      return HttpResponse.json({ error: 'Tag request not found' }, { status: 404 })
    }

    const tagRequest = mockTagRequests[tagRequestIndex]

    // Role-based authorization
    if (user.role === 'seasoned_docent') {
      // Seasoned docents can only accept available requests
      if (body.status === 'filled') {
        if (tagRequest.status !== 'requested') {
          return HttpResponse.json(
            { error: 'Request is no longer available' },
            { status: 400 }
          )
        }

        // Check if date is in the past
        const requestDate = parseISO(tagRequest.date)
        if (isBefore(requestDate, addDays(new Date(), 1))) {
          return HttpResponse.json(
            { error: 'Cannot accept requests for past dates' },
            { status: 400 }
          )
        }

        // Accept the request
        mockTagRequests[tagRequestIndex] = {
          ...tagRequest,
          status: 'filled',
          seasonedDocentId: user.id,
          updatedAt: new Date().toISOString(),
        }
      } else {
        return HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (user.role === 'coordinator') {
      // Coordinators have full update permissions
      mockTagRequests[tagRequestIndex] = {
        ...tagRequest,
        ...body,
        updatedAt: new Date().toISOString(),
      }
    } else {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return HttpResponse.json(populateTagRequestRelations(mockTagRequests[tagRequestIndex]))
  }),

  // DELETE /api/tag-requests/:id
  http.delete('/api/tag-requests/:id', ({ request, params }) => {
    const user = getSessionFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = parseInt(params.id as string)
    const tagRequestIndex = mockTagRequests.findIndex(tr => tr.id === requestId)
    
    if (tagRequestIndex === -1) {
      return HttpResponse.json({ error: 'Tag request not found' }, { status: 404 })
    }

    const tagRequest = mockTagRequests[tagRequestIndex]

    // Role-based authorization
    if (user.role === 'new_docent') {
      // New docents can only delete their own unfilled requests
      if (tagRequest.newDocentId !== user.id) {
        return HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (tagRequest.status !== 'requested') {
        return HttpResponse.json(
          { error: 'Cannot delete filled requests' },
          { status: 409 }
        )
      }

      // Check if date is in the past
      const requestDate = parseISO(tagRequest.date)
      if (isBefore(requestDate, addDays(new Date(), 1))) {
        return HttpResponse.json(
          { error: 'Cannot delete requests for past dates' },
          { status: 400 }
        )
      }
    } else if (user.role !== 'coordinator') {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove the request
    mockTagRequests.splice(tagRequestIndex, 1)

    return HttpResponse.json({ success: true })
  }),
]

// Helper functions for tests
export function resetMockTagRequests() {
  mockTagRequests = []
}

export function addMockTagRequest(tagRequest: Partial<TagRequest> & { 
  date: string; 
  timeSlot: string; 
  newDocentId: number 
}) {
  const newRequest: TagRequest = {
    id: mockTagRequests.length + 1,
    status: 'requested',
    seasonedDocentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...tagRequest,
  }
  
  mockTagRequests.push(newRequest)
  return newRequest
}

export function getMockTagRequests() {
  return mockTagRequests.map(populateTagRequestRelations)
}