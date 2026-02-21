# Stripe Integration Setup

## Error: Missing environment variables

The `APPWRITE_API_KEY` is not configured in your Appwrite functions.

## Step-by-Step Fix

### 1. Create Appwrite API Key

1. Open Appwrite Console: https://appwrite.code045.nl/console/project-698a55ce00010497b136/overview/keys
2. Click **"Create API Key"**
3. Name: `Stripe Functions Key`
4. Expiration: Never (or set as needed)
5. Scopes: Select these permissions:
   ```
   ✓ databases.read
   ✓ databases.write
   ```
6. Click **Create**
7. **Copy the API key** (you won't see it again)

### 2. Update appwrite.config.json

Replace empty `APPWRITE_API_KEY` values in these sections:

**Line ~611** (stripe-create-checkout-session):
```json
"APPWRITE_API_KEY": "paste-your-api-key-here",
```

**Line ~636** (stripe-get-subscription):
```json
"APPWRITE_API_KEY": "paste-your-api-key-here",
```

**Note:** SUCCESS_URL and CANCEL_URL are now dynamic - the function automatically uses the current app URL (works for both localhost:3000 and production).

### 3. Deploy to Appwrite

```bash
appwrite push functions
```

### 4. Test

1. Go to `/#/subscription`
2. Select a plan
3. Click **Subscribe**
4. Should redirect to Stripe Checkout
5. After payment, returns to `/#/subscription?success=true`

## Stripe Product Configuration

For plan cards to display properly, add metadata to your Stripe products:

```
feature_1: "5 WordPress sites"
feature_2: "50GB storage"  
feature_3: "Email support"
```

Create both monthly and yearly prices for each product.
