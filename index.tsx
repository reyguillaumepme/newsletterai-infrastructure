import React, { Suspense, Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertTriangle, RefreshCcw, Terminal } from 'lucide-react';

// Error Boundary personnalisé pour simuler les warnings de dev et capturer les erreurs #525
class GlobalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("CRITICAL UI ERROR:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-red-100 overflow-hidden">
            <div className="p-8 bg-red-50 border-b border-red-100 flex items-center gap-4">
              <div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase text-red-900 tracking-tight">Erreur de Rendu Critique</h1>
                <p className="text-red-700 text-xs font-bold uppercase tracking-widest opacity-70">Infrastructure IA Interrompue</p>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto border border-gray-800 shadow-inner">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <Terminal size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Diagnostic Technique</span>
                </div>
                <p className="text-red-400 font-mono text-xs mb-4">{this.state.error?.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-gray-500 font-mono text-[10px] leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => window.location.reload()} 
                  className="flex-1 bg-gray-950 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
                >
                  <RefreshCcw size={16} /> Recharger l'Application
                </button>
                <button 
                  onClick={() => window.location.href = '#/dashboard'} 
                  className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Retour au Dashboard
                </button>
              </div>
              
              <p className="text-center text-[10px] text-gray-400 font-medium">
                Conseil : Si l'erreur persiste, vérifiez que vos actions sont enveloppées dans <code>startTransition</code>.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <GlobalErrorBoundary>
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Initialisation Cloud...</p>
        </div>
      </div>
    }>
      <App />
    </Suspense>
  </GlobalErrorBoundary>
);