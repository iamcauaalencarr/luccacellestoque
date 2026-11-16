import React, { useEffect, useState } from 'react';
import { AtSign, Check, Sparkles, User } from 'lucide-react';
import { SCHEMA_LIMITS, type StaffDirectoryMember, type UserAccount } from '../types';
import { updateOwnProfile } from '../services/storeService';
import { formatTitleName } from '../utils/formatters';

interface GoogleUsernameModalProps {
  open: boolean;
  profile: UserAccount;
  staff: StaffDirectoryMember[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function sanitizeUsernameInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, SCHEMA_LIMITS.USERNAME_MAX);
}

export function GoogleUsernameModal({
  open,
  profile,
  staff,
  onSuccess,
  onError,
}: GoogleUsernameModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(formatTitleName(profile.displayName));
    setUsername(sanitizeUsernameInput(profile.username));
    setLocalError(null);
  }, [open, profile.displayName, profile.username]);

  if (!open) return null;

  const trimmedUsername = sanitizeUsernameInput(username);
  const isTaken =
    trimmedUsername.length >= SCHEMA_LIMITS.USERNAME_MIN &&
    staff.some(
      (m) => m.uid !== profile.uid && m.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (displayName.trim().length < SCHEMA_LIMITS.DISPLAY_NAME_MIN) {
      setLocalError('Informe seu nome completo (mínimo 2 caracteres).');
      return;
    }
    if (
      trimmedUsername.length < SCHEMA_LIMITS.USERNAME_MIN ||
      !SCHEMA_LIMITS.USERNAME_PATTERN.test(trimmedUsername)
    ) {
      setLocalError('O nome de usuário deve ter pelo menos 3 caracteres válidos.');
      return;
    }
    if (isTaken) {
      setLocalError(`O usuário @${trimmedUsername} já está em uso. Escolha outro.`);
      return;
    }

    setSaving(true);
    try {
      const saved = await updateOwnProfile(
        profile.uid,
        {
          displayName,
          username: trimmedUsername,
          usernameConfirmed: true,
        },
        staff
      );
      onSuccess(`Perfil confirmado como ${saved.displayName} (@${saved.username}).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar seu usuário.';
      setLocalError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleKeepSuggested = async () => {
    setLocalError(null);
    setSaving(true);
    try {
      const fallbackUser = sanitizeUsernameInput(profile.username);
      const saved = await updateOwnProfile(
        profile.uid,
        {
          displayName: profile.displayName,
          username: fallbackUser,
          usernameConfirmed: true,
        },
        staff
      );
      onSuccess(`Usuário @${saved.username} confirmado!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível confirmar o usuário.';
      setLocalError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-username-title"
    >
      <div className="w-full sm:max-w-md bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3" />

        <div className="px-5 pt-4 pb-3 border-b border-[#26262E] space-y-1">
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Bem-vindo via Google
            </span>
          </div>
          <h2 id="google-username-title" className="font-display text-lg font-bold text-white">
            Defina seu Nome de Usuário
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Escolha como você aparecerá nos recibos, reservas e equipe ({profile.email}).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 pb-safe space-y-4">
          {localError && (
            <div
              role="alert"
              className="rounded-xl bg-red-950/40 border border-red-800/60 px-3.5 py-2.5 text-xs text-red-200"
            >
              {localError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="google-display-name" className="block text-xs font-medium text-zinc-300">
              Nome de Exibição
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="google-display-name"
                type="text"
                autoCapitalize="words"
                maxLength={SCHEMA_LIMITS.DISPLAY_NAME_MAX}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => setDisplayName((prev) => formatTitleName(prev))}
                placeholder="Ex: Kauan Alencar"
                className="w-full min-h-[48px] pl-10 pr-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="google-username" className="block text-xs font-medium text-zinc-300">
              Nome de Usuário (@usuário)
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="google-username"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus
                maxLength={SCHEMA_LIMITS.USERNAME_MAX}
                value={username}
                onChange={(e) => {
                  setUsername(sanitizeUsernameInput(e.target.value));
                  setLocalError(null);
                }}
                placeholder="ex: kauan.lucca"
                className="w-full min-h-[48px] pl-10 pr-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              {isTaken ? (
                <span className="text-red-400">Este @usuário já está em uso por outro membro.</span>
              ) : (
                <span>
                  Apenas letras minúsculas, números, ponto (.), traço (-) ou sublinhado (_).
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={handleKeepSuggested}
              className="sm:flex-1 min-h-[46px] px-4 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 font-semibold text-xs transition-colors whitespace-nowrap"
            >
              Manter @{sanitizeUsernameInput(profile.username)}
            </button>
            <button
              type="submit"
              disabled={saving || isTaken}
              className="sm:flex-[1.4] min-h-[48px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-60 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{saving ? 'Salvando...' : 'Confirmar Usuário'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
