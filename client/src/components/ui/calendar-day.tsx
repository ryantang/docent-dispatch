import { format, isSameDay, parseISO } from "date-fns";
import { TagRequest } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
  const isNewDocent = user?.role === 'new_docent';
  
  const amTag = tagRequests.find(tag => 
    tag.timeSlot === "AM" && isSameDay(parseISO(tag.date), date)
  );
  
  const pmTag = tagRequests.find(tag => 
    tag.timeSlot === "PM" && isSameDay(parseISO(tag.date), date)
  );
  
  const dayNumber = date.getDate();

  // Create test ID for the calendar day
  const dayTestId = `calendar-day-${format(date, 'yyyy-MM-dd')}`;

  const renderTagContent = (tag: TagRequest) => {
    const newDocentName = tag.newDocent ? `${tag.newDocent.firstName} ${tag.newDocent.lastName}` : 'You';
    const seasonedDocentName = tag.seasonedDocent ? `${tag.seasonedDocent.firstName} ${tag.seasonedDocent.lastName}` : 'Seasoned Docent';

    if (tag.status === "requested") {
      if (isNewDocent) {
        return `Requested - ${newDocentName}`;
      } else {
        return `Requested - ${newDocentName}`;
      }
    } else {
      return `Filled - ${seasonedDocentName} & ${newDocentName}`;
    }
  };

  const shouldShowTag = (tag: TagRequest) => {
    if (user?.role === 'coordinator') {
      return true; // Coordinators see all requests regardless of status
    } else if (isNewDocent) {
      return tag.newDocentId === user?.id;
    } else {
      return tag.status === "requested" || tag.seasonedDocentId === user?.id;
    }
  };
  
  return (
    <div 
      data-testid={dayTestId}
      className={`
        border border-gray-300 rounded-lg overflow-hidden calendar-date
        ${!isInCurrentMonth ? 'opacity-50' : ''}
        ${isPast ? 'opacity-50' : ''}
        ${isToday ? 'bg-gray-50' : ''}
        h-48
      `}
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
        {amTag && shouldShowTag(amTag) ? (
          <div 
            data-testid={`tag-request-${format(date, 'yyyy-MM-dd')}-am`}
            className={`
              text-sm p-2 rounded mb-1
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
              {renderTagContent(amTag)}
            </div>
          </div>
        ) : !isPast && isNewDocent && (
          <div 
            data-testid={`slot-${format(date, 'yyyy-MM-dd')}-am`}
            className="border-2 border-dashed border-gray-300 text-sm p-2 rounded mb-1 hover:bg-gray-100 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(new Date(date.setHours(9, 0, 0, 0))); // 9 AM
            }}
          >
            <div className="font-medium">AM Slot</div>
            <div className="text-gray-500">Click to request</div>
          </div>
        )}
        
        {pmTag && shouldShowTag(pmTag) ? (
          <div 
            data-testid={`tag-request-${format(date, 'yyyy-MM-dd')}-pm`}
            className={`
              text-sm p-2 rounded mb-1
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
              {renderTagContent(pmTag)}
            </div>
          </div>
        ) : !isPast && isNewDocent && (
          <div 
            data-testid={`slot-${format(date, 'yyyy-MM-dd')}-pm`}
            className="border-2 border-dashed border-gray-300 text-sm p-2 rounded mb-1 hover:bg-gray-100 cursor-pointer"
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
