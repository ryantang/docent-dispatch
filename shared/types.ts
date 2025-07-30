// Clean TypeScript types for frontend/backend sharing
// Generated from Python SQLAlchemy models (manual sync)

// === User Types ===
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;    // Optional for frontend use, required in auth mocks
  phone?: string | null;
  role: 'new_docent' | 'seasoned_docent' | 'coordinator';
  failedLoginAttempts: number;
  accountLockedUntil?: string | null; // ISO timestamp (matches Python account_locked_until)
  createdAt: string;   // ISO timestamp (matches Python created_at)
}

export interface InsertUser {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  role?: 'new_docent' | 'seasoned_docent' | 'coordinator';
}

export interface UpdateUser {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'new_docent' | 'seasoned_docent' | 'coordinator';
}

// === Authentication Types ===
export interface LoginData {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
}

// === Tag Request Types ===
export interface TagRequest {
  id: number;
  date: string;        // YYYY-MM-DD format
  timeSlot: 'AM' | 'PM';
  status: 'requested' | 'filled';  // Matches Python model (removed 'cancelled')
  newDocentId: number;
  seasonedDocentId?: number | null;
  notes?: string | null;  // Matches Python model notes field
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
  // Populated relationships (when included)
  newDocent?: User;
  seasonedDocent?: User;
}

export interface InsertTagRequest {
  date: string;
  timeSlot: 'AM' | 'PM';
  newDocentId: number;
}

export interface UpdateTagRequest {
  date?: string;
  timeSlot?: 'AM' | 'PM';
  status?: 'requested' | 'filled';  // Removed 'cancelled' to match Python
  newDocentId?: number;
  seasonedDocentId?: number;
  notes?: string;
  updatedAt?: string;
}

// === CSV Upload Types ===
export interface CSVUser {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'new_docent' | 'seasoned_docent' | 'coordinator';
}