#!/bin/bash

# Stripe Functions Deployment Script
# This script deploys all Stripe integration functions to Appwrite

set -e

echo "=========================================="
echo "WPHub Stripe Functions Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if appwrite CLI is installed
if ! command -v appwrite &> /dev/null; then
    echo -e "${RED}Error: Appwrite CLI is not installed${NC}"
    echo "Install it with: npm install -g appwrite"
    exit 1
fi

echo -e "${GREEN}✓ Appwrite CLI found${NC}"

# Configuration
APPWRITE_ENDPOINT="https://appwrite.code045.nl/v1"
APPWRITE_PROJECT_ID="698a55ce00010497b136"

echo ""
echo "Project Configuration:"
echo "  Endpoint: $APPWRITE_ENDPOINT"
echo "  Project ID: $APPWRITE_PROJECT_ID"
echo ""

# Check if user is logged in
echo "Checking Appwrite authentication..."
if ! appwrite client --endpoint "$APPWRITE_ENDPOINT" &> /dev/null; then
    echo -e "${YELLOW}Please login to Appwrite:${NC}"
    appwrite login
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Set project
echo "Setting project..."
appwrite client --endpoint "$APPWRITE_ENDPOINT"
appwrite client --setProject "$APPWRITE_PROJECT_ID"
echo -e "${GREEN}✓ Project configured${NC}"
echo ""

# Prompt for Stripe API key
echo -e "${YELLOW}Enter your Stripe Secret Key:${NC}"
read -s STRIPE_SECRET_KEY
echo ""

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${RED}Error: Stripe secret key is required${NC}"
    exit 1
fi

# Function to deploy a function
deploy_function() {
    local FUNCTION_ID=$1
    local FUNCTION_NAME=$2
    local EXECUTE_PERMISSION=$3
    local SCOPES=$4
    
    echo ""
    echo "=========================================="
    echo "Deploying: $FUNCTION_NAME"
    echo "=========================================="
    
    # Check if function exists
    if appwrite functions get --functionId "$FUNCTION_ID" &> /dev/null; then
        echo -e "${YELLOW}Function already exists, updating...${NC}"
    else
        echo "Creating function..."
        appwrite functions create \
            --functionId "$FUNCTION_ID" \
            --name "$FUNCTION_NAME" \
            --runtime "node-18.0" \
            --execute "$EXECUTE_PERMISSION" \
            --timeout 15 \
            --enabled true \
            --logging true
        echo -e "${GREEN}✓ Function created${NC}"
    fi
    
    # Create deployment
    echo "Creating deployment..."
    cd "functions/$FUNCTION_ID"
    
    # Install dependencies
    echo "Installing dependencies..."
    npm install --silent
    
    # Create deployment
    appwrite functions createDeployment \
        --functionId "$FUNCTION_ID" \
        --entrypoint "index.js" \
        --code "." \
        --activate true
    
    cd ../..
    echo -e "${GREEN}✓ Deployment created${NC}"
    
    # Set environment variables
    echo "Setting environment variables..."
    appwrite functions updateVariable \
        --functionId "$FUNCTION_ID" \
        --key "STRIPE_SECRET_KEY" \
        --value "$STRIPE_SECRET_KEY" || true
    
    # For functions that need Appwrite access
    if [ "$FUNCTION_ID" == "stripe-list-invoices" ] || [ "$FUNCTION_ID" == "stripe-portal-link" ]; then
        appwrite functions updateVariable \
            --functionId "$FUNCTION_ID" \
            --key "APPWRITE_ENDPOINT" \
            --value "$APPWRITE_ENDPOINT" || true
        
        appwrite functions updateVariable \
            --functionId "$FUNCTION_ID" \
            --key "APPWRITE_PROJECT_ID" \
            --value "$APPWRITE_PROJECT_ID" || true
    fi
    
    echo -e "${GREEN}✓ Environment variables set${NC}"
    echo -e "${GREEN}✓ $FUNCTION_NAME deployed successfully!${NC}"
}

# Deploy all functions
deploy_function "stripe-list-payment-intents" "stripe-list-payment-intents" "label:Admin" ""
deploy_function "stripe-list-products" "stripe-list-products" "label:Admin" ""
deploy_function "stripe-list-invoices" "stripe-list-invoices" "users" "databases.read,documents.read"
deploy_function "stripe-portal-link" "stripe-portal-link" "users" "databases.read,documents.read"

echo ""
echo "=========================================="
echo -e "${GREEN}All functions deployed successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test each function in the Appwrite console"
echo "2. Verify admin pages load data correctly"
echo "3. Check user subscription page works"
echo ""
echo "Function URLs:"
echo "  Payment Intents: $APPWRITE_ENDPOINT/functions/stripe-list-payment-intents/executions"
echo "  Products: $APPWRITE_ENDPOINT/functions/stripe-list-products/executions"
echo "  Invoices: $APPWRITE_ENDPOINT/functions/stripe-list-invoices/executions"
echo "  Portal: $APPWRITE_ENDPOINT/functions/stripe-portal-link/executions"
echo ""
