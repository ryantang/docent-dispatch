#!/bin/bash

# Kill any existing Python processes using port 5002
echo "Checking for existing Python processes..."
pkill -f "python run_python_server.py" || true

# Start the Python server in the background
echo "Starting Python Flask server..."
python run_python_server.py &
PYTHON_PID=$!

# Give the Python server a moment to start
sleep 2

# Export an environment variable to disable the automatic Python server start in server/index.ts
export SKIP_PYTHON_SERVER=true

# Start the Node.js server with localhost instead of 0.0.0.0
echo "Starting Node.js server..."
PORT=3000 HOST=127.0.0.1 npm run dev

# When the Node.js server is stopped, also stop the Python server
echo "Stopping Python Flask server..."
kill $PYTHON_PID || true