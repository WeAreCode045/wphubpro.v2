
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DesignSystemProvider } from './components/ui/DesignSystem.tsx';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <DesignSystemProvider>
    <App />
  </DesignSystemProvider>
);
