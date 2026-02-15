import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { ComplianceCheckResult } from '../types';

interface ComplianceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    results: ComplianceCheckResult | null;
    isSending: boolean;
}

const ComplianceModal: React.FC<ComplianceModalProps> = ({ isOpen, onClose, onConfirm, results, isSending }) => {
    if (!isOpen || !results) return null;

    const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
        switch (status) {
            case 'success': return <CheckCircle className="text-green-500" size={20} />;
            case 'warning': return <AlertTriangle className="text-yellow-500" size={20} />;
            case 'error': return <XCircle className="text-red-500" size={20} />;
        }
    };

    const getStatusColor = (status: 'success' | 'warning' | 'error') => {
        switch (status) {
            case 'success': return 'bg-green-50 border-green-200 text-green-700';
            case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
            case 'error': return 'bg-red-50 border-red-200 text-red-700';
        }
    };

    const isCritical = results.overall_status === 'error';

    const getHeaderColor = () => {
        // Background is now in the image itself, so we keep container transparent or neutral
        return 'bg-transparent';
    };

    const getShieldImage = () => {
        if (results.overall_status === 'error') return '/shield-error.png';
        if (results.overall_status === 'warning') return '/shield-warning.png';
        return '/shield-success.png';
    };

    const getHeaderBorderColor = () => {
        if (results.overall_status === 'error') return 'bg-red-50/50';
        if (results.overall_status === 'warning') return 'bg-yellow-50/50';
        return 'bg-green-50/50';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <style>{`
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .animate-heartbeat {
                    animation: heartbeat 3s infinite ease-in-out;
                }
            `}</style>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 transform transition-all">

                {/* Header */}
                <div className={`p-8 border-b border-gray-100 flex items-center justify-between ${getHeaderBorderColor()}`}>
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden shadow-lg animate-heartbeat">
                            <img src={getShieldImage()} alt="Compliance Guard" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Bouclier de Conformité</h3>
                            <p className="text-base text-gray-500 font-medium mt-1">Vérification avant envoi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XCircle size={32} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">

                    {/* Mentions Légales */}
                    <div className={`flex items-start gap-3 p-3 rounded-xl border ${getStatusColor(results.mentions.status)}`}>
                        {getStatusIcon(results.mentions.status)}
                        <div>
                            <p className="font-semibold text-sm">Mentions Légales</p>
                            <p className="text-xs opacity-90">{results.mentions.message}</p>
                        </div>
                    </div>

                    {/* Désabonnement */}
                    <div className={`flex items-start gap-3 p-3 rounded-xl border ${getStatusColor(results.unsubscribe.status)}`}>
                        {getStatusIcon(results.unsubscribe.status)}
                        <div>
                            <p className="font-semibold text-sm">Lien de Désabonnement</p>
                            <p className="text-xs opacity-90">{results.unsubscribe.message}</p>
                        </div>
                    </div>

                    {/* Marqueur IA */}
                    <div className={`flex items-start gap-3 p-3 rounded-xl border ${getStatusColor(results.ai_marker.status)}`}>
                        {getStatusIcon(results.ai_marker.status)}
                        <div className="flex-1">
                            <p className="font-semibold text-sm">Transparence IA (AI Act)</p>
                            <p className="text-xs opacity-90">{results.ai_marker.message}</p>
                            {results.ai_marker.status === 'success' && results.ai_marker.matches && results.ai_marker.matches.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {results.ai_marker.matches.map((match, i) => (
                                        <span key={i} className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
                                            Détecté : {match}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Score Spam */}
                    <div className={`flex items-start gap-3 p-3 rounded-xl border ${getStatusColor(results.spam_score.status)}`}>
                        {getStatusIcon(results.spam_score.status)}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold text-sm">Score de Spam</p>
                                <span className="text-xs font-bold">{results.spam_score.score}/100</span>
                            </div>
                            <div className="w-full bg-black/10 rounded-full h-1.5 mb-1">
                                <div
                                    className={`h-1.5 rounded-full ${results.spam_score.score >= 80 ? 'bg-green-500' : results.spam_score.score >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                                    style={{ width: `${results.spam_score.score}%` }}
                                ></div>
                            </div>
                            <p className="text-xs opacity-90 mb-3">{results.spam_score.message}</p>

                            {results.spam_score.spam_checks && (
                                <div className="grid grid-cols-2 gap-4 bg-white/50 p-3 rounded-lg">
                                    {/* Colonne 1 : Sujet + Technique */}
                                    <div className="space-y-6">
                                        {/* 1. Objet */}
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">1. Objet de l'e-mail</p>
                                            <div className="space-y-1">
                                                {results.spam_score.spam_checks
                                                    .filter(c => c.category === "Objet de l'e-mail (Sujet)")
                                                    .map((check, index) => (
                                                        <div key={index} className="mb-2 last:mb-0">
                                                            <div className="flex items-start justify-between text-xs">
                                                                <div className="flex flex-col gap-1 flex-1">
                                                                    <div className="flex items-start gap-1.5">
                                                                        {check.passed ? (
                                                                            <CheckCircle size={12} className="text-green-600 mt-0.5 shrink-0" />
                                                                        ) : (
                                                                            <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                                                                        )}
                                                                        <span className={`leading-tight ${check.passed ? 'text-gray-600' : 'text-red-600 font-medium'}`}>
                                                                            {check.label}
                                                                        </span>
                                                                    </div>

                                                                    {!check.passed && (
                                                                        <div className="ml-5 flex flex-wrap gap-1">
                                                                            {check.location && (
                                                                                <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                                                                    {check.location}
                                                                                </span>
                                                                            )}
                                                                            {check.matches?.map((match, mi) => (
                                                                                <span key={mi} className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-black">
                                                                                    "{match}"
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {!check.passed && (
                                                                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded ml-1 shrink-0">
                                                                        -{check.penalty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!check.passed && check.remediation && (
                                                                <p className="text-[10px] text-gray-400 italic ml-5 mt-1 border-l-2 border-gray-100 pl-2 py-0.5">
                                                                    💡 {check.remediation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* 3. Technique */}
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">3. Technique & Expéditeur</p>
                                            <div className="space-y-1">
                                                {results.spam_score.spam_checks
                                                    .filter(c => c.category === "Technique et Expéditeur")
                                                    .map((check, index) => (
                                                        <div key={index} className="mb-2 last:mb-0">
                                                            <div className="flex items-start justify-between text-xs">
                                                                <div className="flex flex-col gap-1 flex-1">
                                                                    <div className="flex items-start gap-1.5">
                                                                        {check.passed ? (
                                                                            <CheckCircle size={12} className="text-green-600 mt-0.5 shrink-0" />
                                                                        ) : (
                                                                            <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                                                                        )}
                                                                        <span className={`leading-tight ${check.passed ? 'text-gray-600' : 'text-red-600 font-medium'}`}>
                                                                            {check.label}
                                                                        </span>
                                                                    </div>

                                                                    {!check.passed && (
                                                                        <div className="ml-5 flex flex-wrap gap-1">
                                                                            {check.location && (
                                                                                <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                                                                    {check.location}
                                                                                </span>
                                                                            )}
                                                                            {check.matches?.map((match, mi) => (
                                                                                <span key={mi} className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-black">
                                                                                    "{match}"
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {!check.passed && (
                                                                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded ml-1 shrink-0">
                                                                        -{check.penalty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!check.passed && check.remediation && (
                                                                <p className="text-[10px] text-gray-400 italic ml-5 mt-1 border-l-2 border-gray-100 pl-2 py-0.5">
                                                                    💡 {check.remediation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Colonne 2 : Contenu & Design */}
                                    <div className="space-y-6">
                                        {/* 2. Contenu */}
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">2. Contenu du message</p>
                                            <div className="space-y-1">
                                                {results.spam_score.spam_checks
                                                    .filter(c => c.category === "Corps du message (Contenu HTML)")
                                                    .map((check, index) => (
                                                        <div key={index} className="mb-2 last:mb-0">
                                                            <div className="flex items-start justify-between text-xs">
                                                                <div className="flex flex-col gap-1 flex-1">
                                                                    <div className="flex items-start gap-1.5">
                                                                        {check.passed ? (
                                                                            <CheckCircle size={12} className="text-green-600 mt-0.5 shrink-0" />
                                                                        ) : (
                                                                            <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                                                                        )}
                                                                        <span className={`leading-tight ${check.passed ? 'text-gray-600' : 'text-red-600 font-medium'}`}>
                                                                            {check.label}
                                                                        </span>
                                                                    </div>

                                                                    {!check.passed && (
                                                                        <div className="ml-5 flex flex-wrap gap-1">
                                                                            {check.location && (
                                                                                <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                                                                    {check.location}
                                                                                </span>
                                                                            )}
                                                                            {check.matches?.map((match, mi) => (
                                                                                <span key={mi} className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-black">
                                                                                    "{match}"
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {!check.passed && (
                                                                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded ml-1 shrink-0">
                                                                        -{check.penalty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!check.passed && check.remediation && (
                                                                <p className="text-[10px] text-gray-400 italic ml-5 mt-1 border-l-2 border-gray-100 pl-2 py-0.5">
                                                                    💡 {check.remediation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* 4. Design */}
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">4. Mise en forme</p>
                                            <div className="space-y-1">
                                                {results.spam_score.spam_checks
                                                    .filter(c => c.category === "Mise en forme et Lisibilité")
                                                    .map((check, index) => (
                                                        <div key={index} className="mb-2 last:mb-0">
                                                            <div className="flex items-start justify-between text-xs">
                                                                <div className="flex flex-col gap-1 flex-1">
                                                                    <div className="flex items-start gap-1.5">
                                                                        {check.passed ? (
                                                                            <CheckCircle size={12} className="text-green-600 mt-0.5 shrink-0" />
                                                                        ) : (
                                                                            <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                                                                        )}
                                                                        <span className={`leading-tight ${check.passed ? 'text-gray-600' : 'text-red-600 font-medium'}`}>
                                                                            {check.label}
                                                                        </span>
                                                                    </div>

                                                                    {!check.passed && (
                                                                        <div className="ml-5 flex flex-wrap gap-1">
                                                                            {check.location && (
                                                                                <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                                                                    {check.location}
                                                                                </span>
                                                                            )}
                                                                            {check.matches?.map((match, mi) => (
                                                                                <span key={mi} className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-black">
                                                                                    "{match}"
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {!check.passed && (
                                                                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded ml-1 shrink-0">
                                                                        -{check.penalty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!check.passed && check.remediation && (
                                                                <p className="text-[10px] text-gray-400 italic ml-5 mt-1 border-l-2 border-gray-100 pl-2 py-0.5">
                                                                    💡 {check.remediation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-2 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Corriger
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={isSending}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 shadow-lg transition-transform active:scale-95 ${isCritical ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-gray-900 hover:bg-black shadow-gray-200'
                            }`}
                    >
                        {isSending ? "Envoi..." : (isCritical ? "Forcer l'envoi" : "Confirmer l'envoi")}
                    </button>
                </div>

                {isCritical && (
                    <div className="px-6 pb-4">
                        <p className="text-[10px] text-center text-gray-400">
                            En forçant l'envoi malgré les erreurs, vous assumez la responsabilité en cas de non-conformité RGPD ou de livraison en Spam.
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ComplianceModal;
