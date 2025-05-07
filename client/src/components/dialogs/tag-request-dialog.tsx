import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  timeSlot: string | null;
};

export function TagRequestDialog({ isOpen, onClose, date, timeSlot }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createTagMutation = useMutation({
    mutationFn: async () => {
      if (!date || !timeSlot || !user) return;
      
      // Format the date as YYYY-MM-DD without time component
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const response = await apiRequest("POST", "/api/tag-requests", {
        date: dateStr,
        timeSlot,
        newDocentId: user.id,
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag-along request created",
        description: "Your tag-along request has been successfully submitted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tag-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tag-requests"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tag-along request",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleRequestTag = () => {
    createTagMutation.mutate();
  };
  
  if (!date || !timeSlot) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">Request Tag-Along</DialogTitle>
          <DialogDescription className="text-gray-600">
            Would you like to request an <span className="font-medium">{timeSlot}</span> docent 
            tag-along on <span className="font-medium">{format(date, 'MMMM dd, yyyy')}</span>?
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="mt-3 sm:mt-0"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRequestTag}
            className="bg-primary hover:bg-primary/90"
            disabled={createTagMutation.isPending}
          >
            {createTagMutation.isPending ? "Submitting..." : "Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
