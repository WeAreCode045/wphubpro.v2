import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { functions, databases, DATABASE_ID, avatars } from "../../services/appwrite.ts";
import { Query } from "appwrite";
import {
  ArrowLeft,
  Mail,
  Shield,
  CreditCard,
  User as UserIcon,
  Calendar,
  Loader2,
  AlertCircle,
  Edit2,
  Check,
  X,
  Globe,
  Folder,
  Database,
  RefreshCw,
  Package,
} from "lucide-react";
import Card, { CardHeader, CardContent } from "../../components/ui/Card.tsx";
import Button from "../../components/ui/Button.tsx";
import Input from "../../components/ui/Input.tsx";
import UsageGauge from "../../components/dashboard/UsageGauge.tsx";
import { useToast } from "../../contexts/ToastContext.tsx";

const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", email: "" });

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
    data: userData,
    isLoading: isLoadingUser,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No User ID provided");

      // We reuse admin-list-users but with a limit/offset or we fetch all and find
      // Better: we can call list-users with a search or we can assume we need a specific fetcher
      // For now, let's fetch all (limit 100) and find the user to avoid creating a new function
      const functionId = "admin-list-users";
      const result = await functions.createExecution(
        functionId,
        JSON.stringify({ limit: 100 }),
        false,
      );

      let body = result.responseBody;
      if (!body || body.trim() === "") {
        const exec = await waitForExecutionResponse(result.$id, functionId);
        body = exec?.responseBody || "";
      }

      const parsed = JSON.parse(body);
      if (result.responseStatusCode >= 400) throw new Error(parsed.message || "Failed to fetch user");
      
      const user = parsed.users.find((u: any) => u.id === userId);
      if (!user) throw new Error("User not found");

      return user;
    },
    enabled: !!userId,
  });

  const { data: usage, isLoading: isLoadingUsage } = useQuery({
    queryKey: ["admin", "user-usage", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch sites and library items for this specific user
      const [sites, library, localUploads] = await Promise.all([
        databases.listDocuments(DATABASE_ID, "sites", [Query.equal("user_id", userId), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, "library", [Query.equal("user_id", userId), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, "library", [
          Query.equal("user_id", userId),
          Query.equal("source", "local"),
          Query.limit(1)
        ])
      ]);

      return {
        sitesUsed: sites.total,
        libraryUsed: library.total,
        storageUsed: localUploads.total
      };
    },
    enabled: !!userId
  });

  const { data: subscriptionDoc } = useQuery({
    queryKey: ["admin", "user-subscription", userId],
    queryFn: async () => {
      const response = await databases.listDocuments(DATABASE_ID, "subscriptions", [
        Query.equal("user_id", userId || ""),
        Query.limit(1)
      ]);
      const doc = response.documents[0] || null;
      if (doc && typeof doc.metadata === 'string') {
        try {
          doc.metadata = JSON.parse(doc.metadata);
        } catch (e) {
          doc.metadata = {};
        }
      }
      return doc;
    },
    enabled: !!userId
  });

  const editMutation = useMutation({
    mutationFn: async (updates: { name: string; email: string }) => {
      const functionId = "admin-update-user";
      const result = await functions.createExecution(
        functionId,
        JSON.stringify({ userId, updates }),
        false
      );
      
      let body = result.responseBody;
      if (!body || body.trim() === "") {
        const exec = await waitForExecutionResponse(result.$id, functionId);
        body = exec?.responseBody || "";
      }

      const parsed = JSON.parse(body);
      if (result.responseStatusCode >= 400) throw new Error(parsed.message || "Failed to update user");
      return parsed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      setIsEditing(false);
      toast({
        title: "User Updated",
        description: "User details and Stripe account have been updated.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const handleStartEdit = () => {
    setEditData({ name: userData?.name || "", email: userData?.email || "" });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    editMutation.mutate(editData);
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !userData) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to User Manager
        </Button>
        <Card className="bg-destructive/5 border-destructive">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive">{error?.message || "User not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => navigate("/admin/users")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              User Details
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {userData.id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button size="sm" onClick={handleStartEdit} className="h-8 px-3 text-xs">
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit User
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-8 px-3 text-xs">
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={editMutation.isPending} className="h-8 px-3 text-xs">
                {editMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <><Check className="w-3.5 h-3.5 mr-1.5" /> Save Changes</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Profile Card - Left */}
        <div className="lg:row-span-2 h-full">
          <Card className="h-full">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">User Profile</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                <img 
                  src={avatars.getInitials(userData.name, 128, 128).toString()} 
                  alt={userData.name}
                  className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 object-cover"
                />
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {userData.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {userData.email}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                    Display Name
                  </label>
                  {!isEditing ? (
                    <p className="font-medium text-sm">{userData.name}</p>
                  ) : (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="h-9 text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  {!isEditing ? (
                    <p className="font-medium text-sm">{userData.email}</p>
                  ) : (
                    <Input
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="h-9 text-sm"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                      Role
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Shield className={`w-3.5 h-3.5 ${userData.isAdmin ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium text-sm">{userData.role}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                      Status
                    </label>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        userData.status === "Active"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {userData.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                    Joined Date
                  </label>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{userData.joined}</span>
                  </div>
                </div>
              </div>

              {/* Usage Stats Section */}
              <div className="pt-6 border-t border-border">
                <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-4">
                  Current Usage
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="scale-75 origin-top">
                    <UsageGauge 
                      label="Sites" 
                      used={usage?.sitesUsed || 0} 
                      limit={subscriptionDoc?.metadata?.sites_limit || (userData.planName === 'Free Tier' ? 1 : 9999)} 
                    />
                  </div>
                  <div className="scale-75 origin-top">
                    <UsageGauge 
                      label="Library" 
                      used={usage?.libraryUsed || 0} 
                      limit={subscriptionDoc?.metadata?.library_limit || (userData.planName === 'Free Tier' ? 5 : 9999)} 
                    />
                  </div>
                  <div className="scale-75 origin-top">
                    <UsageGauge 
                      label="Uploads" 
                      used={usage?.storageUsed || 0} 
                      limit={subscriptionDoc?.metadata?.storage_limit || (userData.planName === 'Free Tier' ? 10 : 9999)} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Details - Top Right */}
        <div>
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">Active Plan</h2>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{userData.planName}</span>
                {subscriptionDoc?.stripe_subscription_id && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                    Stripe
                  </span>
                )}
              </div>
              {subscriptionDoc && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {subscriptionDoc.billing_start_date && (
                    <div className="flex justify-between">
                      <span>Started</span>
                      <span>{new Date(parseInt(subscriptionDoc.billing_start_date) * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                  {subscriptionDoc.billing_end_date && (
                    <div className="flex justify-between">
                      <span>Next Renewal</span>
                      <span>{new Date(parseInt(subscriptionDoc.billing_end_date) * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Stripe Product ID</span>
                    <span className="font-mono text-[10px] truncate max-w-[150px]">{subscriptionDoc.plan_id}</span>
                  </div>
                  {subscriptionDoc.plan_price && (
                    <div className="flex justify-between">
                      <span>Stripe Price ID</span>
                      <span className="font-mono text-[10px] truncate max-w-[150px]">{subscriptionDoc.plan_price}</span>
                    </div>
                  )}
                  {subscriptionDoc.stripe_subscription_id && (
                    <div className="flex justify-between">
                      <span>Subscription ID</span>
                      <span className="font-mono text-[10px] truncate max-w-[150px]">{subscriptionDoc.stripe_subscription_id}</span>
                    </div>
                  )}
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-8 text-xs mt-2"
                onClick={() => navigate(`/admin/subscriptions/${subscriptionDoc?.$id || ''}`)}
                disabled={!subscriptionDoc}
              >
                View Full Subscription Details
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Integration Details - Bottom Right */}
        <div>
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">Stripe Link</h2>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                  Customer ID
                </label>
                {userData.stripeId !== "n/a" ? (
                  <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-border">
                    <span className="font-mono text-xs">{userData.stripeId}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`https://dashboard.stripe.com/customers/${userData.stripeId}`, "_blank")}>
                      <Globe className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No Stripe customer linked</p>
                )}
              </div>
              <div className="pt-2">
                <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                  External View
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1" onClick={() => window.open(`https://dashboard.stripe.com/customers/${userData.stripeId}`, "_blank")} disabled={userData.stripeId === "n/a"}>
                    Stripe Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;
