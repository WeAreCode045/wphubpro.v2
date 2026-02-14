import React from "react";
import { useToast } from "../../contexts/ToastContext";
import Toast from "./Toast";

const Toaster: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 p-4 sm:p-6 space-y-3 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toaster;
