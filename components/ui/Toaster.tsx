
import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import Toast from './Toast';

const Toaster: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-0 right-0 p-4 sm:p-6 space-y-2 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toaster;
