import { 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  isBefore, 
  format, 
  addDays,
  isSameDay,
  parseISO
} from "date-fns";
import { TagRequest } from "@shared/schema";

export type CalendarDateRange = {
  startDate: Date;
  endDate: Date;
};

/**
 * Get the date range for the calendar view (previous week, current week, and 4 future weeks)
 */
export function getCalendarDateRange(currentDate: Date = new Date()): CalendarDateRange {
  const calendarStartDate = startOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 0 });
  const calendarEndDate = endOfWeek(addWeeks(currentDate, 4), { weekStartsOn: 0 });
  
  return { startDate: calendarStartDate, endDate: calendarEndDate };
}

/**
 * Get all days for calendar display based on the start and end dates
 */
export function getCalendarDays(startDate: Date, endDate: Date): Date[] {
  return eachDayOfInterval({ start: startDate, end: endDate });
}

/**
 * Group days into weeks for the calendar view
 */
export function getCalendarWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  return weeks;
}

/**
 * Check if a day should be treated as "past" (not selectable)
 */
export function isDayInPast(day: Date): boolean {
  // Current day is not in the past, but previous days are
  return isBefore(day, addDays(new Date(), 1)) && !isToday(day);
}

/**
 * Check if a time slot is available based on existing tag requests
 */
export function isTimeSlotAvailable(
  date: Date, 
  timeSlot: string, 
  tagRequests: TagRequest[]
): boolean {
  return !tagRequests.some(tag => 
    isSameDay(parseISO(tag.date), date) && 
    tag.timeSlot === timeSlot
  );
}

/**
 * Find a tag request for a specific date and time slot
 */
export function findTagRequest(
  date: Date, 
  timeSlot: string, 
  tagRequests: TagRequest[]
): TagRequest | undefined {
  return tagRequests.find(tag => 
    isSameDay(parseISO(tag.date), date) && 
    tag.timeSlot === timeSlot
  );
}

/**
 * Format the date for display in the UI
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, "MMMM dd, yyyy");
}
