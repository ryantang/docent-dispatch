import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { TagRequest } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tagRequest: TagRequest | null;
};

export function TagAcceptDialog({ isOpen, onClose, tagRequest }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const acceptTagMutation = useMutation({
    mutationFn: async () => {
      if (!tagRequest) return;
      
      const response = await apiRequest("PATCH", `/api/tag-requests/${tagRequest.id}`, {
        status: "filled",
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag-along accepted",
        description: "You have successfully accepted this tag-along request.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tag-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tag-requests"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept tag-along",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleAcceptTag = () => {
    acceptTagMutation.mutate();
  };
  
  if (!tagRequest) return null;
  
  const tagDate = new Date(tagRequest.date);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">Accept Tag-Along Request</DialogTitle>
          <DialogDescription className="text-gray-600">
            Would you like to lead this tag-along on <span className="font-medium">{format(tagDate, 'MMMM dd, yyyy')}</span> at <span className="font-medium">{tagRequest.timeSlot}</span>?
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
            onClick={handleAcceptTag}
            className="bg-primary hover:bg-primary/90"
            disabled={acceptTagMutation.isPending}
          >
            {acceptTagMutation.isPending ? "Accepting..." : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
