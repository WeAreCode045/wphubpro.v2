#!/bin/bash

# Update Stripe Function Environment Variables
# This script manually sets the environment variables for the stripe-create-checkout-session function

set -e

FUNCTION_ID="stripe-create-checkout-session"

echo "================================================"
echo "Updating Stripe Function Environment Variables"
echo "================================================"
echo ""

# Prompt for Appwrite API Key
echo "Enter your Appwrite API Key:"
read -s APPWRITE_API_KEY
echo ""

if [ -z "$APPWRITE_API_KEY" ]; then
    echo "❌ Error: Appwrite API key is required"
    exit 1
fi

# Set variables using Appwrite CLI
echo "Setting APPWRITE_ENDPOINT..."
appwrite functions create-variable \
    --functionId "$FUNCTION_ID" \
    --key "APPWRITE_ENDPOINT" \
    --value "https://appwrite.code045.nl/v1" 2>/dev/null || \
appwrite functions update-variable \
    --functionId "$FUNCTION_ID" \
    --variableId "APPWRITE_ENDPOINT" \
    --value "https://appwrite.code045.nl/v1"

echo "Setting APPWRITE_PROJECT_ID..."
appwrite functions create-variable \
    --functionId "$FUNCTION_ID" \
    --key "APPWRITE_PROJECT_ID" \
    --value "698a55ce00010497b136" 2>/dev/null || \
appwrite functions update-variable \
    --functionId "$FUNCTION_ID" \
    --variableId "APPWRITE_PROJECT_ID" \
    --value "698a55ce00010497b136"

echo "Setting APPWRITE_API_KEY..."
appwrite functions create-variable \
    --functionId "$FUNCTION_ID" \
    --key "APPWRITE_API_KEY" \
    --value "$APPWRITE_API_KEY" 2>/dev/null || \
appwrite functions update-variable \
    --functionId "$FUNCTION_ID" \
    --variableId "APPWRITE_API_KEY" \
    --value "$APPWRITE_API_KEY"

echo "Setting STRIPE_SECRET_KEY..."
appwrite functions create-variable \
    --functionId "$FUNCTION_ID" \
    --key "STRIPE_SECRET_KEY" \
    --value "sk_test_51Sz4LgK8qavpXYuh1msYBMfiyXfBcA6hErxP0IxuHFUZZW2Rb163utafuaXWzz4Kbu39Dt1Bs2KY6xUXNzRiM6AC00Wcr71stm" 2>/dev/null || \
appwrite functions update-variable \
    --functionId "$FUNCTION_ID" \
    --variableId "STRIPE_SECRET_KEY" \
    --value "sk_test_51Sz4LgK8qavpXYuh1msYBMfiyXfBcA6hErxP0IxuHFUZZW2Rb163utafuaXWzz4Kbu39Dt1Bs2KY6xUXNzRiM6AC00Wcr71stm"

echo "Setting DATABASE_ID..."
appwrite functions create-variable \
    --functionId "$FUNCTION_ID" \
    --key "DATABASE_ID" \
    --value "platform_db" 2>/dev/null || \
appwrite functions update-variable \
    --functionId "$FUNCTION_ID" \
    --variableId "DATABASE_ID" \
    --value "platform_db"

echo "Setting ACCOUNTS_COLLECTION_ID..."
appwrite functions create-variable \
    --functionId "$FUNCTION_ID" \
    --key "ACCOUNTS_COLLECTION_ID" \
    --value "accounts" 2>/dev/null || \
appwrite functions update-variable \
    --functionId "$FUNCTION_ID" \
    --variableId "ACCOUNTS_COLLECTION_ID" \
    --value "accounts"

echo ""
echo "✅ All environment variables have been set!"
echo ""
echo "Next steps:"
echo "1. Redeploy the function: appwrite push functions"
echo "2. Test the subscription flow"
