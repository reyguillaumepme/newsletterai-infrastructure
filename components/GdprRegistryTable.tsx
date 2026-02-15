import React from 'react';
import { ComplianceLog } from '../types';
import { FileText, Download, CheckCircle, AlertTriangle, Eye } from 'lucide-react';

interface GdprRegistryTableProps {
    logs: ComplianceLog[];
    isLoading: boolean;
    onExport: () => void;
    onViewDetails: (log: ComplianceLog) => void;
}

const GdprRegistryTable: React.FC<GdprRegistryTableProps> = ({ logs, isLoading, onExport, onViewDetails }) => {
    if (isLoading) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold uppercase tracking-wider">Chargement du registre...</p>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="w-full p-12 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                    <FileText className="text-gray-300" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun enregistrement</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                    Les activités de traitement (envois de newsletter) apparaîtront ici automatiquement.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                        <FileText className="text-primary" size={24} />
                        Registre des Traitements
                    </h2>
                    <p className="text-gray-400 text-sm font-medium mt-1">
                        Historique immuable des activités pour conformité RGPD (Art. 30).
                    </p>
                </div>
                <button
                    onClick={onExport}
                    className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center gap-3 transition-all border border-gray-100"
                >
                    <Download size={18} />
                    Export CNIL (CSV)
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-wider">Activité</th>
                            <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-wider">Sujet</th>
                            <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Destinataires</th>
                            <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Conformité</th>
                            <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {logs.map((log) => {
                            let complianceStatus = 'unknown';
                            try {
                                const snapshot = JSON.parse(log.compliance_snapshot);
                                if (snapshot.overall_status === 'success') complianceStatus = 'compliant';
                                else if (snapshot.overall_status === 'warning') complianceStatus = 'warning';
                                else if (snapshot.overall_status === 'error') complianceStatus = 'error';
                            } catch (e) { }

                            return (
                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="p-6 text-sm font-bold text-gray-600">
                                        {new Date(log.sent_at).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        <span className="block text-xs text-gray-400 font-medium">
                                            {new Date(log.sent_at).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td className="p-6 text-sm font-bold text-gray-900">
                                        Envoi Newsletter
                                    </td>
                                    <td className="p-6 text-sm font-medium text-gray-600 max-w-xs truncate" title={log.subject}>
                                        {log.subject}
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                                            {log.recipient_count}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        {complianceStatus === 'compliant' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold ring-1 ring-green-100">
                                                <CheckCircle size={12} /> Conforme
                                            </span>
                                        ) : complianceStatus === 'warning' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold ring-1 ring-orange-100">
                                                <AlertTriangle size={12} /> Recommandations
                                            </span>
                                        ) : complianceStatus === 'error' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold ring-1 ring-red-100">
                                                <AlertTriangle size={12} /> Non Conforme
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="p-6 text-right">
                                        <button
                                            onClick={() => onViewDetails(log)}
                                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Voir le rapport d'audit"
                                        >
                                            <Eye size={20} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GdprRegistryTable;
