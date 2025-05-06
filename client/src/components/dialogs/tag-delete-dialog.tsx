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

export function TagDeleteDialog({ isOpen, onClose, tagRequest }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const deleteTagMutation = useMutation({
    mutationFn: async () => {
      if (!tagRequest) return;
      
      await apiRequest("DELETE", `/api/tag-requests/${tagRequest.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Tag-along request deleted",
        description: "Your tag-along request has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tag-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tag-requests"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete tag-along request",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleDeleteTag = () => {
    deleteTagMutation.mutate();
  };
  
  if (!tagRequest) return null;
  
  const tagDate = new Date(tagRequest.date);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">Delete Tag-Along Request</DialogTitle>
          <DialogDescription className="text-gray-600">
            Would you like to delete this tag-along request for <span className="font-medium">{format(tagDate, 'MMMM dd, yyyy')}</span> at <span className="font-medium">{tagRequest.timeSlot}</span>?
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
            onClick={handleDeleteTag}
            variant="destructive"
            disabled={deleteTagMutation.isPending}
          >
            {deleteTagMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
