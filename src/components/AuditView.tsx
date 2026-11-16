import React, { useMemo, useState } from 'react';
import { History, Search, X } from 'lucide-react';
import type { AuditLogRecord } from '../types';
import { AUDIT_ACTION_LABELS, formatTimestamp } from '../utils/formatters';

interface AuditViewProps {
  logs: AuditLogRecord[];
  loading: boolean;
}

type ActionGroup = 'todas' | 'vendas' | 'estoque' | 'sistema';

export function AuditView({ logs, loading }: AuditViewProps) {
  const [group, setGroup] = useState<ActionGroup>('todas');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (group === 'vendas' && log.action !== 'REGISTER_SALE') return false;
      if (
        group === 'estoque' &&
        ![
          'CREATE_DEVICE',
          'UPDATE_DEVICE',
          'DELETE_DEVICE',
          'RESERVE_DEVICE',
          'RELEASE_RESERVATION',
        ].includes(log.action)
      ) {
        return false;
      }
      if (
        group === 'sistema' &&
        !['CREATE_USER', 'UPDATE_USER_STATUS', 'UPDATE_SETTINGS'].includes(log.action)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.summary.toLowerCase().includes(q) ||
        AUDIT_ACTION_LABELS[log.action].toLowerCase().includes(q)
      );
    });
  }, [logs, group, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
          Log de Auditoria
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Registro cronológico imutável de vendas, estoque e controle de acessos
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-2.5 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por usuário ou evento..."
            className="w-full min-h-[46px] pl-10 pr-11 rounded-xl bg-[#121216] border border-[#26262E] text-white placeholder:text-zinc-500 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 bg-[#121216] border border-[#26262E] rounded-xl md:w-auto shrink-0">
          {(
            [
              { id: 'todas', label: 'Tudo' },
              { id: 'vendas', label: 'Vendas' },
              { id: 'estoque', label: 'Estoque' },
              { id: 'sistema', label: 'Sistema' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGroup(item.id)}
              className={`min-h-[40px] px-1.5 sm:px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                group === item.id ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 bg-[#121216] border border-[#26262E] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-[#121216] border border-[#26262E] rounded-2xl p-8 text-center space-y-2">
          <History className="w-6 h-6 text-[#D4AF37] mx-auto" />
          <p className="font-display font-semibold text-white text-base">
            Nenhum evento registrado
          </p>
          <p className="text-xs text-zinc-400">
            Todas as movimentações da loja aparecerão aqui em tempo real.
          </p>
        </div>
      ) : (
        <div className="bg-[#121216] border border-[#26262E] rounded-2xl divide-y divide-[#202028]">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-3.5 sm:p-4 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                  <span
                    className={`font-semibold ${
                      log.action === 'REGISTER_SALE'
                        ? 'text-[#D4AF37]'
                        : log.action === 'DELETE_DEVICE' || log.action === 'UPDATE_USER_STATUS'
                          ? 'text-amber-300'
                          : 'text-white'
                    }`}
                  >
                    {AUDIT_ACTION_LABELS[log.action]}
                  </span>
                  <span className="text-zinc-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-zinc-300 font-medium">{log.actorName}</span>
                  <span className="text-zinc-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-zinc-400">
                    {log.actorRole === 'admin' ? 'Admin' : 'Vendedor'}
                  </span>
                </div>

                <span className="font-mono-tabular text-[11px] sm:text-xs text-zinc-500 whitespace-nowrap">
                  {formatTimestamp(log.createdAt, true)}
                </span>
              </div>

              <p className="text-sm text-zinc-200 leading-relaxed break-words">{log.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
