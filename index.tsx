
import React from 'react';
import ReactDOM from 'react-dom/client';
// Preline: interactive UI utilities (Tailwind plugin + JS behaviors)
// TypeScript: the package has no types bundled; ignore the next import for TS.
// @ts-ignore
import 'preline';
import { DesignSystemProvider } from './components/ui/DesignSystem';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DesignSystemProvider>
      <App />
    </DesignSystemProvider>
  </React.StrictMode>
);
