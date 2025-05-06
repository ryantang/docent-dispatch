import { users, User, InsertUser, UpdateUser, tagRequests, TagRequest, InsertTagRequest, UpdateTagRequest } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  incrementFailedLoginAttempts(id: number): Promise<number>;
  resetFailedLoginAttempts(id: number): Promise<void>;
  lockAccount(id: number, minutes: number): Promise<void>;
  
  // Tag request operations
  getTagRequest(id: number): Promise<TagRequest | undefined>;
  createTagRequest(request: InsertTagRequest): Promise<TagRequest>;
  updateTagRequest(id: number, request: UpdateTagRequest): Promise<TagRequest | undefined>;
  deleteTagRequest(id: number): Promise<boolean>;
  getTagRequestsByDate(startDate: Date, endDate: Date): Promise<TagRequest[]>;
  getTagRequestsByNewDocent(newDocentId: number): Promise<TagRequest[]>;
  getTagRequestsBySeasonedDocent(seasonedDocentId: number): Promise<TagRequest[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tagRequests: Map<number, TagRequest>;
  private userCurrentId: number;
  private tagRequestCurrentId: number;
  sessionStore: session.SessionStore;
  
  constructor() {
    this.users = new Map();
    this.tagRequests = new Map();
    this.userCurrentId = 1;
    this.tagRequestCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id, failedLoginAttempts: 0 };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updateData: UpdateUser): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async incrementFailedLoginAttempts(id: number): Promise<number> {
    const user = await this.getUser(id);
    if (!user) return 0;
    
    const attempts = (user.failedLoginAttempts || 0) + 1;
    this.users.set(id, { ...user, failedLoginAttempts: attempts });
    return attempts;
  }
  
  async resetFailedLoginAttempts(id: number): Promise<void> {
    const user = await this.getUser(id);
    if (!user) return;
    
    this.users.set(id, { ...user, failedLoginAttempts: 0, lockedUntil: null });
  }
  
  async lockAccount(id: number, minutes: number): Promise<void> {
    const user = await this.getUser(id);
    if (!user) return;
    
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + minutes);
    
    this.users.set(id, { ...user, lockedUntil });
  }
  
  // Tag request operations
  async getTagRequest(id: number): Promise<TagRequest | undefined> {
    return this.tagRequests.get(id);
  }
  
  async createTagRequest(request: InsertTagRequest): Promise<TagRequest> {
    const id = this.tagRequestCurrentId++;
    const now = new Date();
    const tagRequest: TagRequest = {
      ...request,
      id,
      status: "requested",
      seasonedDocentId: null,
      createdAt: now,
      updatedAt: now
    };
    this.tagRequests.set(id, tagRequest);
    return tagRequest;
  }
  
  async updateTagRequest(id: number, updateData: UpdateTagRequest): Promise<TagRequest | undefined> {
    const tagRequest = await this.getTagRequest(id);
    if (!tagRequest) return undefined;
    
    const updatedRequest = {
      ...tagRequest,
      ...updateData,
      updatedAt: new Date()
    };
    this.tagRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  async deleteTagRequest(id: number): Promise<boolean> {
    return this.tagRequests.delete(id);
  }
  
  async getTagRequestsByDate(startDate: Date, endDate: Date): Promise<TagRequest[]> {
    return Array.from(this.tagRequests.values()).filter(
      request => request.date >= startDate && request.date <= endDate
    );
  }
  
  async getTagRequestsByNewDocent(newDocentId: number): Promise<TagRequest[]> {
    return Array.from(this.tagRequests.values()).filter(
      request => request.newDocentId === newDocentId
    );
  }
  
  async getTagRequestsBySeasonedDocent(seasonedDocentId: number): Promise<TagRequest[]> {
    return Array.from(this.tagRequests.values()).filter(
      request => request.seasonedDocentId === seasonedDocentId
    );
  }
}

export const storage = new MemStorage();
