#!/bin/bash

# Deploy functions with product label metadata

echo "Deploying stripe-create-checkout-session..."
cd /Volumes/Code045Disk/Projects/wphubpro.v2/functions/stripe-create-checkout-session
npm install
tar -czf code.tar.gz .
appwrite functions create-deployment \
  --function-id stripe-create-checkout-session \
  --entrypoint index.js \
  --code code.tar.gz \
  --activate true
rm code.tar.gz

echo ""
echo "Deploying stripe-webhook..."
cd /Volumes/Code045Disk/Projects/wphubpro.v2/functions/stripe-webhook
npm install
tar -czf code.tar.gz .
appwrite functions create-deployment \
  --function-id stripe-webhook \
  --entrypoint index.js \
  --code code.tar.gz \
  --activate true
rm code.tar.gz

echo ""
echo "✅ Deployments complete!"
