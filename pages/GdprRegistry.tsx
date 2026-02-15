import React, { useState, useEffect, useTransition } from 'react';
import { databaseService } from '../services/databaseService';
import { complianceService } from '../services/complianceService';
import { Brand, ComplianceLog } from '../types';
import Sidebar from '../components/Sidebar';
import GdprRegistryTable from '../components/GdprRegistryTable';
import ComplianceModal from '../components/ComplianceModal';
import { ShieldCheck, HelpCircle } from 'lucide-react';

const GdprRegistry: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [logs, setLogs] = useState<ComplianceLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Detail Modal State
    const [selectedLog, setSelectedLog] = useState<ComplianceLog | null>(null);
    const [modalResults, setModalResults] = useState<any>(null);

    useEffect(() => {
        loadBrands();
    }, []);

    useEffect(() => {
        if (selectedBrandId) {
            loadLogs(selectedBrandId);
        }
    }, [selectedBrandId]);

    const loadBrands = async () => {
        const data = await databaseService.fetchBrands();
        startTransition(() => {
            setBrands(data || []);
            if (data && data.length > 0 && !selectedBrandId) {
                setSelectedBrandId(data[0].id);
            }
        });
    };

    const loadLogs = async (brandId: string) => {
        setIsLoading(true);
        try {
            const data = await databaseService.fetchComplianceLogs(brandId);
            setLogs(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        if (!logs.length) return;
        const csvContent = complianceService.exportRegistryToCSV(logs);

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `registre_rgpd_${selectedBrandId}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleViewDetails = (log: ComplianceLog) => {
        try {
            const results = JSON.parse(log.compliance_snapshot);
            setModalResults(results);
            setSelectedLog(log);
        } catch (e) {
            console.error("Failed to parse snapshot", e);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">
                        Conformité & RGPD
                    </h1>
                    <p className="text-gray-500 font-medium max-w-2xl">
                        Surveillez la conformité de vos communications et accédez à votre registre des traitements.
                    </p>
                </div>

                {/* Brand Selector */}
                {brands.length > 0 && (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 pl-3 uppercase tracking-wider">Marque :</span>
                        <select
                            value={selectedBrandId}
                            onChange={(e) => setSelectedBrandId(e.target.value)}
                            className="bg-gray-50 text-gray-900 font-bold text-sm py-2 px-4 rounded-xl border-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                        >
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.brand_name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Info Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-[2.5rem] p-8 lg:col-span-2 border border-blue-100/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all duration-1000"></div>

                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 mb-6 text-blue-600">
                            <ShieldCheck size={28} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-3">Protection Automatisée</h3>
                        <p className="text-gray-600 leading-relaxed text-sm md:text-base max-w-lg mb-6">
                            Compliance Guard analyse automatiquement chaque newsletter avant envoi pour vérifier les mentions légales, les liens de désabonnement et le score de spam. Chaque envoi est consigné ici pour vos audits CNIL.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="text-blue-700 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all">Documentation RGPD <HelpCircle size={14} /></a>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Total Envois Audités</p>
                    <p className="text-6xl font-black text-gray-900 mb-2">{logs.length}</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-xs font-bold text-green-600">Système Actif</p>
                    </div>
                </div>
            </div>

            {/* Registry Table */}
            <GdprRegistryTable
                logs={logs}
                isLoading={isLoading}
                onExport={handleExport}
                onViewDetails={handleViewDetails}
            />

            {/* Detail Modal (Reusing ComplianceModal in view-only mode could be nice, or just displaying data) */}
            {selectedLog && modalResults && (
                <ComplianceModal
                    isOpen={!!selectedLog}
                    onClose={() => setSelectedLog(null)}
                    results={modalResults}
                    onConfirm={async () => setSelectedLog(null)} // Close only
                    isSending={false} // No sending
                />
            )}
        </div>
    );
};

export default GdprRegistry;
