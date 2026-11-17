import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F8FB] text-[#0B1D3A] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#D7E2F0] rounded-xl p-8 space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#0B1D3A]">
              Unable to complete request
            </h1>
            <p className="text-sm text-[#3E5270] leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#0B1D3A] text-white text-sm font-medium rounded-lg hover:bg-[#152E58] transition-smooth"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
