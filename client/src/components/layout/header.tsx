import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
  };
  
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "new_docent":
        return "bg-amber-100 text-amber-600 hover:bg-amber-100";
      case "seasoned_docent":
        return "bg-green-100 text-green-600 hover:bg-green-100";
      case "coordinator":
        return "bg-primary-light text-primary hover:bg-primary-light";
      default:
        return "bg-gray-100 text-gray-600 hover:bg-gray-100";
    }
  };
  
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "new_docent":
        return "New Docent";
      case "seasoned_docent":
        return "Seasoned Docent";
      case "coordinator":
        return "Coordinator";
      default:
        return role;
    }
  };
  
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <svg 
                className="w-10 h-10 text-primary"
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"></path>
                <path d="M16 3h1a2 2 0 0 1 2 2v5c0 1.1.9 2 2 2a2 2 0 0 1-2 2v5a2 2 0 0 1-2 2h-1"></path>
                <rect x="8" y="8" width="8" height="8" rx="1"></rect>
              </svg>
              <h1 className="text-xl font-semibold text-primary hidden md:block">SF Zoo Docent Matching</h1>
            </div>
          </Link>
        </div>
        
        {user && (
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1 text-gray-700">
                  <span className="hidden sm:inline">{`${user.firstName} ${user.lastName}`}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 rounded ${getRoleBadgeStyle(user.role)}`}
                  >
                    {getRoleDisplayName(user.role)}
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                
                {user.role === "coordinator" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
