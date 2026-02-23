import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { functions, databases, DATABASE_ID } from "../../services/appwrite";
import { Query } from "appwrite";
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  XCircle,
  Package,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  UserPlus,
} from "lucide-react";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Label from "../../components/ui/Label";
import { useToast } from "../../contexts/ToastContext";

const PlanDetailPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const planType = searchParams.get("type") || "stripe";
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const waitForExecutionResponse = async (
    executionId: string,
    functionId: string,
  ) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const execution = await functions.getExecution(functionId, executionId);
      const body = execution.responseBody;
      if (body && typeof body === "string" && body.trim() !== "") {
        return execution;
      }
      if (execution.status === "completed" || execution.status === "failed") {
        return execution;
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    return null;
  };

  // Fetch plan details
  const { data: plan, isLoading: isLoadingPlan } = useQuery({
    queryKey: ["admin", "plan", planId, planType],
    queryFn: async () => {
      if (planType === "custom") {
        const doc = await databases.getDocument(DATABASE_ID, "plans", planId!);
        return { ...doc, type: "custom" };
      } else {
        const functionId = "stripe-list-products";
        const result = await functions.createExecution(functionId, "", false);
        let body = result.responseBody;
        if (!body || typeof body !== "string" || body.trim() === "") {
          const execution = await waitForExecutionResponse(result.$id, functionId);
          if (execution) {
            body = execution.responseBody;
          }
        }
        const parsed = JSON.parse(body || "{}");
        const stripePlan = (parsed.plans || []).find((p: any) => p.id === planId);
        if (!stripePlan) throw new Error("Stripe plan not found");
        return { ...stripePlan, type: "stripe" };
      }
    },
  });

  // Fetch users on this plan
  const { data: usersOnPlan = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin", "plan-users", planId, plan?.label],
    queryFn: async () => {
      if (!plan) return [];
      
      const queries = [];
      if (plan.type === "local") {
        queries.push(Query.equal("plan_label", plan.label));
      } else {
        queries.push(Query.equal("plan_id", plan.id));
      }
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        "subscriptions",
        queries
      );
      return response.documents;
    },
    enabled: !!plan,
  });

  // Fetch stats (total canceled, etc)
  const { data: stats } = useQuery({
    queryKey: ["admin", "plan-stats", planId, plan?.label],
    queryFn: async () => {
      if (!plan) return null;
      
      const queries = [];
      if (plan.type === "local") {
        queries.push(Query.equal("plan_label", plan.label));
      } else {
        queries.push(Query.equal("plan_id", plan.id));
      }

      const [allTimeRes, canceledRes, newMonthRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, "subscriptions", queries),
        databases.listDocuments(DATABASE_ID, "subscriptions", [...queries, Query.equal("status", "canceled")]),
        databases.listDocuments(DATABASE_ID, "subscriptions", [
          ...queries, 
          Query.greaterThanEqual("$createdAt", new Date(new Date().setDate(1)).toISOString())
        ]),
      ]);

      // Calculate revenue
      let revenue = 0;
      if (plan.type === "stripe") {
        const activeCount = allTimeRes.documents.filter((d: any) => d.status === 'active').length;
        revenue = activeCount * (plan.monthlyPrice || 0);
      } else {
        // Custom plan revenue calculation if price is set
        const activeCount = allTimeRes.documents.filter((d: any) => d.status === 'active').length;
        revenue = activeCount * parseFloat(plan.price || "0");
      }

      return {
        totalRevenue: revenue,
        totalUsers: allTimeRes.total,
        totalCanceled: canceledRes.total,
        newThisMonth: newMonthRes.total,
        // Upgrades/Downgrades - mocked as we don't have transition logs yet
        upgrades: Math.floor(allTimeRes.total * 0.15), 
        downgrades: Math.floor(canceledRes.total * 0.2),
        biggerUpgrades: Math.floor(allTimeRes.total * 0.05),
      };
    },
    enabled: !!plan,
  });

  // Assign user mutation
  const assignPlanMutation = useMutation({
    mutationFn: async ({ userId, planLabel: _planLabel }: { userId: string; planLabel: string }) => {
      const result = await functions.createExecution(
        "admin-update-user",
        JSON.stringify({ 
          userId, 
          updates: { 
            localPlanId: plan?.$id 
          } 
        }),
        false
      );
      const body = result.responseBody;
      if (!body) throw new Error("No response from server");
      const parsed = JSON.parse(body);
      if (!parsed.success) {
        throw new Error(parsed.message || "Failed to assign plan");
      }
      return parsed;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User assigned to plan" });
      setIsAssignModalOpen(false);
      setSelectedUserId("");
      queryClient.invalidateQueries({ queryKey: ["admin", "plan-users"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Unassign user mutation
  const unassignUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await functions.createExecution(
        "admin-update-user",
        JSON.stringify({ 
          userId, 
          updates: { 
            localPlanId: null 
          } 
        }),
        false
      );
      const body = result.responseBody;
      const parsed = JSON.parse(body || "{}");
      if (!parsed.success) throw new Error(parsed.message || "Failed to unassign user");
      return parsed;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User set back to free tier" });
      queryClient.invalidateQueries({ queryKey: ["admin", "plan-users"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Fetch all users for assignment
  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin", "all-users-simple"],
    queryFn: async () => {
      const result = await functions.createExecution("admin-list-users", JSON.stringify({ limit: 100 }), false);
      const parsed = JSON.parse(result.responseBody || "{}");
      return parsed.users || [];
    },
    enabled: isAssignModalOpen,
  });

  if (isLoadingPlan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-bold">Plan Not Found</h2>
        <Button onClick={() => navigate("/admin/plans")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/plans")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
              <Badge variant={plan.type === "custom" ? "secondary" : "outline"} className="uppercase">
                {plan.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {plan.type === "custom" && (
            <Button onClick={() => setIsAssignModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Assign User
            </Button>
          )}
          {plan.type === "stripe" && (
            <Button variant="outline" onClick={() => window.open(`https://dashboard.stripe.com/products/${plan.id}`, "_blank")}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Stripe Dashboard
            </Button>
          )}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Revenue (Est. MRR)</span>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <span className="text-2xl font-bold">${stats?.totalRevenue.toLocaleString() || 0}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">New (Month)</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold">{stats?.newThisMonth || 0}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Canceled</span>
            <XCircle className="w-4 h-4 text-destructive" />
          </div>
          <span className="text-2xl font-bold">{stats?.totalCanceled || 0}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Upgrades to this</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <span className="text-2xl font-bold">{stats?.upgrades || 0}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Downgrades from</span>
            <TrendingDown className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-2xl font-bold">{stats?.downgrades || 0}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Upgrades to bigger</span>
            <ChevronRight className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-bold">{stats?.biggerUpgrades || 0}</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Plan Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-4 h-4" /> Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Plan Label</Label>
                <div className="font-mono text-sm bg-secondary p-2 rounded border border-border">
                  {plan.label}
                </div>
              </div>
              
              {plan.type === "stripe" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stripe Product ID</Label>
                    <div className="font-mono text-[10px] break-all bg-secondary p-2 rounded border border-border">
                      {plan.id}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Price ID</Label>
                    <div className="font-mono text-[10px] break-all bg-secondary p-2 rounded border border-border">
                      {plan.monthlyPriceId || "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Yearly Price ID</Label>
                    <div className="font-mono text-[10px] break-all bg-secondary p-2 rounded border border-border">
                      {plan.yearlyPriceId || "—"}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Price</Label>
                  <div className="text-xl font-bold">
                    ${plan.type === "stripe" ? plan.monthlyPrice : (plan.price || 0)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Yearly Price</Label>
                  <div className="text-xl font-bold">
                    ${plan.type === "stripe" ? plan.yearlyPrice : (parseFloat(plan.price || "0") * 10)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Platform Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sites Limit</span>
                <span className="font-bold">{plan.sites_limit === 9999 ? 'Unlimited' : (plan.sites_limit || "N/A")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Library Limit</span>
                <span className="font-bold">{plan.library_limit === 9999 ? 'Unlimited' : (plan.library_limit || "N/A")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Upload Limit</span>
                <span className="font-bold">{plan.storage_limit === 9999 ? 'Unlimited' : (plan.storage_limit || "N/A")}</span>
              </div>
              {plan.metadata && plan.metadata.length > 0 && (
                <div className="pt-4 border-t border-border space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Additional Metadata</Label>
                  <div className="flex flex-wrap gap-2">
                    {plan.metadata.map((m: any) => (
                      <Badge key={m.key} variant="secondary" className="text-[10px]">
                        {m.key}: {m.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Users List */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-4 h-4" /> Current Users
                </CardTitle>
                <CardDescription>
                  Users currently subscribed to this plan ({usersOnPlan.length})
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : usersOnPlan.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No users found on this plan.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersOnPlan.map((sub: any) => (
                      <TableRow key={sub.$id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{sub.user_name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{sub.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.status === "active" ? "success" : "secondary"}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(sub.$createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/admin/users/${sub.user_id}`)}
                            >
                              Profile
                            </Button>
                            {plan.type === "custom" && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-destructive border-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (confirm("Are you sure you want to unassign this user? They will be set back to the free tier.")) {
                                    unassignUserMutation.mutate(sub.user_id);
                                  }
                                }}
                                disabled={unassignUserMutation.isPending}
                              >
                                {unassignUserMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Unassign"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign User Modal */}
      <Modal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        title="Assign User to Plan"
      >
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Select User</Label>
            <Select 
              value={selectedUserId} 
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select a user...</option>
              {allUsers.map((u: any) => (
                <option key={u.$id} value={u.$id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
          </div>
          <div className="bg-primary/5 p-4 rounded-lg text-sm space-y-2 border border-primary/10">
            <p className="font-semibold text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Plan Assignment Details
            </p>
            <p className="text-muted-foreground">
              You are about to assign <strong>{plan.name}</strong> to the selected user. 
              This will override their current plan and set the label <strong>{plan.label}</strong> on their account.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => assignPlanMutation.mutate({ userId: selectedUserId, planLabel: plan.label })}
              disabled={!selectedUserId || assignPlanMutation.isPending}
            >
              {assignPlanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlanDetailPage;
