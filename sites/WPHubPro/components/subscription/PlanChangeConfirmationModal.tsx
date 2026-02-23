import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useSubscription } from '../../hooks/useSubscription';
import { functions } from '../../services/appwrite';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Calendar, CreditCard } from 'lucide-react';
import type { PlanChangeType, StripeProrationPreview } from '../../types';

interface PlanChangeConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (priceId: string, type: PlanChangeType) => void;
    targetPriceId: string;
    targetPlanName: string;
    type: PlanChangeType;
}

const PlanChangeConfirmationModal: React.FC<PlanChangeConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    targetPriceId,
    targetPlanName,
    type
}) => {
    const { data: subscription } = useSubscription();
    const [previewData, setPreviewData] = useState<StripeProrationPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && type === 'upgrade' && subscription?.stripeSubscriptionId) {
            fetchPreview();
        } else {
            setPreviewData(null);
            setError(null);
        }
    }, [isOpen, targetPriceId, type]);

    const fetchPreview = async () => {
        setLoading(true);
        setError(null);
        try {
            const execution = await functions.createExecution(
                'stripe-preview-proration',
                JSON.stringify({ 
                    subscriptionId: subscription?.stripeSubscriptionId,
                    newPriceId: targetPriceId 
                }),
                false
            );

            if (execution.responseStatusCode >= 400) {
                throw new Error('Failed to calculate proration');
            }

            const data = JSON.parse(execution.responseBody);
            setPreviewData(data);
        } catch (e: unknown) {
            const err = e as { message?: string };
            console.error('Preview error:', e);
            setError(err?.message || 'Could not calculate proration amount');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (type !== 'same') {
            onConfirm(targetPriceId, type);
        }
    };

    const currencySymbol = (currency: string) => {
        return currency.toUpperCase() === 'EUR' ? '€' : '$';
    };

    const formatAmount = (amount: number, currency: string) => {
        return `${currencySymbol(currency)}${(amount / 100).toFixed(2)}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={type === 'upgrade' ? 'Confirm Upgrade' : 'Confirm Downgrade'}>
            <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className={`p-2 rounded-full ${type === 'upgrade' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {type === 'upgrade' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">
                            {type === 'upgrade' ? 'Upgrading Plan' : 'Downgrading Plan'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            You are changing your plan from <span className="font-bold">{subscription?.planId}</span> to <span className="font-bold">{targetPlanName}</span>.
                        </p>
                    </div>
                </div>

                {type === 'downgrade' && (
                    <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-orange-700 font-medium">
                            <Calendar className="w-4 h-4" />
                            <span>Effective Date</span>
                        </div>
                        <p className="text-sm text-orange-800">
                            Your plan will be downgraded to the <strong>{targetPlanName}</strong> plan on: <strong>{new Date((subscription?.currentPeriodEnd || 0) * 1000).toLocaleDateString()}</strong>.
                        </p>
                        <p className="text-xs text-orange-700 mt-2">
                            You will retain your current plan features until the end of the billing period.
                        </p>
                    </div>
                )}

                {type === 'upgrade' && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        ) : previewData ? (
                            <div className="p-4 border border-green-200 bg-green-50 rounded-lg space-y-3">
                                <div className="flex items-center gap-2 text-green-700 font-medium">
                                    <CreditCard className="w-4 h-4" />
                                    <span>Prorated Invoice</span>
                                </div>
                                <p className="text-sm text-green-800">
                                    You will be invoiced <strong>{formatAmount(previewData.amountDue, previewData.currency)}</strong> for the upgrade to <strong>{targetPlanName}</strong> covering the remaining period till: <strong>{new Date((subscription?.currentPeriodEnd || 0) * 1000).toLocaleDateString()}</strong>.
                                </p>
                                <p className="text-xs text-green-700 border-t border-green-200 pt-2 mt-2">
                                    Your plan costs on your next billing period will be determined by the new plan rate.
                                </p>
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={loading || (type === 'upgrade' && !previewData && !error)}
                        className={type === 'downgrade' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
                    >
                        {type === 'upgrade' ? 'Confirm & Pay' : 'Confirm Downgrade'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default PlanChangeConfirmationModal;
