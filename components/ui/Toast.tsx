
import React, { useEffect } from 'react';
import { useToast, ToastProps } from '../../contexts/ToastContext';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const Toast: React.FC<ToastProps> = ({ id, title, description, variant = 'default' }) => {
  const { dismiss } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss(id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [id, dismiss]);

  const baseClasses = 'relative w-full max-w-sm p-4 pr-10 overflow-hidden rounded-lg shadow-lg border';
  
  const variantClasses = {
    default: 'bg-card border-border text-foreground',
    destructive: 'bg-destructive/10 border-destructive/50 text-destructive',
    success: 'bg-green-100 border-green-300 text-green-800',
  };
  
  const Icon = {
      destructive: <AlertTriangle className="w-5 h-5" />,
      success: <CheckCircle className="w-5 h-5" />,
      default: <Info className="w-5 h-5" />,
  }[variant]

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
        <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
                {Icon}
            </div>
            <div className="ml-3 flex-1">
                <p className="text-sm font-semibold">{title}</p>
                {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
            </div>
             <button
                onClick={() => dismiss(id)}
                className="absolute top-2 right-2 p-1 rounded-md opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    </div>
  );
};

export default Toast;
