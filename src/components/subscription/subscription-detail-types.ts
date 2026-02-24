export type SubscriptionSource = "local" | "stripe" | "free-tier";

export interface SubscriptionPlanLimits {
  sites_limit?: number | null;
  library_limit?: number | null;
  storage_limit?: number | null;
}

export interface SubscriptionPlan {
  product_name?: string | null;
  product_description?: string | null;
  unit_amount?: number | null;
  currency?: string | null;
  interval?: "month" | "year" | null;
  interval_count?: number | null;
  limits?: SubscriptionPlanLimits | null;
}

export interface SubscriptionCustomerAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface SubscriptionCustomer {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: SubscriptionCustomerAddress | null;
  created?: number | null;
}

export interface SubscriptionPaymentMethodCard {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface SubscriptionPaymentMethod {
  type?: string | null;
  card?: SubscriptionPaymentMethodCard | null;
}

export interface StripeInvoice {
  id: string;
  number?: string | null;
  created: number;
  amount_due: number;
  currency: string;
  status: string;
  paid: boolean;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
}

export interface UpcomingInvoice {
  amount_due: number;
  currency: string;
  next_payment_attempt?: number | null;
  period_end: number;
}

export interface SubscriptionCore {
  id: string;
  status: string;
  current_period_start?: number | null;
  current_period_end?: number | null;
  created?: number | null;
  source?: SubscriptionSource;
  trial_end?: number | null;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
}

export interface SubscriptionDetails {
  subscription: SubscriptionCore;
  customer: SubscriptionCustomer;
  plan: SubscriptionPlan;
  invoices: StripeInvoice[];
  upcoming_invoice: UpcomingInvoice | null;
  payment_method: SubscriptionPaymentMethod | null;
}
