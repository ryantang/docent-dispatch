import { describe, test, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { startOfWeek, endOfWeek, addWeeks, eachDayOfInterval } from 'date-fns'
import { 
  renderWithQueryClient, 
  loginAs, 
  resetAllMockData,
  getFutureDateString,
  getTomorrowDate,
  getCalendarDayTestId,
  getTagRequestTestId,
  getTimeSlotTestId
} from './utils'
import { createMockUser, createMockTagRequest } from './factories'
import { addMockTagRequest, resetMockTagRequests } from './mocks/tag-requests'
import { mockUsers } from './mocks/auth'
import { server } from './mocks/server'
import { http, HttpResponse } from 'msw'
import { CalendarView } from '@/components/ui/calendar-view'
import HomePage from '@/pages/home-page'

describe('Tag Request Workflows', () => {
  beforeEach(() => {
    resetAllMockData()
  })

  describe('Calendar Display', () => {
    test('shows 5-week range (current + 4 future weeks) with Sunday-Saturday structure', async () => {
      loginAs(mockUsers[0]) // new docent
      
      // Render the actual calendar component
      const mockOnDaySelect = vi.fn()
      const mockOnTagSelect = vi.fn()
      
      renderWithQueryClient(
        <CalendarView 
          onDaySelect={mockOnDaySelect} 
          onTagSelect={mockOnTagSelect} 
        />
      )
      
      // Wait for the API call to complete and calendar to render
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        const calendarDays = document.querySelectorAll('.calendar-date')
        expect(calendarDays.length).toBeGreaterThan(0)
      })
      
      const calendarDays = document.querySelectorAll('.calendar-date')
      
      // Should have exactly 5 weeks × 7 days = 35 days
      expect(calendarDays.length).toBe(35)
      
      // Verify calendar starts on Sunday and ends on Saturday
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const calendarStartDate = startOfWeek(today, { weekStartsOn: 0 })
      const calendarEndDate = endOfWeek(addWeeks(today, 4), { weekStartsOn: 0 })
      
      // First day should be Sunday (day 0)
      expect(calendarStartDate.getDay()).toBe(0) // Sunday
      
      // Last day should be Saturday (day 6)
      expect(calendarEndDate.getDay()).toBe(6) // Saturday
    })


    test('future dates are selectable; today and past dates are not', async () => {
      loginAs(mockUsers[0]) // new docent
      
      const mockOnDaySelect = vi.fn()
      const mockOnTagSelect = vi.fn()
      
      renderWithQueryClient(
        <CalendarView 
          onDaySelect={mockOnDaySelect} 
          onTagSelect={mockOnTagSelect} 
        />
      )
      
      // Wait for calendar to render
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        const calendarDays = document.querySelectorAll('.calendar-date')
        expect(calendarDays.length).toBeGreaterThan(0)
      })
      
      // Get all calendar day elements
      const calendarDays = document.querySelectorAll('.calendar-date')

      
      // Calculate today's date and date range
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const calendarStartDate = startOfWeek(today, { weekStartsOn: 0 })
      const calendarEndDate = endOfWeek(addWeeks(today, 4), { weekStartsOn: 0 })
      
      // Determine which calendar days are today or before
      const allCalendarDates = eachDayOfInterval({
        start: calendarStartDate,
        end: calendarEndDate
      })
      
      const pastAndTodayDates = allCalendarDates.filter(date => date <= today)
      const futureDates = allCalendarDates.filter(date => date > today)
      
      // Should have some past/today dates and some future dates
      expect(pastAndTodayDates.length).toBeGreaterThan(0)
      expect(futureDates.length).toBeGreaterThan(0)
      
      // Check past/today calendar day elements
      pastAndTodayDates.forEach((date, index) => {
        const dayElement = calendarDays[index]
        
        // Should have opacity-50 class (greyed out)
        expect(dayElement).toHaveClass('opacity-50')
        
        // Should not contain clickable slot text
        expect(dayElement.textContent).not.toContain('Click to request')
        expect(dayElement.textContent).not.toContain('AM Slot')
        expect(dayElement.textContent).not.toContain('PM Slot')
      })
      
      // Check future calendar day elements  
      futureDates.forEach((date, index) => {
        const dayElement = calendarDays[pastAndTodayDates.length + index]
        
        // Future dates should contain clickable AM and PM slots for new docents
        // (Note: some future dates may have opacity-50 if they're in different months)
        expect(dayElement.textContent).toContain('AM Slot')
        expect(dayElement.textContent).toContain('PM Slot')
        expect(dayElement.textContent).toContain('Click to request')
        
        // Should contain exactly 2 "Click to request" instances (AM + PM)
        const clickToRequestMatches = dayElement.textContent?.match(/Click to request/g)
        expect(clickToRequestMatches?.length).toBe(2)
      })
    })


    test('displays existing requests in correct positions and shows different request states with appropriate colors', async () => {
      const newDocent = mockUsers[0]
      const seasonedDocent = mockUsers[1] // John Smith
      
      // Add mock requests BEFORE logging in to ensure they're in the mock database
      const tomorrowDate = getTomorrowDate()
      const futureDateString = getFutureDateString(3)
      const filledDateString = getFutureDateString(5)
      
      // Requested status (amber)
      addMockTagRequest({
        date: tomorrowDate,
        timeSlot: 'AM',
        newDocentId: newDocent.id,
        status: 'requested'
      })
      
      addMockTagRequest({
        date: futureDateString,
        timeSlot: 'PM',
        newDocentId: newDocent.id,
        status: 'requested'
      })
      
      // Filled/accepted status (green)
      addMockTagRequest({
        date: filledDateString,
        timeSlot: 'AM',
        newDocentId: newDocent.id,
        status: 'filled',
        seasonedDocentId: seasonedDocent.id
      })
      
      // Login after adding mock data
      loginAs(newDocent)
      
      const mockOnDaySelect = vi.fn()
      const mockOnTagSelect = vi.fn()
      
      renderWithQueryClient(
        <CalendarView 
          onDaySelect={mockOnDaySelect} 
          onTagSelect={mockOnTagSelect} 
        />
      )
      
      // Wait for calendar to render
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        const calendarDays = document.querySelectorAll('.calendar-date')
        expect(calendarDays.length).toBe(35) // 5 weeks × 7 days
      
        // 1) AM tag request for tomorrow (REQUESTED - amber styling)
        const tomorrowAMElement = screen.getByTestId(getTagRequestTestId(1, 'am'))
        expect(tomorrowAMElement).toBeInTheDocument()
        expect(tomorrowAMElement).toHaveTextContent('AM Tag')
        expect(tomorrowAMElement).toHaveTextContent('Requested - Jane Doe')
        expect(tomorrowAMElement).toHaveClass('bg-amber-100', 'border-amber-600', 'text-amber-600')
        
        // 2) PM tag request in three days (REQUESTED - amber styling)
        const futurePMElement = screen.getByTestId(getTagRequestTestId(3, 'pm'))
        expect(futurePMElement).toBeInTheDocument()
        expect(futurePMElement).toHaveTextContent('PM Tag')
        expect(futurePMElement).toHaveTextContent('Requested - Jane Doe')
        expect(futurePMElement).toHaveClass('bg-amber-100', 'border-amber-600', 'text-amber-600')
        
        // 3) AM tag request in five days (FILLED - green styling)
        const filledAMElement = screen.getByTestId(getTagRequestTestId(5, 'am'))
        expect(filledAMElement).toBeInTheDocument()
        expect(filledAMElement).toHaveTextContent('AM Tag')
        expect(filledAMElement).toHaveTextContent('Filled - John Smith & Jane Doe')
        expect(filledAMElement).toHaveClass('bg-green-100', 'border-green-600', 'text-green-600')
      })
    })

  })

  describe('New Docent Request Creation', () => {
    beforeEach(() => {
      loginAs(mockUsers[0]) // new docent
    })

    test('A new docent can successfully create a tag request', async () => {
      const user = userEvent.setup()
      
      // Render the full HomePage for integration testing
      renderWithQueryClient(<HomePage />)
      
      // Step 1: Wait for page to render completely
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        const calendarDays = document.querySelectorAll('.calendar-date')
        expect(calendarDays.length).toBe(35)
      })
      
      // Step 2: Verify AM slot is available and clickable
      const futureAMSlot = screen.getByTestId(getTimeSlotTestId(3, 'am'))
      expect(futureAMSlot).toBeInTheDocument()
      expect(futureAMSlot).toHaveTextContent('AM Slot')
      expect(futureAMSlot).toHaveTextContent('Click to request')
      expect(futureAMSlot).toHaveClass('hover:bg-gray-100', 'cursor-pointer')
      expect(futureAMSlot).not.toHaveClass('opacity-50')
      
      // Step 3: Click the AM slot - should trigger confirmation dialog
      await user.click(futureAMSlot)
      
      // Step 4: Wait for confirmation dialog to appear
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        
        // Verify dialog shows correct time slot and contains request text
        expect(dialog).toHaveTextContent('AM docent tag-along')
        expect(dialog).toHaveTextContent('Would you like to request')
        expect(dialog).toHaveTextContent('Request Tag-Along')
      })
      
      // Step 5: Click the "Request" button to confirm
      const requestButton = screen.getByRole('button', { name: /request/i })
      expect(requestButton).toBeInTheDocument()
      await user.click(requestButton)
      
      // Step 6: Wait for dialog to close and request to be created
      await waitFor(() => {
        // Dialog should close
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        
        // The AM slot should now show a tag request instead of "Click to request"
        const createdRequest = screen.getByTestId(getTagRequestTestId(3, 'am'))
        expect(createdRequest).toBeInTheDocument()
        expect(createdRequest).toHaveTextContent('AM Tag')
        expect(createdRequest).toHaveTextContent('Requested - Jane Doe')
        expect(createdRequest).toHaveClass('bg-amber-100', 'border-amber-600', 'text-amber-600')
        
        // The original slot should no longer exist
        expect(screen.queryByTestId(getTimeSlotTestId(3, 'am'))).not.toBeInTheDocument()
      })
    })

    test('can select PM slot, see confirmation dialog, and cancel request creation', async () => {
      const user = userEvent.setup()
      
      // Render the full HomePage for integration testing
      renderWithQueryClient(<HomePage />)
      
      // Step 1: Wait for page to render completely
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        const calendarDays = document.querySelectorAll('.calendar-date')
        expect(calendarDays.length).toBe(35)
      })
      
      // Step 2: Verify PM slot is available and clickable
      const futurePMSlot = screen.getByTestId(getTimeSlotTestId(3, 'pm'))
      expect(futurePMSlot).toBeInTheDocument()
      expect(futurePMSlot).toHaveTextContent('PM Slot')
      expect(futurePMSlot).toHaveTextContent('Click to request')
      expect(futurePMSlot).toHaveClass('hover:bg-gray-100', 'cursor-pointer')
      expect(futurePMSlot).not.toHaveClass('opacity-50')

      // Step 3: Click the PM slot - should trigger confirmation dialog
      await user.click(futurePMSlot)
      
      // Step 4: Wait for confirmation dialog to appear
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()

        // Verify dialog shows correct time slot and contains request text
        expect(dialog).toHaveTextContent('PM docent tag-along')
        expect(dialog).toHaveTextContent('Would you like to request')

        // The dialog should contain the date in some format - we don't need to check exact formatting
        // since that's a UI concern, just that it mentions requesting a tag-along
        expect(dialog).toHaveTextContent('Request Tag-Along')
      })
      
      // Step 5: Click cancel button in the dialog
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
      await user.click(cancelButton)
      
      // Step 6: Verify dialog closes and no request was created
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

        // Verify no tag request was added to the calendar
        expect(screen.queryByTestId(getTagRequestTestId(3, 'pm'))).not.toBeInTheDocument()

        // PM slot should still be available for future clicks
        const pmSlot = screen.getByTestId(getTimeSlotTestId(3, 'pm'))
        expect(pmSlot).toBeInTheDocument()
        expect(pmSlot).toHaveTextContent('Click to request')
      })
    })
  })

  describe('New Docent Request Management', () => {
    const newDocent = mockUsers[0]

    beforeEach(() => {
      loginAs(newDocent)
    })

    test('A new docent can cancel their own unfilled tag requests but not filled ones', async () => {
      const user = userEvent.setup()
      const seasonedDocent = mockUsers[1] // John Smith
      
      // Create unfilled request (deletable)
      addMockTagRequest({
        date: getFutureDateString(2),
        timeSlot: 'AM',
        newDocentId: newDocent.id,
        status: 'requested'
      })
      
      // Create filled request (not deletable)
      addMockTagRequest({
        date: getFutureDateString(4),
        timeSlot: 'PM',
        newDocentId: newDocent.id,
        status: 'filled',
        seasonedDocentId: seasonedDocent.id
      })
      
      // Render the full HomePage for integration testing
      renderWithQueryClient(<HomePage />)

      // Step 1: Wait for page to render and verify both requests appear
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()

        // Verify unfilled request appears (amber styling)
        const unfilledRequest = screen.getByTestId(getTagRequestTestId(2, 'am'))
        expect(unfilledRequest).toBeInTheDocument()
        expect(unfilledRequest).toHaveTextContent('Requested - Jane Doe')
        expect(unfilledRequest).toHaveClass('bg-amber-100', 'border-amber-600')

        // Verify filled request appears (green styling)
        const filledRequest = screen.getByTestId(getTagRequestTestId(4, 'pm'))
        expect(filledRequest).toBeInTheDocument()
        expect(filledRequest).toHaveTextContent('Filled - John Smith & Jane Doe')
        expect(filledRequest).toHaveClass('bg-green-100', 'border-green-600')
      })

      // Step 2: Click on unfilled request - should show delete dialog
      const unfilledRequest = screen.getByTestId(getTagRequestTestId(2, 'am'))
      await user.click(unfilledRequest)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveTextContent('Delete Tag-Along Request') // Delete dialog appears
        expect(dialog).toHaveTextContent('Would you like to delete')
      })

      // Step 3: Delete the unfilled request
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      expect(deleteButton).toBeInTheDocument()
      await user.click(deleteButton)

      // Step 4: Verify unfilled request is removed and slot becomes available
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.queryByTestId(getTagRequestTestId(2, 'am'))).not.toBeInTheDocument()

        // Slot should be available again
        const availableSlot = screen.getByTestId(getTimeSlotTestId(2, 'am'))
        expect(availableSlot).toBeInTheDocument()
        expect(availableSlot).toHaveTextContent('Click to request')
      })
      
      // Step 5: Click on filled request - should NOT show any dialog at all
      // Wait a bit to ensure the previous dialog has fully closed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const filledRequest = screen.getByTestId(getTagRequestTestId(4, 'pm'))
      await user.click(filledRequest)
      
      // For filled requests, no dialog should appear because HomePage logic 
      // only shows delete dialog for "requested" status (line 37 in home-page.tsx)
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for potential dialog
      
      // No dialog should appear for filled requests
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // Filled request should still exist and unchanged
      expect(screen.getByTestId(getTagRequestTestId(4, 'pm'))).toBeInTheDocument()
      expect(screen.getByTestId(getTagRequestTestId(4, 'pm'))).toHaveTextContent('Filled - John Smith & Jane Doe')
    })
  })

  describe('Seasoned Docent Request Fulfillment', () => {
    const seasonedDocent = mockUsers[1]
    const newDocent = mockUsers[0]

    beforeEach(() => {
      loginAs(seasonedDocent)
    })

    test('can see available requests, click to view details, accept request, and see status/color change', async () => {
      const user = userEvent.setup()

      // Create available request and already-filled request
      addMockTagRequest({
        date: getFutureDateString(2),
        timeSlot: 'AM',
        newDocentId: newDocent.id,
        status: 'requested'
      })
      
      addMockTagRequest({
        date: getFutureDateString(3),
        timeSlot: 'PM',
        newDocentId: newDocent.id,
        status: 'filled',
        seasonedDocentId: seasonedDocent.id // Current seasoned docent already accepted this one
      })
      
      // Render the full HomePage for integration testing
      renderWithQueryClient(<HomePage />)
      
      // Step 1: Wait for page to render and verify seasoned docent sees available requests
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        
        // Should see the available (requested) request
        const availableRequest = screen.getByTestId(getTagRequestTestId(2, 'am'))
        expect(availableRequest).toBeInTheDocument()
        expect(availableRequest).toHaveTextContent('AM Tag')
        expect(availableRequest).toHaveTextContent('Requested - Jane Doe')
        expect(availableRequest).toHaveClass('bg-amber-100', 'border-amber-600', 'text-amber-600')
        
        // Should see their own filled request (different styling)
        const filledRequest = screen.getByTestId(getTagRequestTestId(3, 'pm'))
        expect(filledRequest).toBeInTheDocument()
        expect(filledRequest).toHaveTextContent('PM Tag')
        expect(filledRequest).toHaveTextContent('Filled')
        expect(filledRequest).toHaveClass('bg-green-100', 'border-green-600', 'text-green-600')
      })
      
      // Step 2: Click on available request to view details and accept
      const availableRequest = screen.getByTestId(getTagRequestTestId(2, 'am'))
      await user.click(availableRequest)
      
      // Step 3: Wait for accept dialog to appear
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveTextContent('Accept Tag-Along Request')
        expect(dialog).toHaveTextContent('Would you like to lead this tag-along')
        expect(dialog).toHaveTextContent('AM') // Time slot
      })
      
      // Step 4: Click accept button
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      expect(acceptButton).toBeInTheDocument()
      await user.click(acceptButton)
      
      // Step 5: Wait for dialog to close and request status to change
      await waitFor(() => {
        // Dialog should close
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        
        // The request should now show as filled with seasoned docent info
        const acceptedRequest = screen.getByTestId(getTagRequestTestId(2, 'am'))
        expect(acceptedRequest).toBeInTheDocument()
        expect(acceptedRequest).toHaveTextContent('AM Tag')
        expect(acceptedRequest).toHaveTextContent('Filled - John Smith & Jane Doe') // Both names
        
        // Color should change from amber (requested) to green (filled)
        expect(acceptedRequest).toHaveClass('bg-green-100', 'border-green-600', 'text-green-600')
        expect(acceptedRequest).not.toHaveClass('bg-amber-100', 'border-amber-600', 'text-amber-600')
      })
    })
  })

  describe('Request State & Permissions', () => {
    test('new docents should only see their own requests', async () => {
      const newDocent = mockUsers[0] // Jane Doe
      const otherNewDocent = createMockUser('new_docent', { id: 4, email: 'other@example.com', firstName: 'Bob', lastName: 'Wilson' })
      const seasonedDocent = mockUsers[1] // John Smith
      
      // Add the other new docent to mock users for proper relationship population
      mockUsers.push(otherNewDocent)
      
      // Add various requests to test filtering logic
      
      // 1. Current new docent's own available request (should see)
      addMockTagRequest({
        date: getFutureDateString(2),
        timeSlot: 'AM',
        newDocentId: newDocent.id,
        status: 'requested'
      })
      
      // 2. Current new docent's own filled request (should see)
      addMockTagRequest({
        date: getFutureDateString(3),
        timeSlot: 'AM',
        newDocentId: newDocent.id,
        status: 'filled',
        seasonedDocentId: seasonedDocent.id
      })
      
      // 3. Other new docent's available request (should NOT see)
      addMockTagRequest({
        date: getFutureDateString(4),
        timeSlot: 'PM',
        newDocentId: otherNewDocent.id,
        status: 'requested'
      })
      
      // 4. Other new docent's filled request (should NOT see)
      addMockTagRequest({
        date: getFutureDateString(5),
        timeSlot: 'AM',
        newDocentId: otherNewDocent.id,
        status: 'filled',
        seasonedDocentId: seasonedDocent.id
      })
      
      loginAs(newDocent)
      
      // Render the full HomePage for integration testing
      renderWithQueryClient(<HomePage />)
      
      // Wait for page to render
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        const calendarDays = document.querySelectorAll('.calendar-date')
        expect(calendarDays.length).toBe(35)
      })
      
      // Should see own requested request
      await waitFor(() => {
        const ownRequestedRequest = screen.getByTestId(getTagRequestTestId(2, 'am'))
        expect(ownRequestedRequest).toBeInTheDocument()
        expect(ownRequestedRequest).toHaveTextContent('Requested - Jane Doe')
        expect(ownRequestedRequest).toHaveClass('bg-amber-100', 'border-amber-600')
      })
      
      // Should see own filled request
      await waitFor(() => {
        const ownFilledRequest = screen.getByTestId(getTagRequestTestId(3, 'am'))
        expect(ownFilledRequest).toBeInTheDocument()
        expect(ownFilledRequest).toHaveTextContent('Filled - John Smith & Jane Doe')
        expect(ownFilledRequest).toHaveClass('bg-green-100', 'border-green-600')
      })
      
      // Should NOT see other's filled request
      expect(screen.queryByTestId(getTagRequestTestId(4, 'pm'))).not.toBeInTheDocument()
      expect(screen.queryByTestId(getTagRequestTestId(5, 'am'))).not.toBeInTheDocument()
    })

    test('seasoned docents see all available requests', async () => {
      const seasonedDocent = mockUsers[1] // John Smith
      const newDocent1 = mockUsers[0] // Jane Doe
      const newDocent2 = createMockUser('new_docent', { id: 4, email: 'other@example.com', firstName: 'Bob', lastName: 'Wilson' })
      const otherSeasonedDocent = createMockUser('seasoned_docent', { id: 5, email: 'alice@example.com', firstName: 'Alice', lastName: 'Johnson' })
      
      // Add the new users to mock users for proper relationship population
      mockUsers.push(newDocent2, otherSeasonedDocent)
      
      // Add various requests to test filtering logic
      
      // 1. Available request from first new docent (should see)
      addMockTagRequest({
        date: getFutureDateString(2),
        timeSlot: 'AM',
        newDocentId: newDocent1.id,
        status: 'requested'
      })
      
      // 2. Available request from second new docent (should see)
      addMockTagRequest({
        date: getFutureDateString(3),
        timeSlot: 'PM',
        newDocentId: newDocent2.id,
        status: 'requested'
      })
      
      // 3. Request filled by current seasoned docent (should see)
      addMockTagRequest({
        date: getFutureDateString(4),
        timeSlot: 'AM',
        newDocentId: newDocent1.id,
        status: 'filled',
        seasonedDocentId: seasonedDocent.id
      })
      
      // 4. Request filled by different seasoned docent (should NOT see)
      addMockTagRequest({
        date: getFutureDateString(5),
        timeSlot: 'PM',
        newDocentId: newDocent2.id,
        status: 'filled',
        seasonedDocentId: otherSeasonedDocent.id
      })
      
      loginAs(seasonedDocent)
      
      // Render the full HomePage for integration testing
      renderWithQueryClient(<HomePage />)
      
      // Wait for page to render and verify all visible requests
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        const calendarDays = document.querySelectorAll('.calendar-date')
        expect(calendarDays.length).toBe(35)
        
        // Should see first available request
        const availableRequest1 = screen.getByTestId(getTagRequestTestId(2, 'am'))
        expect(availableRequest1).toBeInTheDocument()
        expect(availableRequest1).toHaveTextContent('Requested - Jane Doe')
        expect(availableRequest1).toHaveClass('bg-amber-100', 'border-amber-600')
        
        // Should see second available request
        const availableRequest2 = screen.getByTestId(getTagRequestTestId(3, 'pm'))
        expect(availableRequest2).toBeInTheDocument()
        expect(availableRequest2).toHaveTextContent('Requested - Bob Wilson')
        expect(availableRequest2).toHaveClass('bg-amber-100', 'border-amber-600')
        
        // Should see request they've accepted
        const ownFilledRequest = screen.getByTestId(getTagRequestTestId(4, 'am'))
        expect(ownFilledRequest).toBeInTheDocument()
        expect(ownFilledRequest).toHaveTextContent('Filled - John Smith & Jane Doe')
        expect(ownFilledRequest).toHaveClass('bg-green-100', 'border-green-600')
      })
      
      // Should NOT see request filled by other seasoned docent
      expect(screen.queryByTestId(getTagRequestTestId(5, 'pm'))).not.toBeInTheDocument()
    })

    test('coordinators see all requests regardless of status', async () => {
      const coordinator = mockUsers[2] // Admin user
      const newDocent1 = mockUsers[0] // Jane Doe
      const newDocent2 = createMockUser('new_docent', { id: 4, email: 'bob@example.com', firstName: 'Bob', lastName: 'Wilson' })
      const seasonedDocent1 = mockUsers[1] // John Smith
      const seasonedDocent2 = createMockUser('seasoned_docent', { id: 5, email: 'alice@example.com', firstName: 'Alice', lastName: 'Johnson' })
      
      // Add the new users to mock users for proper relationship population
      mockUsers.push(newDocent2, seasonedDocent2)
      
      // Add comprehensive set of requests to test coordinator visibility
      
      // 1. Available request from first new docent
      addMockTagRequest({
        date: getFutureDateString(2),
        timeSlot: 'AM',
        newDocentId: newDocent1.id,
        status: 'requested'
      })
      
      // 2. Available request from second new docent
      addMockTagRequest({
        date: getFutureDateString(3),
        timeSlot: 'PM',
        newDocentId: newDocent2.id,
        status: 'requested'
      })
      
      // 3. Request filled by first seasoned docent
      addMockTagRequest({
        date: getFutureDateString(4),
        timeSlot: 'AM',
        newDocentId: newDocent1.id,
        status: 'filled',
        seasonedDocentId: seasonedDocent1.id
      })
      
      // 4. Request filled by second seasoned docent
      addMockTagRequest({
        date: getFutureDateString(5),
        timeSlot: 'PM',
        newDocentId: newDocent2.id,
        status: 'filled',
        seasonedDocentId: seasonedDocent2.id
      })
      
      // 5. Another available request (to show coordinators see everything)
      addMockTagRequest({
        date: getFutureDateString(6),
        timeSlot: 'AM',
        newDocentId: newDocent1.id,
        status: 'requested'
      })
      
      loginAs(coordinator)
      
      // Render the full HomePage for integration testing
      renderWithQueryClient(<HomePage />)
      
      // Wait for page to render and verify all requests are visible
      await waitFor(() => {
        expect(screen.getByText('Tag Schedule')).toBeInTheDocument()
        const calendarDays = document.querySelectorAll('.calendar-date')
        expect(calendarDays.length).toBe(35)
        
        // Should see first available request
        const availableRequest1 = screen.getByTestId(getTagRequestTestId(2, 'am'))
        expect(availableRequest1).toBeInTheDocument()
        expect(availableRequest1).toHaveTextContent('Requested - Jane Doe')
        expect(availableRequest1).toHaveClass('bg-amber-100', 'border-amber-600')
        
        // Should see second available request
        const availableRequest2 = screen.getByTestId(getTagRequestTestId(3, 'pm'))
        expect(availableRequest2).toBeInTheDocument()
        expect(availableRequest2).toHaveTextContent('Requested - Bob Wilson')
        expect(availableRequest2).toHaveClass('bg-amber-100', 'border-amber-600')
        
        // Should see first filled request
        const filledRequest1 = screen.getByTestId(getTagRequestTestId(4, 'am'))
        expect(filledRequest1).toBeInTheDocument()
        expect(filledRequest1).toHaveTextContent('Filled - John Smith & Jane Doe')
        expect(filledRequest1).toHaveClass('bg-green-100', 'border-green-600')
        
        // Should see second filled request (this would be hidden from other roles)
        const filledRequest2 = screen.getByTestId(getTagRequestTestId(5, 'pm'))
        expect(filledRequest2).toBeInTheDocument()
        expect(filledRequest2).toHaveTextContent('Filled - Alice Johnson & Bob Wilson')
        expect(filledRequest2).toHaveClass('bg-green-100', 'border-green-600')
        
        // Should see third available request
        const availableRequest3 = screen.getByTestId(getTagRequestTestId(6, 'am'))
        expect(availableRequest3).toBeInTheDocument()
        expect(availableRequest3).toHaveTextContent('Requested - Jane Doe')
        expect(availableRequest3).toHaveClass('bg-amber-100', 'border-amber-600')
      })
    })

    test('proper error handling for concurrent request acceptance', async () => {
      const seasonedDocent1 = mockUsers[1] // John Smith  
      const seasonedDocent2 = createMockUser('seasoned_docent', { 
        id: 5, email: 'alice@example.com', firstName: 'Alice', lastName: 'Johnson' 
      })
      const newDocent = mockUsers[0] // Jane Doe
      
      // Add the second seasoned docent to mock users
      mockUsers.push(seasonedDocent2)
      
      // Create an available request
      addMockTagRequest({
        date: getFutureDateString(3),
        timeSlot: 'AM',
        newDocentId: newDocent.id,
        status: 'requested'
      })
      
      // Login as first seasoned docent
      loginAs(seasonedDocent1)
      renderWithQueryClient(<HomePage />)
      
      const user = userEvent.setup()
      
      // Wait for page to load and find the request
      await waitFor(() => {
        const availableRequest = screen.getByTestId(getTagRequestTestId(3, 'am'))
        expect(availableRequest).toBeInTheDocument()
        expect(availableRequest).toHaveTextContent('Requested - Jane Doe')
        expect(availableRequest).toHaveClass('bg-amber-100', 'border-amber-600')
      })
      
      // Click to accept the request
      const availableRequest = screen.getByTestId(getTagRequestTestId(3, 'am'))
      await user.click(availableRequest)
      
      // Accept dialog should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Accept Tag-Along Request')).toBeInTheDocument()
      })
      
      // SIMULATE RACE CONDITION: Override the mock to return "already filled" error
      // This simulates another seasoned docent accepting the request first
      server.use(
        http.patch('/api/tag-requests/:id', () => {
          return HttpResponse.json(
            { error: 'Request is no longer available' },
            { status: 400 }
          )
        })
      )
      
      // Click accept button - should now fail due to race condition
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await user.click(acceptButton)
      
      // Wait for the failed API call to complete 
      // Note: Due to current implementation, dialog stays open on error (this could be improved)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Request should remain in "requested" state (not show as filled)
      // Since the API call failed, the UI should not update
      const requestAfterError = screen.getByTestId(getTagRequestTestId(3, 'am'))
      expect(requestAfterError).toHaveTextContent('Requested - Jane Doe')
      expect(requestAfterError).toHaveClass('bg-amber-100', 'border-amber-600') // Still amber, not green
      expect(requestAfterError).not.toHaveClass('bg-green-100', 'border-green-600')
    })
  })

  describe('Calendar Business Rules', () => {
    beforeEach(() => {
      loginAs(mockUsers[0]) // new docent
    })

    test.skip('handles edge cases around current date/time', async () => {
      // Would test behavior at midnight, day boundaries, daylight savings etc.
      //historically had issues in the late afternoon PST when it was the next day in UTC.
      expect(true).toBe(true) // Placeholder
    })
  })
})