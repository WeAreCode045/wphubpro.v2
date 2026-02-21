
import { Models } from 'appwrite';

export type User = Models.User<Models.Preferences> & {
  isAdmin?: boolean;
};

export interface Subscription {
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  sitesLimit: number;
  storageLimit: number; // number of uploads
  libraryLimit: number;
  source?: 'stripe' | 'local' | 'free-tier'; // Where the subscription data originates
  currentPeriodEnd?: number; // Stripe: Unix timestamp for billing date
  cancelAtPeriodEnd?: boolean; // Stripe: Whether subscription cancels at period end
  priceId?: string; // Stripe: The current price ID
  priceAmount?: number; // Stripe: Unit amount in cents
  currency?: string; // Stripe: Currency code
  interval?: 'month' | 'year'; // Stripe: Billing interval
  intervalCount?: number; // Stripe: Billing interval count
}

export interface Site {
  $id: string;
  userId: string;
  siteUrl: string;
  siteName: string;
  // New top-level fields (optional): `username` is the WP application username.
  // `password` when present is stored encrypted (server-side) and should not be exposed to clients in plaintext.
  username?: string;
  password?: string;
  // No legacy WP credential field; use top-level `username` and `password` fields
  healthStatus: 'good' | 'warning' | 'error';
  lastChecked: string;
  wpVersion: string;
  phpVersion: string;
  action_log?: any[];
}

export enum LibraryItemType {
  Plugin = 'plugin',
  Theme = 'theme',
}

export enum LibraryItemSource {
  Official = 'official',
  Local = 'local',
}

export interface LibraryItem {
  $id: string;
  userId: string;
  name: string;
  type: LibraryItemType;
  source: LibraryItemSource;
  version: string;
  author: string;
  description: string;
  s3Path?: string;
  wpSlug?: string;
}

export interface WordPressPlugin {
  name: string;
  status: 'active' | 'inactive';
  version: string;
  plugin: string; // e.g., 'akismet/akismet.php'
  author: string;
  description: string;
}

export interface WordPressTheme {
  name: string;
  status: 'active' | 'inactive';
  version: string;
  stylesheet: string;
}

export interface SiteHealth {
    wp_version: string;
    php_version: string;
    // Add other health metrics as needed
}

export interface StripeInvoice {
    id: string;
    created: number;
    amount_paid: number;
    currency: string;
    status: string;
    invoice_pdf: string;
}
