import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Push crash trace explicitly to the diagnostic logs engine
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (typeof win.__addDiagnosticLog === 'function') {
        win.__addDiagnosticLog('error', `🔥 REACT COMPONENT CRASH: ${error.message || String(error)}`, {
          componentStack: errorInfo.componentStack,
          errorStack: error.stack || 'N/A'
        });
      }
    }
    
    console.error('🔥 [React Error Boundary] caught crash:', error, errorInfo);
  }

  handleCopyLogs = () => {
    if (typeof window === 'undefined') return;
    const logs = (window as any).__diagnosticLogs || [];
    const textReport = logs.map((l: any) => 
      `[${l.time}] [${l.type.toUpperCase()}] ${l.message}${l.meta ? '\n' + JSON.stringify(l.meta) : ''}`
    ).join('\n');

    try {
      navigator.clipboard.writeText(textReport);
      alert('📋 Diagnostics copied to clipboard!');
    } catch (e) {
      alert(`Could not copy automatically. Here is the stack trace:\n\n${this.state.error?.stack || 'N/A'}`);
    }
  };

  handleDownloadReport = () => {
    if (typeof window === 'undefined') return;
    const logs = (window as any).__diagnosticLogs || [];
    const textReport = logs.map((l: any) => 
      `[${l.time}] [${l.type.toUpperCase()}] ${l.message}${l.meta ? '\n' + JSON.stringify(l.meta) : ''}`
    ).join('\n');

    try {
      const blob = new Blob([textReport], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dailymart-crash-diagnostics-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to generate report file: ' + err.message);
    }
  };

  handleResetApp = () => {
    if (typeof window === 'undefined') return;
    if (confirm('Attempt to force-clear local storage/cache and reload? This resolve state loop corruptions.')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div id="react-boundary-crash" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
            {/* Glowing warning aura */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 text-2xl font-bold animate-pulse">
                ⚠️
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">Application Render Crash</h1>
                <p className="text-xs text-slate-400">React caught an unhandled component rendering boundary failure.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-red-400">Error Payload:</div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-red-300 overflow-x-auto break-all whitespace-pre-wrap max-h-48 shadow-inner">
                {this.state.error?.toString() || 'Unknown Error'}
              </div>
            </div>

            {this.state.errorInfo && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-300">Component Stack Trace:</div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-400 overflow-x-auto break-all whitespace-pre-wrap max-h-48 shadow-inner">
                  {this.state.errorInfo.componentStack}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-3">
              <button
                id="crash-btn-diagnostics"
                onClick={() => (window as any).__toggleDiagnosticPanel?.()}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
              >
                ⚡ View System Diags
              </button>
              <button
                id="crash-btn-copy"
                onClick={this.handleCopyLogs}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                📋 Copy Diagnostic Logs
              </button>
              <button
                id="crash-btn-download"
                onClick={this.handleDownloadReport}
                className="flex-grow px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
              >
                📥 Download Report
              </button>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2">
              <span>Host ID: com.swiftcart.app</span>
              <button
                id="crash-btn-reset"
                onClick={this.handleResetApp}
                className="text-red-500 hover:underline font-semibold"
              >
                Reset App Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
