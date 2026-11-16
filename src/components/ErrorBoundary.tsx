import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        readable = parsed.error;
      }
    } catch {
      // Non-JSON error message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#121216] border border-[#26262E] rounded-2xl p-6 space-y-4">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-white">
                Erro de permissão ou conexão
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Não foi possível concluir a operação solicitada no banco de dados.
              </p>
              {this.state.message && (
                <p className="text-xs font-mono-tabular text-red-300 bg-red-950/30 border border-red-900/40 rounded-lg p-3 break-words">
                  {this.state.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Recarregar aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
