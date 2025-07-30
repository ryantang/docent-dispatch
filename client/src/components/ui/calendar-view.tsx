import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarDay } from "@/components/ui/calendar-day";
import { TagRequest } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  onDaySelect: (date: Date) => void;
  onTagSelect: (tagRequest: TagRequest) => void;
};

export function CalendarView({ onDaySelect, onTagSelect }: Props) {
  const [today] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [currentDate, setCurrentDate] = useState(today);
  const { user } = useAuth();
  
  // Get the date range for display (previous week, current week, and 4 future weeks)
  const calendarStartDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const calendarEndDate = endOfWeek(addWeeks(currentDate, 4), { weekStartsOn: 0 });
  
  // Fetch tag requests for the date range
  const { data: tagRequests, isLoading } = useQuery<TagRequest[]>({
    queryKey: [
      "/api/tag-requests", 
      calendarStartDate.toISOString(), 
      calendarEndDate.toISOString()
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/tag-requests?startDate=${calendarStartDate.toISOString()}&endDate=${calendarEndDate.toISOString()}`
      );
      return res.json();
    }
  });
  
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Get all days in the date range
  const days = eachDayOfInterval({
    start: calendarStartDate,
    end: calendarEndDate
  });
  
  // Group days into weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1); // Set to first of month
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };
  
  const goToNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1); // Set to first of month
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setCurrentDate(now);
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Tag Schedule</h2>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Calendar Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-amber-100 border border-amber-600 mr-2"></div>
          <span className="text-sm">Tag Requested</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-600 mr-2"></div>
          <span className="text-sm">Tag Filled</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-100 mr-2"></div>
          <span className="text-sm">Past Dates (Not Available)</span>
        </div>
      </div>
      
      {/* Calendar Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdays.map(day => (
          <div key={day} className="text-center py-2 text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Body */}
      {isLoading ? (
        // Loading skeleton
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weeks.map((week, weekIndex) => (
            week.map((day, dayIndex) => (
              <CalendarDay
                key={`${weekIndex}-${dayIndex}`}
                date={day}
                isInCurrentMonth={isSameMonth(day, currentDate)}
                isPast={isBefore(day, today) || isToday(day)}
                isToday={isToday(day)}
                tagRequests={tagRequests?.filter(tag => 
                  isSameDay(parseISO(tag.date), day)
                ) || []}
                onDayClick={onDaySelect}
                onTagClick={onTagSelect}
              />
            ))
          ))}
        </div>
      )}
    </div>
  );
}
