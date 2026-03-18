import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
          <div className="max-w-lg text-center space-y-4">
            <h1 className="text-xl font-bold text-red-600">Something went wrong</h1>
            <pre className="text-left text-sm bg-red-50 p-4 rounded overflow-auto max-h-48">
              {this.state.error?.toString?.() || 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.href = '/choose_templates'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg"
            >
              Back to templates
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
