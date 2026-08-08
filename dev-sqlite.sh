#!/bin/bash

# ENVITATION - SQLite Development Server
# Runs both SQLite backend and frontend server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/src/backend-sqlite"
FRONTEND_DIR="$SCRIPT_DIR/src"
PORT=${1:-3001}
FRONTEND_PORT=${2:-8081}

echo "========================================="
echo "  ENVITATION - SQLite Mode"
echo "========================================="
echo ""

# Install backend dependencies if needed
cd "$BACKEND_DIR"
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Ensure data directory exists
mkdir -p data

# Start backend
echo "Starting SQLite backend on port $PORT..."
node server.js &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# Start frontend
echo "Starting frontend on port $FRONTEND_PORT..."
cd "$FRONTEND_DIR"
python3 -m http.server "$FRONTEND_PORT" &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  ENVITATION - SQLite Mode"
echo "========================================="
echo ""
echo "  Backend:   http://localhost:$PORT"
echo "  Frontend:  http://localhost:$FRONTEND_PORT/frontend/index.html"
echo "  Admin:     http://localhost:$FRONTEND_PORT/frontend/admin.html"
echo "  E-Card:    http://localhost:$FRONTEND_PORT/frontend/ecard.html"
echo ""
echo "  Database:  $BACKEND_DIR/data/envitation.db"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
