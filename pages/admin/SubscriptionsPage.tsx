import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { functions, databases, DATABASE_ID } from "../../services/appwrite";
import { Query } from "appwrite";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Card, { CardHeader, CardContent } from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

interface SyncResult {
  created: number;
  updated: number;
  errors: number;
  total: number;
}

const SubscriptionsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const waitForExecutionResponse = async (
    executionId: string,
    functionId: string,
  ) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const execution = await functions.getExecution(functionId, executionId);
      const body = execution.responseBody;
      if (body && typeof body === "string" && body.trim() !== "") {
        return execution;
      }
      if (execution.status === "completed" || execution.status === "failed") {
        return execution;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return null;
  };

  const {
    data: subscriptions = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: async () => {
      const response = await databases.listDocuments(
        DATABASE_ID,
        "subscriptions",
        [Query.orderDesc("$updatedAt"), Query.limit(100)],
      );
      return response.documents;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const functionId = "stripe-sync-subscriptions";
      const result = await functions.createExecution(functionId, "", false);

      let finalResult = result;
      let body = result.responseBody;

      if (!body || typeof body !== "string" || body.trim() === "") {
        const execution = await waitForExecutionResponse(
          result.$id,
          functionId,
        );
        if (execution) {
          finalResult = execution;
          body = execution.responseBody;
        }
      }

      if (!body || typeof body !== "string" || body.trim() === "") {
        throw new Error(
          `No response from server. Status: ${finalResult.responseStatusCode || "n/a"}.`,
        );
      }

      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Invalid JSON response from server.");
      }

      if (finalResult.responseStatusCode >= 400) {
        throw new Error(parsed?.message || "Failed to sync subscriptions.");
      }

      return parsed as SyncResult;
    },
    onSuccess: (data) => {
      setSyncResult(data);
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      setTimeout(() => setSyncResult(null), 10000);
    },
  });

  const filteredSubscriptions = subscriptions.filter((sub: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.user_name?.toLowerCase().includes(query) ||
      sub.user_email?.toLowerCase().includes(query) ||
      sub.user_id?.toLowerCase().includes(query) ||
      sub.plan_label?.toLowerCase().includes(query) ||
      sub.stripe_subscription_id?.toLowerCase().includes(query) ||
      sub.plan_id?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "bg-green-500/10 text-green-500",
      canceled: "bg-red-500/10 text-red-500",
      incomplete: "bg-yellow-500/10 text-yellow-500",
      past_due: "bg-orange-500/10 text-orange-500",
      trialing: "bg-blue-500/10 text-blue-500",
      unpaid: "bg-red-500/10 text-red-500",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-500/10 text-gray-500"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">
            View and sync all Stripe subscriptions.
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sync All
        </Button>
      </header>

      {syncResult && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Sync completed successfully
                </p>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-2 font-semibold">
                      {syncResult.total}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2 font-semibold text-green-500">
                      {syncResult.created}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="ml-2 font-semibold text-blue-500">
                      {syncResult.updated}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>
                    <span className="ml-2 font-semibold text-red-500">
                      {syncResult.errors}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {syncMutation.isError && (
        <Card className="bg-destructive/5 border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">
                {syncMutation.error?.message || "Failed to sync subscriptions"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute l, email-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user ID, plan, or subscription ID..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredSubscriptions.length} subscription
              {filteredSubscriptions.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>{error?.message || "Failed to load subscriptions"}</p>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p>No subscriptions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-semibold text-sm">
                      Customer
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-sm">
                      Plan
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-sm">
                      Start Date
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-sm">
                      Next Billing
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-sm">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((sub: any) => (
                    <tr
                      key={sub.$id}
                      onClick={() => navigate(`/admin/subscriptions/${sub.stripe_subscription_id}`)}
                      className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4 text-sm">
                        <div className="font-medium">
                          {sub.user_name || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {sub.user_email || sub.user_id}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <div className="font-medium">
                          {sub.plan_label || sub.plan_id || "—"}
                        </div>
                        {sub.plan_label && sub.plan_id && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {sub.plan_id}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {sub.billing_start_date
                          ? new Date(parseInt(sub.billing_start_date) * 1000).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {sub.billing_end_date && sub.status !== 'canceled'
                          ? new Date(parseInt(sub.billing_end_date) * 1000).toLocaleDateString()
                          : sub.status === 'canceled' ? "Canceled" : "—"}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {sub.status ? getStatusBadge(sub.status) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsPage;
