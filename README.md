**WP Hub Pro (v2)**

**Overview:**
- **Project:** WP Hub Pro — a management console for WordPress sites, a plugin/theme library, and subscription billing administration.
- **Stack:** React + Vite frontend, Appwrite backend (Databases + Functions), Stripe for payments, AWS S3 for large file storage, TypeScript.

**Features:**
- **User-facing:** Dashboard, Library (upload plugins/themes), Site management, Subscription management, Invoices, Admin impersonation.
- **Admin-facing:** User management, Plan management (local plans + Stripe plans), Platform settings (logo + position), function-based background processors.
- **Serverless functions:** Stripe integrations, ZIP parsing and S3 upload (`functions/zip-parser`), admin actions (`functions/admin-login-as`), utility functions (`functions/db-count`).

**Repository layout (high-level):**
- **`src` / root files:** `App.tsx`, `index.tsx`, `vite.config.ts` — app bootstrap and routing.
- **`pages/`** — page-level routes (e.g. `UserSubscriptionDetailPage.tsx`, `SitesPage.tsx`).
- **`components/`** — UI primitives and composed components (Cards, Modals, Layouts).
- **`hooks/`** — React hooks (`useAuth`, `useLibrary`, `useStripe`, etc.).
- **`functions/`** — Appwrite server functions (Node.js) used for Stripe, uploads, and admin utilities.
- **`services/`** — wrappers for Appwrite, Stripe and WordPress proxying.

**Important files:**
- **`App.tsx`**: application entry and routing. See [App.tsx](App.tsx)
- **`pages/UserSubscriptionDetailPage.tsx`**: subscription details UI (supports local-assigned plans). See [pages/UserSubscriptionDetailPage.tsx](pages/UserSubscriptionDetailPage.tsx)
- **`functions/zip-parser/index.js`**: server function that accepts uploaded zips (base64 or S3 key), streams to S3, extracts plugin/theme metadata and writes `library` documents. See [functions/zip-parser/index.js](functions/zip-parser/index.js)
- **`functions/stripe-*`**: Stripe integration functions (checkout, invoice listing, subscription sync, cancellation helpers).

**Local development**

Prerequisites
- Node.js 18+ and a package manager (npm/yarn/pnpm)
- Appwrite server (or remote instance) configured with the project's `projectId` and API key
- Stripe API keys (for Stripe-enabled flows)
- AWS S3 credentials (if using S3 uploads) — can be provided via environment variables or stored in the `platform_settings` document as `s3`.

Environment
- Copy `.env.example` to `.env.local` and populate keys. Typical entries:

```bash
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.example/v1
VITE_APPWRITE_PROJECT=projectId
VITE_STRIPE_KEY=sk_test_...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-west-1
S3_BUCKET=my-bucket
```

Run locally

```bash
npm install
npm run dev
```

Frontend builds

```bash
npm run build
npm run preview
```

Appwrite functions (development & deploy)
- Development: functions are in `functions/*`. Each function has its own `package.json` and must be deployed with the Appwrite CLI. Example:

```bash
# from workspace root
appwrite login
appwrite projects set --project <PROJECT_ID>
appwrite functions deploy --functionId zip-parser --src functions/zip-parser --runtime node-18
appwrite functions deploy --functionId admin-login-as --src functions/admin-login-as --runtime node-18
```

- After deploying, ensure function environment variables are set (or the app reads `platform_settings`) and confirm `execute` permission is restricted for admin-only functions like `admin-login-as`.

Stripe notes
- Stripe flows are implemented inside the `functions/stripe-*` functions (checkout, subscription detail, invoice listings). For subscription details the frontend calls `stripe-get-subscription-details` — this returns normalized data for Stripe-managed subscriptions.
- Local-assigned plans are supported: the subscription document can contain `source: 'local'` and `plan_label`/`plan_id`. The frontend will render the local plan information and hide Stripe management actions.

Uploads & library
- For small uploads the frontend may POST base64 payloads to `functions/zip-parser`. For production and large files implement a presigned S3 upload flow: generate a presigned PUT URL server-side, upload directly from the client to S3, then call `zip-parser` with the S3 key to process the file.
- `functions/zip-parser` currently supports both base64 payloads and S3-key processing. It extracts plugin/theme metadata and writes a `library` document containing metadata and S3 locations.

Security & configuration
- Do NOT expose admin-only function executions. Restrict `execute` or `teams` in `appwrite.config.json` for functions like `admin-login-as`.
- Secrets should live in the Appwrite function environment variables or `.env.local` and not be committed.

Testing
- There are no automated tests provided by default. Quick smoke-test:

1. Start Appwrite and the frontend.
2. Create a user, assign a local plan in the `subscriptions` collection (field `source: 'local'`, `plan_label`) and visit the subscription details page to confirm the new local-plan UI.
3. Upload a small plugin zip via the Library UI and confirm it appears in the `library` collection and S3 bucket.

Operational notes
- Appwrite function payload size is limited. For large zips use presigned upload flow.
- `functions/zip-parser` timeout must be increased for large file processing — check `appwrite.config.json` for the `zip-parser` timeout setting and set to a high value (e.g., 300s) if required.
- Database IDs & collection names are defined in `services/appwrite.ts` and environment variables — ensure `DATABASE_ID`, `LIBRARY_COLLECTION_ID`, and other constants match your Appwrite project.

Contributing
- Fork, create a feature branch, make changes, then open a PR. Keep changes scoped and add unit tests where appropriate.

Where to look next
- Subscription UI: `pages/UserSubscriptionDetailPage.tsx` — renders both Stripe and local-plan states.
- Uploads: `hooks/useLibrary.ts` and `functions/zip-parser/index.js`.
- Stripe: `functions/stripe-get-subscription-details` and related `functions/stripe-*`.

Maintainer
- Primary repo owner: local developer (see project metadata)

License
- See `LICENSE` in the repository root.
