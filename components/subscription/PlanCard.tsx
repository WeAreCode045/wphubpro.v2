import React from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Check } from 'lucide-react';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    priceId: string;
    features: string[];
}

interface PlanCardProps {
    plan: Plan;
    onSubscribe: (priceId: string) => void;
    isLoading: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onSubscribe, isLoading }) => {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <div className="p-6 pt-0">
                 <Button 
                    className="w-full" 
                    onClick={() => onSubscribe(plan.priceId)}
                    disabled={isLoading}
                >
                    {isLoading ? 'Redirecting...' : 'Subscribe'}
                </Button>
            </div>
        </Card>
    );
};

export default PlanCard;
