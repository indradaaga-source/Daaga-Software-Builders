import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { StudioProvider } from './context/StudioContext';
import { PaidOrdersApp } from './PaidOrdersApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <StudioProvider>
          <PaidOrdersApp />
        </StudioProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
