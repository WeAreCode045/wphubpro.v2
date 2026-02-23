import React, { useMemo } from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Check, AlertCircle } from 'lucide-react';
import type { BillingInterval, StripePlan, UsageMetrics } from '../../types';
import UsageGauge from '../dashboard/UsageGauge';

interface PlanCardProps {
    plan: StripePlan;
    billingInterval: BillingInterval;
    onSubscribe: (priceId: string) => void;
    isLoading: boolean;
    isCurrent?: boolean;
    currentUsage?: UsageMetrics;
}

const PlanCard: React.FC<PlanCardProps> = ({ 
    plan, 
    billingInterval, 
    onSubscribe, 
    isLoading, 
    isCurrent,
    currentUsage 
}) => {
    const price = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const priceId = billingInterval === 'monthly' ? plan.monthlyPriceId : plan.yearlyPriceId;
    const features = plan.metadata.filter(m => m.key.startsWith('feature_')).map(m => m.value);
    const interval = billingInterval === 'monthly' ? '/month' : '/year';
    
    // Parse limits from metadata
    const limits = useMemo(() => {
        const sites = plan.metadata.find(m => m.key === 'sites_limit' || m.key === 'site_limit')?.value;
        const library = plan.metadata.find(m => m.key === 'library_limit')?.value;
        const storage = plan.metadata.find(m => m.key === 'storage_limit')?.value;
        
        return {
            sites: sites ? parseInt(sites, 10) : 9999,
            library: library ? parseInt(library, 10) : 9999,
            storage: storage ? parseInt(storage, 10) : 9999
        };
    }, [plan.metadata]);

    // Check if usage fits in this plan
    const usageFits = useMemo(() => {
        if (!currentUsage) return true;
        return (
            currentUsage.sitesUsed <= limits.sites &&
            currentUsage.libraryUsed <= limits.library &&
            currentUsage.storageUsed <= limits.storage
        );
    }, [currentUsage, limits]);

    // Determine why it doesn't fit
    const usageConflict = useMemo(() => {
        if (!currentUsage || usageFits) return null;
        const conflicts = [];
        if (currentUsage.sitesUsed > limits.sites) conflicts.push('Sites');
        if (currentUsage.libraryUsed > limits.library) conflicts.push('Library items');
        if (currentUsage.storageUsed > limits.storage) conflicts.push('Storage uploads');
        return conflicts.join(', ');
    }, [currentUsage, limits, usageFits]);
    
    // Calculate monthly equivalent for yearly plans
    const monthlyEquivalent = billingInterval === 'yearly' ? (price / 12).toFixed(2) : null;
    
    // Calculate savings percentage
    const savingsPercent = plan.monthlyPrice && plan.yearlyPrice 
        ? Math.round((1 - (plan.yearlyPrice / 12) / plan.monthlyPrice) * 100)
        : 0;
    
    const currencySymbol = plan.currency === 'eur' ? '€' : '$';

    return (
        <Card className={`flex flex-col relative ${isCurrent ? 'ring-2 ring-primary border-primary' : ''}`}>
            {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Current Plan
                </div>
            )}
            {billingInterval === 'yearly' && savingsPercent > 0 && (
                <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Save {savingsPercent}%
                </div>
            )}
            <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="mb-6">
                    <div className="flex items-baseline">
                        <span className="text-4xl font-bold">{currencySymbol}{price}</span>
                        <span className="text-muted-foreground ml-2">{interval}</span>
                    </div>
                    {monthlyEquivalent && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {currencySymbol}{monthlyEquivalent}/month billed annually
                        </p>
                    )}
                </div>
                <ul className="space-y-2.5 mb-6">
                    {features.length > 0 ? features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-foreground/80">{feature}</span>
                        </li>
                    )) : (
                        <li className="text-sm text-muted-foreground italic">Basic features included</li>
                    )}
                </ul>

                {!usageFits && !isCurrent && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive leading-tight font-medium">
                            Cannot downgrade: Your current usage of {usageConflict} exceeds this plan's limits.
                        </p>
                    </div>
                )}

                {/* Usage visualization for this plan */}
                {currentUsage && !isCurrent && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-4 text-center">
                            How you fit in this plan
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="scale-[0.6] origin-top">
                                <UsageGauge 
                                    label="Sites" 
                                    used={currentUsage.sitesUsed} 
                                    limit={limits.sites} 
                                />
                            </div>
                            <div className="scale-[0.6] origin-top">
                                <UsageGauge 
                                    label="Library" 
                                    used={currentUsage.libraryUsed} 
                                    limit={limits.library} 
                                />
                            </div>
                            <div className="scale-[0.6] origin-top">
                                <UsageGauge 
                                    label="Uploads" 
                                    used={currentUsage.storageUsed} 
                                    limit={limits.storage} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
            <div className="p-6 pt-0">
                 <Button 
                    className="w-full" 
                    onClick={() => priceId && onSubscribe(priceId)}
                    disabled={isLoading || !priceId || isCurrent || !usageFits}
                    variant={isCurrent ? "outline" : "default"}
                >
                    {isLoading ? 'Processing...' : !priceId ? 'Unavailable' : isCurrent ? 'Current Plan' : 'Select Plan'}
                </Button>
            </div>
        </Card>
    );
};

export default PlanCard;
