#!/bin/bash

# ENVITATION - Development Server
# Run this from the project root directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/src"
PORT=${1:-8081}

echo "========================================="
echo "  ENVITATION - Development Server"
echo "========================================="
echo ""
echo "Starting server on port $PORT..."
echo ""
echo "Access the application at:"
echo "  Invitation:  http://localhost:$PORT/frontend/index.html"
echo "  Admin Panel: http://localhost:$PORT/frontend/admin.html"
echo "  E-Card:      http://localhost:$PORT/frontend/ecard.html"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

cd "$SRC_DIR"
python3 -m http.server "$PORT"
