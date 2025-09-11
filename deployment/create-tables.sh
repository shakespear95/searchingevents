#!/bin/bash

# Create DynamoDB Tables for EventFinder
# Run this script to create all required tables

echo "🚀 Creating DynamoDB tables for EventFinder..."

# Create EventFinderSearchRequests table (for async search processing)
echo "📋 Creating EventFinderSearchRequests table..."
aws dynamodb create-table \
    --table-name EventFinderSearchRequests \
    --attribute-definitions AttributeName=requestId,AttributeType=S \
    --key-schema AttributeName=requestId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1

if [ $? -eq 0 ]; then
    echo "✅ EventFinderSearchRequests table created successfully"
else
    echo "❌ Failed to create EventFinderSearchRequests table"
fi

# Wait a moment
sleep 2

# Create EventFinderUserSearches table (for search history)
echo "📋 Creating EventFinderUserSearches table..."
aws dynamodb create-table \
    --table-name EventFinderUserSearches \
    --attribute-definitions \
        AttributeName=searchId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
    --key-schema AttributeName=searchId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=UserIdIndex,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1

if [ $? -eq 0 ]; then
    echo "✅ EventFinderUserSearches table created successfully"
else
    echo "❌ Failed to create EventFinderUserSearches table"
fi

# Wait a moment
sleep 2

# Create EventFinderUsers table (for authentication)
echo "📋 Creating EventFinderUsers table..."
aws dynamodb create-table \
    --table-name EventFinderUsers \
    --attribute-definitions AttributeName=username,AttributeType=S \
    --key-schema AttributeName=username,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1

if [ $? -eq 0 ]; then
    echo "✅ EventFinderUsers table created successfully"
else
    echo "❌ Failed to create EventFinderUsers table"
fi

echo "🎉 Table creation process completed!"
echo ""
echo "📊 Check table status with:"
echo "aws dynamodb list-tables --region ap-south-1"
echo ""
echo "🔍 Check specific table status:"
echo "aws dynamodb describe-table --table-name EventFinderSearchRequests --region ap-south-1"