import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert, UserCheck, UserPlus, UserX, X } from 'lucide-react';
import { SCHEMA_LIMITS, type StaffDirectoryMember, type UserRole } from '../types';
import { createStaffUser, updateStaffAccess } from '../services/storeService';
import { useAuth } from '../contexts/AuthContext';
import { formatShortDate, formatTitleName } from '../utils/formatters';

interface TeamViewProps {
  staff: StaffDirectoryMember[];
  loading: boolean;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function TeamView({ staff, loading, onNotify }: TeamViewProps) {
  const { profile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('vendedor');
  const [creating, setCreating] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [authProviderNotice, setAuthProviderNotice] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, creating]);

  if (!profile || profile.role !== 'admin') return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < SCHEMA_LIMITS.DISPLAY_NAME_MIN) {
      onNotify('error', 'Informe o nome completo do vendedor.');
      return;
    }
    if (username.trim().length < SCHEMA_LIMITS.USERNAME_MIN) {
      onNotify('error', 'O usuário precisa ter pelo menos 3 caracteres.');
      return;
    }
    if (password.length < 6) {
      onNotify('error', 'A senha inicial precisa ter no mínimo 6 caracteres.');
      return;
    }

    setCreating(true);
    setAuthProviderNotice(false);
    try {
      const formattedName = formatTitleName(displayName);
      await createStaffUser(
        {
          displayName: formattedName,
          username: username.trim(),
          password,
          role,
        },
        {
          uid: profile.uid,
          displayName: profile.displayName,
          role: profile.role,
        }
      );
      onNotify('success', `Acesso criado para ${formattedName}.`);
      setDisplayName('');
      setUsername('');
      setPassword('');
      setRole('vendedor');
      setModalOpen(false);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/email-already-in-use') {
        onNotify('error', 'Este nome de usuário já está em uso. Escolha outro.');
      } else if (code === 'auth/operation-not-allowed') {
        setAuthProviderNotice(true);
        onNotify(
          'error',
          'Ative o provedor E-mail/Senha no Console do Firebase Authentication para criar vendedores.'
        );
      } else if (code === 'auth/weak-password') {
        onNotify('error', 'A senha é muito fraca. Use ao menos 6 caracteres.');
      } else {
        onNotify('error', 'Não foi possível criar o usuário. Tente novamente.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (member: StaffDirectoryMember) => {
    if (member.uid === profile.uid) {
      onNotify('info', 'Você não pode bloquear o seu próprio acesso.');
      return;
    }
    setUpdatingUid(member.uid);
    try {
      await updateStaffAccess(
        member,
        { active: !member.active, role: member.role },
        { uid: profile.uid, displayName: profile.displayName, role: profile.role }
      );
      onNotify(
        'success',
        `${member.displayName} ${!member.active ? 'reativado' : 'bloqueado'} com sucesso.`
      );
    } catch {
      onNotify('error', 'Não foi possível atualizar o status de acesso.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleToggleRole = async (member: StaffDirectoryMember) => {
    if (member.uid === profile.uid) {
      onNotify('info', 'Você não pode alterar o próprio perfil aqui.');
      return;
    }
    const nextRole: UserRole = member.role === 'admin' ? 'vendedor' : 'admin';
    setUpdatingUid(member.uid);
    try {
      await updateStaffAccess(
        member,
        { active: member.active, role: nextRole },
        { uid: profile.uid, displayName: profile.displayName, role: profile.role }
      );
      onNotify(
        'success',
        `Perfil de ${member.displayName} alterado para ${
          nextRole === 'admin' ? 'Administrador' : 'Vendedor'
        }.`
      );
    } catch {
      onNotify('error', 'Não foi possível alterar o perfil do usuário.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const activeCount = staff.filter((m) => m.active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Equipe e Controle de Acesso
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {activeCount} usuários ativos · {staff.length} cadastrados
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Novo Vendedor
        </button>
      </div>

      {authProviderNotice && (
        <div className="rounded-2xl bg-[#1C180E] border border-[#D4AF37]/40 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-200 space-y-1 leading-relaxed">
            <p className="font-semibold text-[#D4AF37]">
              Ação necessária no Console do Firebase
            </p>
            <p>
              Para criar contas com usuário e senha, acesse o Console do Firebase do projeto, abra{' '}
              <strong>Authentication &gt; Sign-in method</strong> e ative o provedor{' '}
              <strong>E-mail/senha</strong>.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 bg-[#121216] border border-[#26262E] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {staff.map((member) => {
            const isSelf = member.uid === profile.uid;
            const isBusy = updatingUid === member.uid;

            return (
              <div
                key={member.uid}
                className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-semibold text-base text-white truncate">
                        {formatTitleName(member.displayName)}
                      </h2>
                      {isSelf && (
                        <span className="text-xs text-[#D4AF37] font-medium whitespace-nowrap">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 font-mono-tabular mt-0.5">
                      @{member.username}
                      <span className="text-zinc-600 mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-sans">
                        {member.role === 'admin' ? 'Administrador' : 'Vendedor'}
                      </span>
                      <span className="text-zinc-600 mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span className={member.active ? 'text-emerald-400' : 'text-red-400'}>
                        {member.active ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </p>
                  </div>

                  <span className="text-xs text-zinc-500 font-mono-tabular whitespace-nowrap">
                    {formatShortDate(member.updatedAt)}
                  </span>
                </div>

                {!isSelf && (
                  <div className="pt-3 border-t border-[#202028] grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleRole(member)}
                      className="min-h-[44px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap"
                    >
                      {member.role === 'admin' ? 'Tornar Vendedor' : 'Tornar Admin'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleActive(member)}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                        member.active
                          ? 'bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-900/50'
                          : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-900/50'
                      }`}
                    >
                      {member.active ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          Bloquear
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          Reativar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Bottom Sheet: Create Seller Account */}
      {modalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
        >
          <div className="w-full sm:max-w-md bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
              <h2 id="create-user-title" className="font-display text-lg font-bold text-white">
                Criar Acesso de Usuário
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="staff-name" className="block text-xs font-medium text-zinc-400">
                    Nome Completo
                  </label>
                  <input
                    id="staff-name"
                    type="text"
                    autoCapitalize="words"
                    maxLength={SCHEMA_LIMITS.DISPLAY_NAME_MAX}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => setDisplayName((prev) => formatTitleName(prev))}
                    placeholder="Ex: Lucas Ferreira"
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="staff-username" className="block text-xs font-medium text-zinc-400">
                    Usuário de Login
                  </label>
                  <input
                    id="staff-username"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    maxLength={SCHEMA_LIMITS.USERNAME_MAX}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: lucas.vendas"
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="staff-password" className="block text-xs font-medium text-zinc-400">
                    Senha Inicial (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full min-h-[48px] pl-10 pr-12 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                      required
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

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">Perfil de Acesso</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#09090B] border border-[#26262E] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRole('vendedor')}
                      className={`min-h-[44px] rounded-lg text-xs font-semibold transition-colors ${
                        role === 'vendedor'
                          ? 'bg-white text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Vendedor
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`min-h-[44px] rounded-lg text-xs font-semibold transition-colors ${
                        role === 'admin'
                          ? 'bg-[#D4AF37] text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Administrador
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-5 py-3.5 pb-safe border-t border-[#26262E] bg-[#121216] flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 font-semibold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-[1.5] min-h-[48px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-60 text-black font-semibold text-sm transition-colors"
                >
                  {creating ? 'Criando...' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
