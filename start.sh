#!/bin/bash

echo "🚀 Starting Pre-Screening Multi-Agent System..."
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your API keys:"
    echo "OPENAI_API_KEY=your_openai_key"
    echo "ANTHROPIC_API_KEY=your_claude_key"
    echo "GOOGLE_API_KEY=your_gemini_key"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting backend server (port 3001)..."
npm run server &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Test backend health
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend server is running!"
else
    echo "❌ Backend server failed to start!"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "🎨 Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 System started successfully!"
echo "📊 Frontend: http://localhost:5178 (or next available port)"
echo "🔧 Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap 'echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
wait 