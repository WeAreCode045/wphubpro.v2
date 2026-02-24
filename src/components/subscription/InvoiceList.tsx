import React from "react";
import { useInvoices } from "../../hooks/useStripe.ts";
import { Loader2, AlertCircle, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/Table.tsx";
import Button from "../ui/Button.tsx";

const InvoiceList: React.FC = () => {
  const { data: invoices, isLoading, isError, error } = useInvoices();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 rounded-md">
        <AlertCircle className="w-5 h-5 mr-2" />
        <p>{error.message}</p>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No invoices found.
      </p>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Download</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                {new Date(invoice.created * 1000).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: invoice.currency.toUpperCase(),
                }).format(invoice.amount_paid / 100)}
              </TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${invoice.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                >
                  {invoice.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="icon">
                  <a
                    href={invoice.invoice_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoiceList;
