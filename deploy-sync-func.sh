#!/bin/bash
set -e

echo "Deploying stripe-sync-subscriptions..."
cd functions/stripe-sync-subscriptions

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    npm install
fi

# Create deployment package
tar -czf code.tar.gz .

# Deploy to Appwrite
# Note: This assumes the function 'stripe-sync-subscriptions' already exists.
# If it fails with "function not found", we might need to create it first.
appwrite functions create-deployment \
  --function-id stripe-sync-subscriptions \
  --entrypoint index.js \
  --code code.tar.gz \
  --activate true

# Cleanup
rm code.tar.gz

echo "Deployment successful."
