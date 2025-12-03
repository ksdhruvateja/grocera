import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to monitoring service if needed
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-6">Please try refreshing the page.</p>
            <a href="/" className="px-4 py-2 bg-orange-500 text-white rounded-lg">Go Home</a>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;