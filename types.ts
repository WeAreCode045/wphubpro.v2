
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
  // New: credentials JSON string containing an array of { username, password }
  credentials?: string;
  // No legacy WP fields; use `credentials` for username/password storage
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
