#!/bin/bash

# Kill any existing Python processes using port 5001
echo "Checking for existing Python processes..."
pkill -f "python run_python_server.py" || true

# Build the frontend
echo "Building frontend..."
npm run build

# Start the Python server
echo "Starting Python Flask server..."
cd python_server
python run_python_server.py 