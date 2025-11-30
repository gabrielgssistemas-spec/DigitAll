
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { RegistroPonto } from '../types';
import { CheckCircle, XCircle, AlertCircle, Calendar, Clock, MapPin, User, CheckSquare } from 'lucide-react';

export const AutorizacaoPonto: React.FC = () => {
  const [pendingLogs, setPendingLogs] = useState<RegistroPonto[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allPontos = StorageService.getPontos();
    // Filter for 'Pendente' status
    const pending = allPontos.filter(p => p.status === 'Pendente');
    // Sort oldest first (FIFO)
    setPendingLogs(pending.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
  };

  const handleApprove = (log: RegistroPonto) => {
    if (!confirm('Confirmar autorização deste registro?')) return;

    try {
        // 1. Approve the Justification Record (Changes Pending to Fechado)
        const approvedLog = { 
            ...log, 
            status: 'Fechado' as const, 
            validadoPor: 'Gestor' 
        };
        StorageService.updatePonto(approvedLog);

        // 2. If it's an Exit linked to an Entry, ensure Entry is closed
        if (log.relatedId && log.tipo === 'SAIDA') {
            const allPontos = StorageService.getPontos();
            const entryLog = allPontos.find(p => p.id === log.relatedId);
            
            // Only update if found and not already closed
            if (entryLog && entryLog.status !== 'Fechado') {
                const updatedEntry = { ...entryLog, status: 'Fechado' as const };
                StorageService.updatePonto(updatedEntry);
            }
        }

        alert('Registro autorizado com sucesso!');
        loadData();
    } catch (error) {
        console.error("Erro ao autorizar:", error);
        alert("Erro ao processar autorização.");
    }
  };

  const handleReject = (log: RegistroPonto) => {
    const reason = prompt("Motivo da rejeição (Opcional):");
    if (reason === null) return; // Cancelled by user

    try {
        // Update to Rejected
        const updatedLog = { 
            ...log, 
            status: 'Rejeitado' as const, 
            observacao: `Rejeitado pelo Gestor: ${reason || 'Sem motivo'}` 
        };
        StorageService.updatePonto(updatedLog);
        
        alert('Registro recusado.');
        loadData();
    } catch (error) {
        console.error("Erro ao rejeitar:", error);
        alert("Erro ao processar rejeição.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-amber-100 p-2 rounded-full">
            <CheckSquare className="h-8 w-8 text-amber-600" />
        </div>
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Justificativa de Plantão</h2>
           <p className="text-gray-500">Gerencie as justificativas de horários enviadas pelos cooperados</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {pendingLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <CheckCircle className="h-16 w-16 mb-4 text-green-100" />
                <span className="text-lg font-medium text-gray-600">Tudo em dia!</span>
                <span className="text-sm">Nenhuma solicitação pendente de autorização.</span>
            </div>
        ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Data Solicitação</th>
                    <th className="px-6 py-4">Cooperado</th>
                    <th className="px-6 py-4">Local</th>
                    <th className="px-6 py-4">Registro Justificado</th>
                    <th className="px-6 py-4">Motivo</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-amber-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs">
                            <span className="font-bold text-gray-800">
                                {log.justificativa?.dataSolicitacao ? new Date(log.justificativa.dataSolicitacao).toLocaleDateString() : '-'}
                            </span>
                            <span className="text-gray-400">
                                {log.justificativa?.dataSolicitacao ? new Date(log.justificativa.dataSolicitacao).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}
                            </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{log.cooperadoNome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs" title={log.local}>
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="truncate max-w-[150px]">{log.local.split(' - ')[1] || log.local}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-amber-600 flex items-center gap-1">
                                {log.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                                <Clock className="h-3 w-3" />
                            </span>
                            <span className="text-sm font-mono text-gray-800">
                                {new Date(log.timestamp).toLocaleDateString()} - {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 w-fit">
                                {log.justificativa?.motivo || 'Não informado'}
                            </span>
                            {log.justificativa?.descricao && (
                                <span className="text-xs text-gray-500 italic truncate max-w-[200px]" title={log.justificativa.descricao}>
                                    "{log.justificativa.descricao}"
                                </span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleReject(log)}
                                className="p-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
                                title="Rejeitar"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                            <button 
                                onClick={() => handleApprove(log)}
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium text-sm"
                                title="Autorizar"
                            >
                                <CheckCircle className="h-4 w-4" />
                                Autorizar
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
      </div>
    </div>
  );
};
