import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CalendarView } from "@/components/ui/calendar-view";
import { TagRequestDialog } from "@/components/dialogs/tag-request-dialog";
import { TagAcceptDialog } from "@/components/dialogs/tag-accept-dialog";
import { TagDeleteDialog } from "@/components/dialogs/tag-delete-dialog";
import { TagRequest } from "@shared/types";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedTagRequest, setSelectedTagRequest] = useState<TagRequest | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleDaySelect = (date: Date) => {
    // For a new date click, determine the time slot based on the hour
    const hour = date.getHours();
    const timeSlot = hour < 12 ? "AM" : "PM";
    
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
    setShowRequestDialog(true);
  };
  
  const handleTagSelect = (tagRequest: TagRequest) => {
    setSelectedTagRequest(tagRequest);
    
    if (user?.role === "seasoned_docent" && tagRequest.status === "requested") {
      // Seasoned docents can accept open requests
      setShowAcceptDialog(true);
    } else if (user?.role === "new_docent" && tagRequest.newDocentId === user.id && tagRequest.status === "requested") {
      // New docents can cancel their own open requests
      setShowDeleteDialog(true);
    }
    // If it's a filled request, no action available
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs defaultValue="calendar" className="mb-6">
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="my-tags">My Tags</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="mt-6">
            <CalendarView 
              onDaySelect={handleDaySelect}
              onTagSelect={handleTagSelect}
            />
          </TabsContent>
          
          <TabsContent value="my-tags" className="mt-6">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">My Tag-Alongs</h2>
              <p className="text-gray-600">
                This section will show a list of your scheduled tag-alongs.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
      
      {/* Dialogs */}
      <TagRequestDialog 
        isOpen={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        date={selectedDate}
        timeSlot={selectedTimeSlot}
      />
      
      <TagAcceptDialog 
        isOpen={showAcceptDialog}
        onClose={() => setShowAcceptDialog(false)}
        tagRequest={selectedTagRequest}
      />
      
      <TagDeleteDialog 
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        tagRequest={selectedTagRequest}
      />
    </div>
  );
}
