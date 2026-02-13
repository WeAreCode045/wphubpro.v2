
import { Models } from 'appwrite';

export type User = Models.User<Models.Preferences> & {
  isAdmin?: boolean;
};

export interface Subscription {
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  sitesLimit: number;
  storageLimit: number; // in MB
  libraryLimit: number;
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
