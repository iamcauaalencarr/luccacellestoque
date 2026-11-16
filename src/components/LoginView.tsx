import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, ShieldCheck, Smartphone, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginView() {
  const { signInWithCredentials, signInWithGoogle, accessDeniedReason, signOut, firebaseUser } =
    useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!username.trim() || !password) {
      setErrorMsg('Informe usuário e senha para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      await signInWithCredentials(username, password);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setErrorMsg('Usuário ou senha incorretos. Verifique com o administrador.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'O login por E-mail/Senha precisa estar ativado no console do Firebase Authentication (Sign-in method > E-mail/senha).'
        );
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.');
      } else {
        setErrorMsg('Não foi possível entrar agora. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Falha ao autenticar com o Google. Verifique se pop-ups estão liberados.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  if (firebaseUser && accessDeniedReason) {
    return (
      <div className="min-h-dvh bg-[#09090B] text-white flex items-center justify-center p-4 pt-safe pb-safe">
        <div className="w-full max-w-md bg-[#121216] border border-[#26262E] rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">
              {accessDeniedReason === 'inactive' ? 'Acesso desativado' : 'Conta sem acesso liberado'}
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {accessDeniedReason === 'inactive'
                ? 'Seu acesso à Lucca Cell foi bloqueado pelo administrador. Solicite a reativação para continuar operando.'
                : 'Esta conta ainda não foi cadastrada na equipe da Lucca Cell. Entre com o usuário e senha criados pelo administrador.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-sm transition-colors"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#09090B] text-white flex flex-col items-center justify-center px-4 py-6 pt-safe pb-safe">
      <div className="w-full max-w-md space-y-6">
        {/* Direct Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#121216] border border-[#26262E] flex items-center justify-center text-[#D4AF37]">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Lucca <span className="text-[#D4AF37]">Cell</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Entre com seu usuário ou acesso administrativo
            </p>
          </div>
        </div>

        {/* Focused Login Card */}
        <div className="bg-[#121216] border border-[#26262E] rounded-3xl p-5 sm:p-7 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl bg-red-950/40 border border-red-800/60 px-4 py-3 text-sm text-red-200 leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="block text-xs sm:text-sm font-medium text-zinc-200">
                Usuário
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: lucas.vendas"
                  className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-500 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs sm:text-sm font-medium text-zinc-200">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[48px] pl-10 pr-12 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-500 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="w-full min-h-[50px] px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-60 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Entrando...' : 'Entrar com Usuário'}
            </button>
          </form>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-[#26262E]" />
            <span className="shrink-0 px-3 text-xs text-zinc-500">ou acesso administrativo</span>
            <div className="flex-grow border-t border-[#26262E]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting || googleLoading}
            className="w-full min-h-[50px] px-5 py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-60 text-black font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors active:scale-[0.99]"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            {googleLoading ? 'Conectando...' : 'Entrar como Administrador (Google)'}
          </button>
        </div>
      </div>
    </div>
  );
}
