import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        success: "border-green-500/50 bg-green-500/10 text-green-900 dark:text-green-100",
        warning: "border-yellow-500/50 bg-yellow-500/10 text-yellow-900 dark:text-yellow-100",
        error: "border-red-500/50 bg-red-500/10 text-red-900 dark:text-red-100",
        info: "border-blue-500/50 bg-blue-500/10 text-blue-900 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

export default Alert;