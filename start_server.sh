#!/bin/bash

# Kill any existing Python processes using port 5001
echo "Checking for existing Python processes..."
pkill -f "python run_python_server.py" || true

# Start the Python server
echo "Starting Python Flask server..."
python run_python_server.py 