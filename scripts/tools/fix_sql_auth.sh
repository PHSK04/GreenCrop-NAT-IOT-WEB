#!/bin/bash

echo "🔧 SQL Server Authentication Fix Script"
echo "========================================"

# Check if container is running
if ! docker ps | grep -q azuresqledge; then
    echo "❌ SQL Server container 'azuresqledge' is not running"
    echo "Starting container..."
    docker start azuresqledge
    sleep 10
fi

echo "✅ Container is running"

# Test connection
echo ""
echo "Testing connection..."
node server/test_db_connection.js

echo ""
echo "✅ Done! If you still see 'Login failed', try:"
echo "   1. Restart the container: docker restart azuresqledge"
echo "   2. Wait 15 seconds"
echo "   3. Run this script again"
