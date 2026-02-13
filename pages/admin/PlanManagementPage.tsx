import React, { useState } from 'react';
import { 
  Plus, 
  Settings2, 
  Tag, 
  Database, 
  MoreVertical,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import Modal from '../../components/ui/Modal';

interface PlanMetadata {
  key: string;
  value: string;
}

const PlanManagementPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Placeholder data
  const plans = [
    { 
      id: 'prod_RK9283', 
      name: 'Starter', 
      description: 'Ideal for small bloggers and simple sites.', 
      monthlyPrice: '12.00', 
      yearlyPrice: '120.00',
      status: 'Active',
      metadata: [
        { key: 'sites_limit', value: '1' },
        { key: 'storage_gb', value: '5' }
      ]
    },
    { 
      id: 'prod_PL0291', 
      name: 'Pro', 
      description: 'The best value for growing agencies.', 
      monthlyPrice: '29.00', 
      yearlyPrice: '290.00',
      status: 'Active',
      metadata: [
        { key: 'sites_limit', value: '5' },
        { key: 'storage_gb', value: '25' },
        { key: 'support', value: 'priority' }
      ]
    },
    { 
      id: 'prod_BS7721', 
      name: 'Business', 
      description: 'Unlimited possibilities for enterprises.', 
      monthlyPrice: '59.00', 
      yearlyPrice: '590.00',
      status: 'Active',
      metadata: [
        { key: 'sites_limit', value: '25' },
        { key: 'storage_gb', value: '100' },
        { key: 'whitelabel', value: 'true' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plan Management</h1>
          <p className="text-muted-foreground mt-1">Manage Stripe products, pricing, and platform limits.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-background">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync from Stripe
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </header>

      <div className="grid gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="overflow-hidden border-l-4 border-l-primary">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-green-500/20">
                      {plan.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {plan.id}
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mb-6 max-w-md">{plan.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase">Monthly Price</Label>
                    <div className="text-lg font-bold">${plan.monthlyPrice}<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase">Yearly Price</Label>
                    <div className="text-lg font-bold">${plan.yearlyPrice}<span className="text-xs text-muted-foreground font-normal">/yr</span></div>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase">Metadata / Limits</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {plan.metadata.map((meta) => (
                        <div key={meta.key} className="flex items-center bg-secondary border border-border rounded px-2 py-1 gap-1.5">
                          <span className="text-[10px] font-bold text-primary uppercase">{meta.key}:</span>
                          <span className="text-xs font-medium">{meta.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 p-6 flex lg:flex-col justify-center gap-2 border-t lg:border-t-0 lg:border-l border-border">
                <Button variant="outline" size="sm" className="w-full">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Stripe
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Plan Modal (Simplified) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Create New Subscription Plan"
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="planName">Product Name</Label>
              <Input id="planName" placeholder="e.g. Enterprise" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="planDesc">Description</Label>
              <Input id="planDesc" placeholder="Briefly explain the plan's focus" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceMo">Price (Monthly)</Label>
              <Input id="priceMo" type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceYr">Price (Yearly)</Label>
              <Input id="priceYr" type="number" placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label>Plan Metadata (Limits)</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add field
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="key" className="flex-1" value="sites_limit" disabled />
                <Input placeholder="value" className="flex-1" />
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground">×</Button>
              </div>
              <div className="flex gap-2">
                <Input placeholder="key" className="flex-1" value="storage_gb" disabled />
                <Input placeholder="value" className="flex-1" />
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground">×</Button>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 p-4 rounded-lg flex gap-3 border border-primary/10 mt-4">
            <Info className="w-5 h-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Creating a plan here will automatically create the Product and Prices in your connected Stripe account via the Stripe API.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsModalOpen(false)}>Create & Sync</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlanManagementPage;
