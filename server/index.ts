import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn } from "child_process";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Start the Python backend server only if not skipped
  if (process.env.SKIP_PYTHON_SERVER !== 'true') {
    log("Starting the Python backend server...", "python");
    const pythonServer = spawn("python", ["run_python_server.py"], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    pythonServer.stdout.on("data", (data) => {
      log(`${data}`, "python");
    });
    
    pythonServer.stderr.on("data", (data) => {
      log(`ERROR: ${data}`, "python");
    });
    
    pythonServer.on("close", (code) => {
      log(`Python server process exited with code ${code}`, "python");
      
      // Attempt to restart if it crashes
      if (code !== 0) {
        log("Attempting to restart Python server...", "python");
        setTimeout(() => {
          const restartedServer = spawn("python", ["run_python_server.py"], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
          });
          
          restartedServer.stdout.on("data", (data) => {
            log(`${data}`, "python");
          });
          
          restartedServer.stderr.on("data", (data) => {
            log(`ERROR: ${data}`, "python");
          });
        }, 1000);
      }
    });

    // Give the Python server some time to start up
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    log("Skipping Python server start (using externally started server)", "python");
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the configured port or default to 5000
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "0.0.0.0";
  
  server.listen({
    port,
    host,
    reusePort: true,
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();
