import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type CSVUploadResult = {
  success: number;
  errors: { line: number; email: string; error: string }[];
};

export function CSVUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [processingResult, setProcessingResult] = useState<CSVUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const processCSVMutation = useMutation({
    mutationFn: async (csvData: any[]) => {
      const response = await apiRequest("POST", "/api/users/csv", csvData);
      return response.json();
    },
    onSuccess: (result: CSVUploadResult) => {
      setProcessingResult(result);
      
      if (result.success > 0) {
        toast({
          title: "CSV processed successfully",
          description: `${result.success} users created, ${result.errors.length} errors`,
        });
        
        // Reset file input after success
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setFile(null);
        
        // Refresh user list
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      } else if (result.errors.length > 0) {
        toast({
          title: "CSV processing completed with errors",
          description: `No users created. Found ${result.errors.length} errors.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error processing CSV",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParseErrors([]);
      setProcessingResult(null);
    }
  };
  
  const parseCSV = (text: string): { data: any[]; errors: string[] } => {
    const errors: string[] = [];
    const data: any[] = [];
    
    try {
      // Split by lines and check for header
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length === 0) {
        errors.push("CSV file is empty");
        return { data, errors };
      }
      
      // Parse header
      const header = lines[0].split(",").map(h => h.trim());
      const requiredFields = ["email", "firstName", "lastName", "role"];
      
      // Check if all required fields are present
      const missingFields = requiredFields.filter(field => !header.includes(field));
      if (missingFields.length > 0) {
        errors.push(`CSV is missing required fields: ${missingFields.join(", ")}`);
        return { data, errors };
      }
      
      // Parse each row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(",").map(v => v.trim());
        
        // Check if row has correct number of columns
        if (values.length !== header.length) {
          errors.push(`Line ${i + 1}: Expected ${header.length} values, got ${values.length}`);
          continue;
        }
        
        // Create object from row
        const rowData: any = {};
        header.forEach((field, index) => {
          rowData[field] = values[index];
        });
        
        // Basic validation
        if (!rowData.email || !rowData.email.includes("@")) {
          errors.push(`Line ${i + 1}: Invalid email format`);
          continue;
        }
        
        if (!rowData.firstName || !rowData.lastName) {
          errors.push(`Line ${i + 1}: Missing name fields`);
          continue;
        }
        
        if (!["new_docent", "seasoned_docent", "coordinator"].includes(rowData.role)) {
          errors.push(`Line ${i + 1}: Invalid role. Must be 'new_docent', 'seasoned_docent', or 'coordinator'`);
          continue;
        }
        
        data.push(rowData);
      }
      
      return { data, errors };
    } catch (error) {
      errors.push(`Error parsing CSV: ${error instanceof Error ? error.message : String(error)}`);
      return { data, errors };
    }
  };
  
  const handleUpload = () => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { data, errors } = parseCSV(text);
      
      setParseErrors(errors);
      
      if (errors.length === 0 && data.length > 0) {
        processCSVMutation.mutate(data);
      }
    };
    
    reader.readAsText(file);
  };
  
  return (
    <div>
      <p className="text-gray-600 mb-4">
        Upload a CSV file with user information to create or update users. 
        The CSV must include email, firstName, lastName, and role columns.
      </p>
      
      <div className="mb-4">
        <label htmlFor="csvUpload" className="block text-sm font-medium mb-1">CSV File</label>
        <input 
          ref={fileInputRef}
          type="file" 
          id="csvUpload" 
          accept=".csv" 
          onChange={handleFileChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">
          File must contain: Email, First Name, Last Name, Role (new_docent, seasoned_docent, or coordinator), Phone (optional)
        </p>
      </div>
      
      {parseErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error parsing CSV</AlertTitle>
          <AlertDescription>
            <Accordion type="single" collapsible>
              <AccordionItem value="errors">
                <AccordionTrigger>View {parseErrors.length} errors</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 space-y-1">
                    {parseErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AlertDescription>
        </Alert>
      )}
      
      {processingResult && (
        <Alert variant={processingResult.errors.length > 0 ? "destructive" : "default"} className="mb-4">
          {processingResult.errors.length > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {processingResult.success > 0 
              ? `Successfully created ${processingResult.success} users`
              : "CSV processing completed with errors"
            }
          </AlertTitle>
          {processingResult.errors.length > 0 && (
            <AlertDescription>
              <Accordion type="single" collapsible>
                <AccordionItem value="errors">
                  <AccordionTrigger>View {processingResult.errors.length} errors</AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {processingResult.errors.map((error, index) => (
                        <li key={index} className="text-sm">
                          Line {error.line}: {error.email} - {error.error}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </AlertDescription>
          )}
        </Alert>
      )}
      
      <Button 
        onClick={handleUpload}
        disabled={!file || processCSVMutation.isPending}
        className="bg-primary hover:bg-primary/90"
      >
        {processCSVMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload and Process
          </>
        )}
      </Button>
    </div>
  );
}
