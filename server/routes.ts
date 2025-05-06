import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { createProxyMiddleware } from "http-proxy-middleware";
import { 
  insertUserSchema, 
  updateUserSchema, 
  loginSchema, 
  passwordResetRequestSchema,
  passwordResetSchema, 
  insertTagRequestSchema,
  updateTagRequestSchema,
  csvUserSchema,
  User,
  TagRequest
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { randomBytes } from "crypto";

// Password reset tokens (in a real app, these would be stored in the database)
const passwordResetTokens = new Map<string, { email: string, expiresAt: Date }>();

// Helper for checking authentication
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Role-based authorization
function checkRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user!.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
}

// Helper for validating request body against a Zod schema
function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Auth routes
  app.post(
    "/api/register", 
    validateBody(insertUserSchema),
    async (req, res, next) => {
      try {
        const { email, password, ...rest } = req.body;
        
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already registered" });
        }
        
        // Create user with hashed password
        const user = await storage.createUser({
          ...rest,
          email,
          password: await hashPassword(password),
        });
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        
        res.status(201).json(userWithoutPassword);
      } catch (error) {
        next(error);
      }
    }
  );
  
  app.post(
    "/api/login",
    validateBody(loginSchema),
    (req, res, next) => {
      passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          
          // Remove password from response
          const { password, ...userWithoutPassword } = user;
          return res.status(200).json(userWithoutPassword);
        });
      })(req, res, next);
    }
  );
  
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
  
  // Password reset
  app.post(
    "/api/request-password-reset",
    validateBody(passwordResetRequestSchema),
    async (req, res) => {
      const { email } = req.body;
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal that the user doesn't exist for security reasons
        return res.status(200).json({ message: "If your email is registered, you will receive a password reset link" });
      }
      
      // Generate token
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour
      
      // Store token (in a real app, this would go to a database)
      passwordResetTokens.set(token, { email, expiresAt });
      
      // In a real app, we would send an email with the reset link
      // For this implementation, we'll just return the token in the response
      // In production, this should send an email instead
      
      res.status(200).json({ 
        message: "If your email is registered, you will receive a password reset link",
        // ONLY FOR DEVELOPMENT - remove in production
        token
      });
    }
  );
  
  app.post(
    "/api/reset-password",
    validateBody(passwordResetSchema),
    async (req, res) => {
      const { token, password } = req.body;
      
      // Verify token
      const tokenData = passwordResetTokens.get(token);
      if (!tokenData) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      if (tokenData.expiresAt < new Date()) {
        passwordResetTokens.delete(token);
        return res.status(400).json({ message: "Token has expired" });
      }
      
      // Get user by email
      const user = await storage.getUserByEmail(tokenData.email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // Update password
      await storage.updateUser(user.id, {
        password: await hashPassword(password),
        failedLoginAttempts: 0,
        lockedUntil: null
      });
      
      // Remove used token
      passwordResetTokens.delete(token);
      
      res.status(200).json({ message: "Password reset successful" });
    }
  );
  
  // Tag request routes
  // Get all tag requests for a given date range
  app.get("/api/tag-requests", isAuthenticated, async (req, res) => {
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;
    
    if (!startDateParam || !endDateParam) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }
    
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    
    const tagRequests = await storage.getTagRequestsByDate(startDate, endDate);
    
    // Enrich with user data
    const enrichedRequests = await Promise.all(
      tagRequests.map(async (request) => {
        const newDocent = await storage.getUser(request.newDocentId);
        const seasonedDocent = request.seasonedDocentId 
          ? await storage.getUser(request.seasonedDocentId) 
          : null;
        
        return {
          ...request,
          newDocent: newDocent ? {
            id: newDocent.id,
            firstName: newDocent.firstName,
            lastName: newDocent.lastName,
            email: newDocent.email,
            phone: newDocent.phone
          } : null,
          seasonedDocent: seasonedDocent ? {
            id: seasonedDocent.id,
            firstName: seasonedDocent.firstName,
            lastName: seasonedDocent.lastName,
            email: seasonedDocent.email,
            phone: seasonedDocent.phone
          } : null
        };
      })
    );
    
    res.json(enrichedRequests);
  });
  
  // Get tag requests for the current user
  app.get("/api/my-tag-requests", isAuthenticated, async (req, res) => {
    const user = req.user!;
    let tagRequests: TagRequest[] = [];
    
    if (user.role === "new_docent") {
      tagRequests = await storage.getTagRequestsByNewDocent(user.id);
    } else if (user.role === "seasoned_docent") {
      tagRequests = await storage.getTagRequestsBySeasonedDocent(user.id);
    } else if (user.role === "coordinator") {
      // Coordinators can see all
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Last month
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2); // Next 2 months
      tagRequests = await storage.getTagRequestsByDate(startDate, endDate);
    }
    
    res.json(tagRequests);
  });
  
  // Create a new tag request
  app.post(
    "/api/tag-requests",
    isAuthenticated,
    checkRole(["new_docent", "coordinator"]),
    validateBody(insertTagRequestSchema),
    async (req, res) => {
      const user = req.user!;
      
      // If coordinator is creating on behalf of a new docent, use the provided ID
      // Otherwise, use the current user's ID
      const newDocentId = user.role === "coordinator" && req.body.newDocentId
        ? req.body.newDocentId
        : user.id;
      
      const tagRequest = await storage.createTagRequest({
        ...req.body,
        newDocentId
      });
      
      res.status(201).json(tagRequest);
    }
  );
  
  // Update a tag request (fulfill or cancel)
  app.patch(
    "/api/tag-requests/:id",
    isAuthenticated,
    validateBody(updateTagRequestSchema),
    async (req, res) => {
      const id = parseInt(req.params.id);
      const user = req.user!;
      
      // Get the existing tag request
      const tagRequest = await storage.getTagRequest(id);
      if (!tagRequest) {
        return res.status(404).json({ message: "Tag request not found" });
      }
      
      // Check permissions based on role and action
      if (user.role === "new_docent") {
        // New docents can only cancel their own requested tags
        if (tagRequest.newDocentId !== user.id) {
          return res.status(403).json({ message: "Not authorized to modify this tag request" });
        }
        
        if (req.body.status && req.body.status !== "cancelled") {
          return res.status(403).json({ message: "New docents can only cancel requests" });
        }
        
        // Cannot cancel if already filled
        if (tagRequest.status === "filled") {
          return res.status(400).json({ message: "Cannot cancel a filled tag request" });
        }
      } else if (user.role === "seasoned_docent") {
        // Seasoned docents can only fulfill open requests
        if (req.body.status && req.body.status !== "filled") {
          return res.status(403).json({ message: "Seasoned docents can only fulfill requests" });
        }
        
        if (tagRequest.status !== "requested") {
          return res.status(400).json({ message: "This tag request is not available for fulfillment" });
        }
        
        // Add the seasoned docent's ID if fulfilling
        if (req.body.status === "filled") {
          req.body.seasonedDocentId = user.id;
        }
      }
      
      // Coordinators can do anything
      
      // Update the tag request
      const updatedRequest = await storage.updateTagRequest(id, req.body);
      
      // If a tag was filled, send an email (this would be implemented in a real app)
      if (updatedRequest && updatedRequest.status === "filled" && tagRequest.status !== "filled") {
        // In a real app, we would send emails to both docents
        console.log(`Tag request ${id} was fulfilled. Emails would be sent.`);
      }
      
      res.json(updatedRequest);
    }
  );
  
  // Delete a tag request
  app.delete(
    "/api/tag-requests/:id",
    isAuthenticated,
    async (req, res) => {
      const id = parseInt(req.params.id);
      const user = req.user!;
      
      // Get the existing tag request
      const tagRequest = await storage.getTagRequest(id);
      if (!tagRequest) {
        return res.status(404).json({ message: "Tag request not found" });
      }
      
      // Check permissions
      if (user.role === "new_docent" && tagRequest.newDocentId !== user.id) {
        return res.status(403).json({ message: "Not authorized to delete this tag request" });
      }
      
      // Cannot delete if already filled, unless coordinator
      if (tagRequest.status === "filled" && user.role !== "coordinator") {
        return res.status(400).json({ message: "Cannot delete a filled tag request" });
      }
      
      // Delete the tag request
      await storage.deleteTagRequest(id);
      
      res.status(204).send();
    }
  );
  
  // User management routes (coordinator only)
  // Get all users
  app.get(
    "/api/users",
    isAuthenticated,
    checkRole(["coordinator"]),
    async (req, res) => {
      const users = await storage.getAllUsers();
      
      // Remove sensitive information
      const sanitizedUsers = users.map(user => {
        const { password, failedLoginAttempts, lockedUntil, ...rest } = user;
        return rest;
      });
      
      res.json(sanitizedUsers);
    }
  );
  
  // Create a user
  app.post(
    "/api/users",
    isAuthenticated,
    checkRole(["coordinator"]),
    validateBody(insertUserSchema),
    async (req, res) => {
      const { email, password, ...rest } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...rest,
        email,
        password: await hashPassword(password || "changeme"), // Default password
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    }
  );
  
  // Update a user
  app.patch(
    "/api/users/:id",
    isAuthenticated,
    checkRole(["coordinator"]),
    validateBody(updateUserSchema),
    async (req, res) => {
      const id = parseInt(req.params.id);
      
      // Get existing user
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(id, req.body);
      
      // Remove sensitive information
      if (updatedUser) {
        const { password, failedLoginAttempts, lockedUntil, ...rest } = updatedUser;
        res.json(rest);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    }
  );
  
  // Delete a user
  app.delete(
    "/api/users/:id",
    isAuthenticated,
    checkRole(["coordinator"]),
    async (req, res) => {
      const id = parseInt(req.params.id);
      
      // Prevent self-deletion
      if (id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "User not found" });
      }
    }
  );
  
  // CSV Upload for bulk user creation
  app.post(
    "/api/users/csv",
    isAuthenticated,
    checkRole(["coordinator"]),
    async (req, res) => {
      const csvData = req.body;
      
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "Invalid CSV data format. Expected an array of user objects." });
      }
      
      // Process each row
      const results = {
        success: 0,
        errors: [] as { line: number; email: string; error: string }[],
      };
      
      for (let i = 0; i < csvData.length; i++) {
        const line = i + 1; // 1-based line numbers
        const row = csvData[i];
        
        try {
          // Validate row data
          const userData = csvUserSchema.parse(row);
          
          // Check if user already exists
          const existingUser = await storage.getUserByEmail(userData.email);
          
          if (existingUser) {
            // Skip existing users
            results.errors.push({
              line,
              email: userData.email,
              error: "User already exists",
            });
            continue;
          }
          
          // Create user with a default password
          await storage.createUser({
            ...userData,
            password: await hashPassword("changeme"), // Default password that must be changed
          });
          
          results.success++;
        } catch (error) {
          let errorMessage = "Invalid data format";
          
          if (error instanceof ZodError) {
            const validationError = fromZodError(error);
            errorMessage = validationError.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          results.errors.push({
            line,
            email: row.email || "unknown",
            error: errorMessage,
          });
        }
      }
      
      res.status(200).json(results);
    }
  );
  
  // Set up proxy to Python backend for API routes
  const apiProxy = createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/api' // keep the /api prefix
    }
  });
  
  // Apply the proxy middleware
  app.use('/api', apiProxy);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
