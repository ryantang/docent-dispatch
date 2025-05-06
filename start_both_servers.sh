#!/bin/bash

# Start the Python server in the background
echo "Starting Python Flask server..."
python run_python_server.py &
PYTHON_PID=$!

# Give the Python server a moment to start
sleep 2

# Start the Node.js server
echo "Starting Node.js server..."
npm run dev

# When the Node.js server is stopped, also stop the Python server
echo "Stopping Python Flask server..."
kill $PYTHON_PID