import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TagRequest } from "@shared/types";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function Reports() {
  const [dateRange, setDateRange] = useState("last-7-days");
  
  // Calculate date range based on selection
  const getDateRange = () => {
    const today = new Date();
    let startDate: Date, endDate: Date;
    
    switch (dateRange) {
      case "last-7-days":
        startDate = subDays(today, 7);
        endDate = today;
        break;
      case "last-30-days":
        startDate = subDays(today, 30);
        endDate = today;
        break;
      case "current-month":
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case "previous-month":
        startDate = startOfMonth(subMonths(today, 1));
        endDate = endOfMonth(subMonths(today, 1));
        break;
      default:
        startDate = subDays(today, 7);
        endDate = today;
    }
    
    return { startDate, endDate };
  };
  
  const { startDate, endDate } = getDateRange();
  
  // Fetch tag requests for reporting
  const { data: tagRequests, isLoading, refetch } = useQuery<TagRequest[]>({
    queryKey: [
      "/api/tag-requests", 
      startDate.toISOString(), 
      endDate.toISOString(),
      "report"
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/tag-requests?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      return res.json();
    }
  });
  
  // Calculate summary statistics
  const stats = {
    requested: 0,
    filled: 0,
    newDocents: new Set<number>(),
    seasonedDocents: new Set<number>(),
  };
  
  tagRequests?.forEach(tag => {
    if (tag.status === "requested") {
      stats.requested++;
    } else if (tag.status === "filled") {
      stats.filled++;
    }
    
    stats.newDocents.add(tag.newDocentId);
    if (tag.seasonedDocentId) {
      stats.seasonedDocents.add(tag.seasonedDocentId);
    }
  });
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Reports</h2>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Tag-Along Status Report</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold text-primary">
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.requested}
              </CardTitle>
              <CardDescription>Requested Tags</CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold text-green-600">
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.filled}
              </CardTitle>
              <CardDescription>Filled Tags</CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold text-amber-500">
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.newDocents.size}
              </CardTitle>
              <CardDescription>Active New Docents</CardDescription>
            </CardHeader>
          </Card>
        </div>
        
        <div className="flex items-end gap-4 mb-4">
          <div className="w-full max-w-xs">
            <p className="text-sm font-medium mb-1 text-gray-700">Date Range</p>
            <Select 
              value={dateRange} 
              onValueChange={setDateRange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="current-month">Current month</SelectItem>
                <SelectItem value="previous-month">Previous month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={() => refetch()}
            className="bg-primary hover:bg-primary/90"
          >
            Generate Report
          </Button>
        </div>
        
        <div className="text-sm text-gray-500 mb-2">
          Showing data from {format(startDate, 'MMM d, yyyy')} to {format(endDate, 'MMM d, yyyy')}
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Tag-Along Details</h3>
        
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>New Docent</TableHead>
                <TableHead>Seasoned Docent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : tagRequests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No tag requests found in the selected date range
                  </TableCell>
                </TableRow>
              ) : (
                // Sort by date (most recent first)
                tagRequests?.sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                ).map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      {format(new Date(tag.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{tag.timeSlot}</TableCell>
                    <TableCell>
                      {tag.newDocent?.firstName} {tag.newDocent?.lastName}
                    </TableCell>
                    <TableCell>
                      {tag.seasonedDocent 
                        ? `${tag.seasonedDocent.firstName} ${tag.seasonedDocent.lastName}`
                        : "—"
                      }
                    </TableCell>
                    <TableCell>
                      <span className={`
                        px-2 py-1 text-xs rounded
                        ${tag.status === "requested" 
                          ? "bg-amber-100 text-amber-600" 
                          : "bg-green-100 text-green-600"}
                      `}>
                        {tag.status === "requested" ? "Requested" : "Filled"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
