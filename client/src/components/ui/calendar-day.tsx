import { format, isSameDay, parseISO } from "date-fns";
import { TagRequest } from "@shared/schema";

type Props = {
  date: Date;
  isInCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  tagRequests: TagRequest[];
  onDayClick: (date: Date) => void;
  onTagClick: (tagRequest: TagRequest) => void;
};

export function CalendarDay({
  date,
  isInCurrentMonth,
  isPast,
  isToday,
  tagRequests,
  onDayClick,
  onTagClick,
}: Props) {
  const amTag = tagRequests.find(tag => 
    tag.timeSlot === "AM" && isSameDay(parseISO(tag.date), date)
  );
  
  const pmTag = tagRequests.find(tag => 
    tag.timeSlot === "PM" && isSameDay(parseISO(tag.date), date)
  );
  
  const dayNumber = date.getDate();
  
  const handleDayClick = () => {
    if (!isPast) {
      onDayClick(date);
    }
  };
  
  return (
    <div 
      className={`
        border rounded-lg overflow-hidden calendar-date
        ${!isInCurrentMonth ? 'opacity-50' : ''}
        ${isPast ? 'date-past' : 'cursor-pointer hover:bg-gray-50'}
        ${isToday ? 'bg-gray-50' : ''}
      `}
      onClick={handleDayClick}
    >
      <div className="p-2 text-right">
        <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>
          {dayNumber}
        </span>
        {isToday && (
          <span className="text-xs bg-primary-light text-primary px-1 rounded ml-1">
            Today
          </span>
        )}
      </div>
      
      <div className="px-1 pb-1">
        {amTag ? (
          <div 
            className={`
              text-xs p-2 rounded mb-1
              ${amTag.status === "requested" 
                ? "bg-amber-100 border border-amber-600 text-amber-600" 
                : "bg-green-100 border border-green-600 text-green-600"}
            `}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick(amTag);
            }}
          >
            <div className="font-medium">AM Tag</div>
            <div className="text-gray-600">
              {amTag.status === "requested" ? "Requested" : "Filled"}
            </div>
          </div>
        ) : !isPast && (
          <div 
            className="border border-dashed border-gray-300 text-xs p-2 rounded mb-1 hover:bg-gray-100 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(new Date(date.setHours(9, 0, 0, 0))); // 9 AM
            }}
          >
            <div className="font-medium">AM Slot</div>
            <div className="text-gray-500">Click to request</div>
          </div>
        )}
        
        {pmTag ? (
          <div 
            className={`
              text-xs p-2 rounded mb-1
              ${pmTag.status === "requested" 
                ? "bg-amber-100 border border-amber-600 text-amber-600" 
                : "bg-green-100 border border-green-600 text-green-600"}
            `}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick(pmTag);
            }}
          >
            <div className="font-medium">PM Tag</div>
            <div className="text-gray-600">
              {pmTag.status === "requested" ? "Requested" : "Filled"}
            </div>
          </div>
        ) : !isPast && (
          <div 
            className="border border-dashed border-gray-300 text-xs p-2 rounded mb-1 hover:bg-gray-100 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(new Date(date.setHours(13, 0, 0, 0))); // 1 PM
            }}
          >
            <div className="font-medium">PM Slot</div>
            <div className="text-gray-500">Click to request</div>
          </div>
        )}
      </div>
    </div>
  );
}
