import React from "react";
import {
  Users,
  CreditCard,
  Activity,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { databases, functions } from "../../services/appwrite.ts";
import { Query } from "appwrite";
import StatCard from "../../components/dashboard/StatCard.tsx";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/Card.tsx";
import Table from "../../components/ui/Table.tsx";
import Button from "../../components/ui/Button.tsx";

const AdminDashboardPage: React.FC = () => {
  // Fetch real admin statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      // Fetch total users count
      const usersResponse = await databases.listDocuments(
        "platform_db",
        "subscriptions",
        [],
      );
      const totalUsers = usersResponse.total;

      // Fetch active subscriptions
      const activeSubsResponse = await databases.listDocuments(
        "platform_db",
        "subscriptions",
        [Query.equal("status", "active")],
      );
      const activeSubscriptions = activeSubsResponse.total;

      // Calculate MRR (this is simplified - in production you'd sum actual subscription values)
      const mrr = activeSubscriptions * 29; // Assuming average $29/month

      // Calculate churn rate (simplified)
      const churnRate =
        totalUsers > 0
          ? (((totalUsers - activeSubscriptions) / totalUsers) * 100).toFixed(1)
          : 0;

      return [
        {
          title: "Total Users",
          value: totalUsers.toString(),
          icon: Users,
          change: "",
          changeType: "increase",
        },
        {
          title: "Active Subscriptions",
          value: activeSubscriptions.toString(),
          icon: CreditCard,
          change: "",
          changeType: "increase",
        },
        {
          title: "MRR",
          value: `$${mrr.toLocaleString()}`,
          icon: DollarSign,
          change: "",
          changeType: "increase",
        },
        {
          title: "Churn Rate",
          value: `${churnRate}%`,
          icon: Activity,
          change: "",
          changeType: "decrease",
        },
      ];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch recent orders from Stripe function
  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["admin", "recent-orders"],
    queryFn: async () => {
      try {
        const result = await functions.createExecution(
          "stripe-list-payment-intents",
          JSON.stringify({ limit: 10 }),
        );
        if (result.responseStatusCode >= 400) {
          console.error("Failed to fetch orders");
          return [];
        }
        const data = JSON.parse(result.responseBody);
        return data.orders || [];
      } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
      }
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Calculate plan distribution from subscriptions
  const { data: planDistribution = [], isLoading: plansLoading } = useQuery({
    queryKey: ["admin", "plan-distribution"],
    queryFn: async () => {
      const subsResponse = await databases.listDocuments(
        "platform_db",
        "subscriptions",
        [Query.equal("status", "active")],
      );

      const planCounts: { [key: string]: number } = {};
      subsResponse.documents.forEach((sub: any) => {
        const planId = sub.plan_id || "Free Tier";
        planCounts[planId] = (planCounts[planId] || 0) + 1;
      });

      const total = subsResponse.total || 1;
      const distribution = Object.entries(planCounts).map(([label, count]) => ({
        label,
        value: Math.round((count / total) * 100),
        color: label.includes("Business")
          ? "bg-primary"
          : label.includes("Pro")
            ? "bg-blue-500"
            : label.includes("Starter")
              ? "bg-orange-500"
              : "bg-muted",
      }));

      return distribution;
    },
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = statsLoading || ordersLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your platform performance and subscriptions.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats?.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            changeType={stat.changeType as "increase" | "decrease"}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Latest transactions across the platform.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>No recent orders found.</p>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Order ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Plan
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.slice(0, 5).map((order: any) => (
                    <tr
                      key={order.id}
                      className="border-t border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{order.id}</td>
                      <td className="py-3 px-4">{order.customer}</td>
                      <td className="py-3 px-4">{order.plan}</td>
                      <td className="py-3 px-4 font-semibold">
                        {order.amount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === "Paid"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>
              Active subscriptions by plan type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {planDistribution.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>No active subscriptions</p>
              </div>
            ) : (
              planDistribution.map((item: any) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
