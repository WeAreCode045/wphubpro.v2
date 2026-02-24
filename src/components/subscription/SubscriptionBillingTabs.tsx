import React from "react";
import { Calendar, CreditCard, FileText, ExternalLink, Download, AlertCircle } from "lucide-react";
import Card, { CardContent } from "../ui/Card.tsx";
import Tabs from "../ui/Tabs.tsx";
import Button from "../ui/Button.tsx";
import type {
  SubscriptionCore,
  SubscriptionPaymentMethod,
  UpcomingInvoice,
  StripeInvoice,
} from "./subscription-detail-types.ts";

interface Props {
  subscription: SubscriptionCore;
  paymentMethod: SubscriptionPaymentMethod | null;
  upcomingInvoice: UpcomingInvoice | null;
  invoices: StripeInvoice[];
  onPayInvoice: (invoiceId: string, hostedUrl: string) => void;
  formatDate: (timestamp: number) => string;
  formatCurrency: (amount: number, currency: string) => string;
}

const SubscriptionBillingTabs: React.FC<Props> = ({
  subscription,
  paymentMethod,
  upcomingInvoice,
  invoices,
  onPayInvoice,
  formatDate,
  formatCurrency,
}) => {
  return (
    <Card>
      <CardContent className="p-0">
        <Tabs defaultValue="billing">
          <div className="px-4 border-b border-border">
            <Tabs.List className="mb-0">
              <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
              <Tabs.Trigger value="invoices">Invoices</Tabs.Trigger>
            </Tabs.List>
          </div>

          <Tabs.Content value="billing">
            <div className="p-4 mt-0">
              {subscription.source === "local" ? (
                <div className="space-y-4">
                  <div className="bg-accent/5 border-accent/10 p-4 rounded-md text-sm">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Local subscription</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This subscription was assigned and is managed by your administrator. Billing and invoices are handled outside of Stripe in this case.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <h3 className="text-sm font-semibold">Billing Cycle</h3>
                    </div>
                    <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Current Period</span>
                        <span className="font-medium">
                          {subscription.current_period_start && subscription.current_period_end
                            ? `${formatDate(subscription.current_period_start)} - ${formatDate(subscription.current_period_end)}`
                            : "—"}
                        </span>
                      </div>
                      {subscription.trial_end && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Trial Ends</span>
                          <span className="font-medium">{formatDate(subscription.trial_end)}</span>
                        </div>
                      )}
                      {subscription.cancel_at && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Cancels On</span>
                          <span className="font-medium text-orange-500">{formatDate(subscription.cancel_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {paymentMethod && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-sm font-semibold">Payment Method</h3>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium capitalize">{paymentMethod.type}</span>
                        </div>
                        {paymentMethod.card && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Card</span>
                              <span className="font-medium">
                                {paymentMethod.card.brand.toUpperCase()} •••• {paymentMethod.card.last4}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Expires</span>
                              <span className="font-medium">
                                {paymentMethod.card.exp_month}/{paymentMethod.card.exp_year}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {upcomingInvoice && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-sm font-semibold">Next Payment</h3>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Amount Due</span>
                          <span className="font-semibold text-foreground text-sm">
                            {formatCurrency(upcomingInvoice.amount_due, upcomingInvoice.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Due Date</span>
                          <span className="font-medium">
                            {upcomingInvoice.next_payment_attempt
                              ? formatDate(upcomingInvoice.next_payment_attempt)
                              : formatDate(upcomingInvoice.period_end)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Tabs.Content>

          <Tabs.Content value="invoices">
            <div className="p-4 mt-0">
              <div className="space-y-2">
                {subscription.source === "local" ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    This subscription is managed locally by your administrator. Invoice history and payments are handled outside of Stripe for this subscription.
                  </div>
                ) : invoices.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">No invoices found</p>
                ) : (
                  invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-xs">
                            Invoice #{invoice.number || invoice.id.slice(-8)}
                          </p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              invoice.paid
                                ? "bg-green-500/10 text-green-500"
                                : invoice.status === "open"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {invoice.paid ? "Paid" : invoice.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span>{formatDate(invoice.created)}</span>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(invoice.amount_due, invoice.currency)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!invoice.paid && invoice.status === "open" && invoice.hosted_invoice_url && (
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => onPayInvoice(invoice.id, invoice.hosted_invoice_url || "")}
                          >
                            Pay Now
                          </Button>
                        )}
                        {invoice.hosted_invoice_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => window.open(invoice.hosted_invoice_url || "", "_blank")}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        )}
                        {invoice.invoice_pdf && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => window.open(invoice.invoice_pdf || "", "_blank")}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Tabs.Content>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SubscriptionBillingTabs;
