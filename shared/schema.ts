import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  password: text("password").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("new_docent"), // new_docent, seasoned_docent, coordinator
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  lastLogin: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  password: true,
}).partial();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

// Tag requests model
export const tagRequests = pgTable("tag_requests", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  timeSlot: text("time_slot").notNull(), // AM or PM
  status: text("status").notNull().default("requested"), // requested, filled, cancelled
  newDocentId: integer("new_docent_id").notNull(),
  seasonedDocentId: integer("seasoned_docent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTagRequestSchema = createInsertSchema(tagRequests).omit({
  id: true,
  status: true,
  seasonedDocentId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTagRequestSchema = createInsertSchema(tagRequests).omit({
  id: true,
  createdAt: true,
}).partial();

// For CSV upload
export const csvUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["new_docent", "seasoned_docent", "coordinator"]),
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;

export type TagRequest = typeof tagRequests.$inferSelect;
export type InsertTagRequest = z.infer<typeof insertTagRequestSchema>;
export type UpdateTagRequest = z.infer<typeof updateTagRequestSchema>;

export type CSVUser = z.infer<typeof csvUserSchema>;
