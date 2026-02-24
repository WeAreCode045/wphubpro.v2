import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { functions, databases, DATABASE_ID, ID } from "../../services/appwrite";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Settings2,
  RefreshCw,
  ExternalLink,
  Info,
  Loader2,
  AlertCircle,
  Users,
  ArrowRight,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Label from "../../components/ui/Label";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Checkbox from "../../components/ui/Checkbox";
import { useToast } from "../../contexts/ToastContext";

const PlanManagementPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlanToAssign, setSelectedPlanToAssign] = useState<any>(null);
  const [selectedPlanToEdit, setSelectedPlanToEdit] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [priceYearly, setPriceYearly] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [sitesLimit, setSitesLimit] = useState("");
  const [libraryLimit, setLibraryLimit] = useState("");
  const [storageLimit, setStorageLimit] = useState("");
  const [customPlanLabel, setCustomPlanLabel] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setIsCustomPlan(false);
    setPlanName("");
    setPlanDesc("");
    setPriceMonthly("");
    setPriceYearly("");
    setCurrency("usd");
    setSitesLimit("");
    setLibraryLimit("");
    setStorageLimit("");
    setCustomPlanLabel("");
  };

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

  // Fetch Stripe plans
  const {
    data: stripePlans = [],
    isLoading: isLoadingStripe,
    isError: isStripeError,
    error: stripeError,
    refetch: refetchStripe,
  } = useQuery({
    queryKey: ["stripePlans"],
    queryFn: async () => {
      try {
        const functionId = "stripe-list-products";
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
          throw new Error(parsed?.message || "Failed to fetch plans.");
        }
        return parsed.plans || [];
      } catch (err: any) {
        console.error("Error fetching Stripe plans:", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch custom plans
  const {
    data: customPlans = [],
    isLoading: isLoadingCustom,
    isError: isCustomError,
    error: customError,
    refetch: refetchCustom,
  } = useQuery({
    queryKey: ["customPlans"],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          'plans'
        );
        return response.documents;
      } catch (err: any) {
        console.error("Error fetching custom plans:", err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch users for assignment
  const {
    data: usersData,
    isLoading: isLoadingUsers,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const result = await functions.createExecution(
        "admin-list-users",
        JSON.stringify({ limit: 100 }),
        false
      );
      const body = result.responseBody;
      if (!body) throw new Error("No response from server");
      const parsed = JSON.parse(body);
      return parsed.users || [];
    },
    enabled: isAssignModalOpen,
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      if (planData.isLocal) {
        // Create custom plan
        const doc = await databases.createDocument(
          DATABASE_ID,
          'plans',
          ID.unique(),
          {
            name: planData.name,
            description: planData.description,
            label: planData.label,
            sites_limit: parseInt(planData.sitesLimit, 10),
            library_limit: parseInt(planData.libraryLimit, 10),
            storage_limit: parseInt(planData.storageLimit, 10),
            status: 'active'
          }
        );
        return { success: true, type: 'local', plan: doc };
      } else {
        // Create Stripe plan (implement later)
        throw new Error("Stripe plan creation not yet implemented in this context");
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Plan Created",
        description: data.type === 'local' 
          ? "Custom plan created successfully" 
          : "Stripe plan created successfully",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: data.type === 'local' ? ["localPlans"] : ["stripePlans"] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create plan",
        variant: "destructive",
      });
    },
  });

  // Assign plan mutation
  const assignPlanMutation = useMutation({
    mutationFn: async ({ userId, planLabel }: { userId: string; planLabel: string }) => {
      const result = await functions.createExecution(
        "set-admin",
        JSON.stringify({ userId, labels: [planLabel] }),
        false
      );
      const body = result.responseBody;
      if (!body) throw new Error("No response from server");
      const parsed = JSON.parse(body);
      if (!parsed.success) {
        throw new Error(parsed.error || "Failed to assign plan");
      }
      return parsed;
    },
    onSuccess: () => {
      toast({
        title: "Plan Assigned",
        description: "The custom plan has been assigned to the user successfully.",
      });
      setIsAssignModalOpen(false);
      setSelectedUserId("");
      setSelectedPlanToAssign(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast({
        title: "Assignment Failed",
        description: err.message || "Failed to assign plan to user",
        variant: "destructive",
      });
    },
  });

  // Edit plan mutation
  const editPlanMutation = useMutation({
    mutationFn: async ({ planId, updates }: { planId: string; updates: any }) => {
      const updated = await databases.updateDocument(
        DATABASE_ID,
        'plans',
        planId,
        {
          name: updates.name,
          description: updates.description,
          label: updates.label,
          sites_limit: parseInt(updates.sitesLimit, 10),
          library_limit: parseInt(updates.libraryLimit, 10),
          storage_limit: parseInt(updates.storageLimit, 10),
        }
      );
      return updated;
    },
    onSuccess: () => {
      toast({
        title: "Plan Updated",
        description: "The custom plan has been updated successfully.",
      });
      setIsEditModalOpen(false);
      setSelectedPlanToEdit(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["customPlans"] });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update plan",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = () => {
    if (!planName.trim()) {
      toast({
        title: "Validation Error",
        description: "Plan name is required",
        variant: "destructive",
      });
      return;
    }

    if (isCustomPlan) {
      if (!customPlanLabel.trim() || !sitesLimit || !libraryLimit || !storageLimit) {
        toast({
          title: "Validation Error",
          description: "All fields are required for custom plans",
          variant: "destructive",
        });
        return;
      }
    }

    createPlanMutation.mutate({
      isLocal: isCustomPlan,
      name: planName,
      description: planDesc,
      label: customPlanLabel,
      sitesLimit,
      libraryLimit,
      storageLimit,
      priceMonthly,
      priceYearly,
      currency,
    });
  };

  const handleAssignPlan = () => {
    if (!selectedUserId) {
      toast({
        title: "Validation Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }
    if (!selectedPlanToAssign?.label) {
      toast({
        title: "Validation Error",
        description: "Invalid plan selected",
        variant: "destructive",
      });
      return;
    }
    assignPlanMutation.mutate({
      userId: selectedUserId,
      planLabel: selectedPlanToAssign.label,
    });
  };

  const handleOpenEdit = (plan: any) => {
    setSelectedPlanToEdit(plan);
    setPlanName(plan.name || "");
    setPlanDesc(plan.description || "");
    setCustomPlanLabel(plan.label || "");
    setSitesLimit(String(plan.sites_limit || ""));
    setLibraryLimit(String(plan.library_limit || ""));
    setStorageLimit(String(plan.storage_limit || ""));
    setIsEditModalOpen(true);
  };

  const handleEditPlan = () => {
    if (!planName.trim() || !customPlanLabel.trim() || !sitesLimit || !libraryLimit || !storageLimit) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    editPlanMutation.mutate({
      planId: selectedPlanToEdit.$id,
      updates: {
        name: planName,
        description: planDesc,
        label: customPlanLabel,
        sitesLimit,
        libraryLimit,
        storageLimit,
      },
    });
  };

  const isLoading = isLoadingStripe || isLoadingCustom;
  const isError = isStripeError || isCustomError;
  const error = stripeError || customError;
  const allPlans = [
    ...stripePlans.map((p: any) => ({ ...p, type: 'stripe' })),
    ...customPlans.map((p: any) => ({ ...p, type: 'local' }))
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSync = async () => {
    await refetchStripe();
    await refetchCustom();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Plan Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage Stripe products, pricing, and platform limits.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="bg-background"
            onClick={handleSync}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync from Stripe
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </header>

      {isError ? (
        <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error?.message || "Failed to load plans"}</p>
        </div>
      ) : allPlans.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Plans Found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first subscription plan to get started.
          </p>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6">
          {allPlans.map((plan: any) => (
            <Card
              key={plan.id || plan.$id}
              className={`overflow-hidden border-l-4 ${
                plan.type === 'local' ? 'border-l-blue-500' : 'border-l-primary'
              }`}
            >
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground">
                        {plan.name}
                      </h2>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full border ${
                        plan.type === 'local'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          : 'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>
                        {plan.type === 'local' ? 'CUSTOM' : plan.status || 'STRIPE'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
                      {plan.id || plan.$id}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs mb-4 max-w-md">
                    {plan.description}
                  </p>

                  {plan.type === 'local' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">
                          User Label
                        </Label>
                        <div className="text-lg font-bold">
                          {plan.label}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">
                          Sites Limit
                        </Label>
                        <div className="text-lg font-bold">
                          {plan.sites_limit === 9999 ? 'Unlimited' : plan.sites_limit}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">
                          Library Limit
                        </Label>
                        <div className="text-lg font-bold">
                          {plan.library_limit === 9999 ? 'Unlimited' : plan.library_limit}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">
                          Upload Limit
                        </Label>
                        <div className="text-lg font-bold">
                          {plan.storage_limit === 9999 ? 'Unlimited' : plan.storage_limit}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">
                          Monthly Price
                        </Label>
                        <div className="text-lg font-bold">
                          ${plan.monthlyPrice || 0}
                          <span className="text-xs text-muted-foreground font-normal">
                            /mo
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">
                          Yearly Price
                        </Label>
                        <div className="text-lg font-bold">
                          ${plan.yearlyPrice || 0}
                          <span className="text-xs text-muted-foreground font-normal">
                            /yr
                          </span>
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">
                          Metadata / Limits
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {plan.metadata && plan.metadata.length > 0 ? (
                            plan.metadata.map((meta: any) => (
                              <div
                                key={meta.key}
                                className="flex items-center bg-secondary border border-border rounded px-2 py-1 gap-1.5"
                              >
                                <span className="text-[10px] font-bold text-primary uppercase">
                                  {meta.key}:
                                </span>
                                <span className="text-xs font-medium">
                                  {meta.value}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No metadata
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-muted/50 p-6 flex lg:flex-col justify-center gap-2 border-t lg:border-t-0 lg:border-l border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/admin/plans/${plan.$id || plan.id}${plan.type === 'local' ? '?type=local' : '?type=stripe'}`)}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                  {plan.type === 'local' && (
                    <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedPlanToAssign(plan);
                        setIsAssignModalOpen(true);
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Assign
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleOpenEdit(plan)}
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    </>
                  )}
                  {plan.type === 'stripe' && (
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Stripe
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Create New Subscription Plan"
      >
        <div className="space-y-4 pt-4">
          {/* Plan Type Toggle */}
          <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <Checkbox
              checked={isCustomPlan}
              onChange={(e) => setIsCustomPlan(e.target.checked)}
            />
            <div className="flex-1">
              <Label className="font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Custom Plan (Admin Only)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Custom plans are stored in database and can only be assigned by admins. They don't sync with Stripe.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="planName">Product Name</Label>
              <Input
                id="planName"
                placeholder="e.g. Enterprise"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="planDesc">Description</Label>
              <Input
                id="planDesc"
                placeholder="Briefly explain the plan's focus"
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
              />
            </div>

            {isCustomPlan ? (
              <>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="localLabel">
                    User Label <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="localLabel"
                    placeholder="e.g. premium_partner"
                    value={customPlanLabel}
                    onChange={(e) => setCustomPlanLabel(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This label will be applied to users assigned this plan
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sitesLimit">
                    Sites Limit <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sitesLimit"
                    type="number"
                    placeholder="e.g. 10 (use 9999 for unlimited)"
                    value={sitesLimit}
                    onChange={(e) => setSitesLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Use 9999 for unlimited</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="libraryLimit">
                    Library Limit <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="libraryLimit"
                    type="number"
                    placeholder="e.g. 50 (use 9999 for unlimited)"
                    value={libraryLimit}
                    onChange={(e) => setLibraryLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Use 9999 for unlimited</p>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="storageLimit">
                    Upload Limit <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="storageLimit"
                    type="number"
                    placeholder="e.g. 100 (use 9999 for unlimited)"
                    value={storageLimit}
                    onChange={(e) => setStorageLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Maximum number of uploads allowed. Use 9999 for unlimited</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="priceMo">Price (Monthly)</Label>
                  <Input
                    id="priceMo"
                    type="number"
                    placeholder="0.00"
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceYr">Price (Yearly)</Label>
                  <Input
                    id="priceYr"
                    type="number"
                    placeholder="0.00"
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="usd">USD</option>
                    <option value="eur">EUR</option>
                    <option value="gbp">GBP</option>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className={`p-4 rounded-lg flex gap-3 border mt-4 ${
            isCustomPlan
              ? 'bg-blue-500/5 border-blue-500/20'
              : 'bg-primary/5 border-primary/10'
          }`}>
            <Info className={`w-5 h-5 shrink-0 ${
              isCustomPlan ? 'text-blue-500' : 'text-primary'
            }`} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isCustomPlan
                ? 'Custom plans are stored in the database and can only be assigned to users manually by administrators. They do not create Stripe products or prices.'
                : 'Creating a plan here will automatically create the Product and Prices in your connected Stripe account via the Stripe API.'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePlan}
              disabled={createPlanMutation.isPending}
            >
              {createPlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {isCustomPlan ? 'Create Custom Plan' : 'Create & Sync'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedUserId("");
          setSelectedPlanToAssign(null);
        }}
        title={`Assign Plan: ${selectedPlanToAssign?.name || ''}`}
      >
        <div className="space-y-4 pt-4">
          <div className="bg-blue-500/5 p-3 border border-blue-500/20 rounded-lg">
            <div className="text-sm font-semibold mb-1">Plan Details</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><span className="font-medium">Label:</span> {selectedPlanToAssign?.label}</div>
              <div><span className="font-medium">Sites:</span> {selectedPlanToAssign?.sites_limit}</div>
              <div><span className="font-medium">Library:</span> {selectedPlanToAssign?.library_limit}</div>
              <div><span className="font-medium">Upload:</span> {selectedPlanToAssign?.storage_limit}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userSelect">Select User</Label>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <Select
                id="userSelect"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Choose a user...</option>
                {usersData?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email}) - {user.role}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="bg-amber-500/5 p-3 border border-amber-500/20 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Assigning this plan will set the user's label to <span className="font-semibold text-foreground">{selectedPlanToAssign?.label}</span>. This will replace any existing labels (except 'admin').
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedUserId("");
                setSelectedPlanToAssign(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAssignPlan}
              disabled={assignPlanMutation.isPending || !selectedUserId}
            >
              {assignPlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Assign Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPlanToEdit(null);
          resetForm();
        }}
        title={`Edit Plan: ${selectedPlanToEdit?.name || ''}`}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="editPlanName">Plan Name</Label>
              <Input
                id="editPlanName"
                placeholder="e.g. Enterprise"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="editPlanDesc">Description</Label>
              <Input
                id="editPlanDesc"
                placeholder="Briefly explain the plan's focus"
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="editLocalLabel">
                User Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editLocalLabel"
                placeholder="e.g. premium_partner"
                value={customPlanLabel}
                onChange={(e) => setCustomPlanLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This label will be applied to users assigned this plan
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSitesLimit">
                Sites Limit <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editSitesLimit"
                type="number"
                placeholder="e.g. 10 (use 9999 for unlimited)"
                value={sitesLimit}
                onChange={(e) => setSitesLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use 9999 for unlimited</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editLibraryLimit">
                Library Limit <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editLibraryLimit"
                type="number"
                placeholder="e.g. 50 (use 9999 for unlimited)"
                value={libraryLimit}
                onChange={(e) => setLibraryLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use 9999 for unlimited</p>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="editStorageLimit">
                Upload Limit (MB) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editStorageLimit"
                type="number"
                placeholder="e.g. 100 (use 9999 for unlimited)"
                value={storageLimit}
                onChange={(e) => setStorageLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Maximum upload size in MB. Use 9999 for unlimited</p>
            </div>
          </div>

          <div className="bg-amber-500/5 p-3 border border-amber-500/20 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Updating the label will not automatically update existing users with this plan. You may need to reassign the plan to affected users.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedPlanToEdit(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditPlan}
              disabled={editPlanMutation.isPending}
            >
              {editPlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Update Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlanManagementPage;
