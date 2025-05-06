import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, loginSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("Warning: SESSION_SECRET environment variable not set. Using a default secret for development only.");
    // In production, this would ideally throw an error instead of using a fallback
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-session-secret-do-not-use-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          // Check if user exists
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          
          // Check if account is locked
          if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            return done(null, false, { 
              message: "Account is locked. Please try again later or reset your password." 
            });
          }
          
          // Verify password
          const isPasswordValid = await comparePasswords(password, user.password);
          
          if (!isPasswordValid) {
            // Increment failed login attempts
            const attempts = await storage.incrementFailedLoginAttempts(user.id);
            
            // Lock account after 5 failed attempts
            if (attempts >= 5) {
              await storage.lockAccount(user.id, 10); // Lock for 10 minutes
              return done(null, false, { 
                message: "Too many failed login attempts. Account is locked for 10 minutes." 
              });
            }
            
            return done(null, false, { message: "Invalid email or password" });
          }
          
          // Reset failed login attempts on successful login
          await storage.resetFailedLoginAttempts(user.id);
          
          // Update last login time
          await storage.updateUser(user.id, { lastLogin: new Date() });
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}
