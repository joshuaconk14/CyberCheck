#!/bin/bash

# LogApp Setup Script
# This script sets up the development environment for LogApp

set -e

echo "🚀 Setting up LogApp - AI-Powered Cybersecurity Log Analysis Platform"
echo "=================================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. You'll need to install PostgreSQL 15+ for the database."
    echo "   On macOS: brew install postgresql"
    echo "   On Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "   Or use Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create environment file if it doesn't exist
if [ ! -f server/.env ]; then
    echo "📝 Creating environment configuration..."
    cp server/env.example server/.env
    echo "✅ Created server/.env file"
    echo "⚠️  Please edit server/.env and add your OpenAI API key and database configuration"
else
    echo "✅ Environment file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p server/uploads
mkdir -p server/logs
mkdir -p client/.next

echo "✅ Directories created"

# Check if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Docker and Docker Compose detected"
    echo "   You can run 'docker-compose up -d' to start the application with Docker"
else
    echo "⚠️  Docker not detected. You can install Docker for easier deployment."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env and add your OpenAI API key"
echo "2. Set up PostgreSQL database (or use Docker)"
echo "3. Run 'npm run dev' to start development servers"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "For Docker deployment:"
echo "1. Edit server/.env with your OpenAI API key"
echo "2. Run 'docker-compose up -d'"
echo ""
echo "Happy coding! 🚀"
