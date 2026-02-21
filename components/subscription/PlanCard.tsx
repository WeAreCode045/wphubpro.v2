import React from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Check } from 'lucide-react';
import type { StripePlan } from '../../hooks/useStripe';

type BillingInterval = 'monthly' | 'yearly';

interface PlanCardProps {
    plan: StripePlan;
    billingInterval: BillingInterval;
    onSubscribe: (priceId: string) => void;
    isLoading: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, billingInterval, onSubscribe, isLoading }) => {
    const price = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const priceId = billingInterval === 'monthly' ? plan.monthlyPriceId : plan.yearlyPriceId;
    const features = plan.metadata.filter(m => m.key.startsWith('feature_')).map(m => m.value);
    const interval = billingInterval === 'monthly' ? '/month' : '/year';
    
    // Calculate monthly equivalent for yearly plans
    const monthlyEquivalent = billingInterval === 'yearly' ? (price / 12).toFixed(2) : null;
    
    // Calculate savings percentage
    const savingsPercent = plan.monthlyPrice && plan.yearlyPrice 
        ? Math.round((1 - (plan.yearlyPrice / 12) / plan.monthlyPrice) * 100)
        : 0;
    
    const currencySymbol = plan.currency === 'eur' ? '€' : '$';

    return (
        <Card className="flex flex-col relative">
            {billingInterval === 'yearly' && savingsPercent > 0 && (
                <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Save {savingsPercent}%
                </div>
            )}
            <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="mb-6">
                    <div className="flex items-baseline">
                        <span className="text-4xl font-bold">{currencySymbol}{price}</span>
                        <span className="text-muted-foreground ml-2">{interval}</span>
                    </div>
                    {monthlyEquivalent && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {currencySymbol}{monthlyEquivalent}/month billed annually
                        </p>
                    )}
                </div>
                <ul className="space-y-3 mb-8">
                    {features.length > 0 ? features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                        </li>
                    )) : (
                        <li className="text-sm text-muted-foreground">No features defined</li>
                    )}
                </ul>
            </CardContent>
            <div className="p-6 pt-0">
                 <Button 
                    className="w-full" 
                    onClick={() => priceId && onSubscribe(priceId)}
                    disabled={isLoading || !priceId}
                >
                    {isLoading ? 'Redirecting...' : !priceId ? 'Unavailable' : 'Subscribe'}
                </Button>
            </div>
        </Card>
    );
};

export default PlanCard;
