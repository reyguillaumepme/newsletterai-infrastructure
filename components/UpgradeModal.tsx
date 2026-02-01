import React from 'react';
import { X, CheckCircle2, Zap, Crown, ShieldCheck, Sparkles } from 'lucide-react';
import { Profile } from '../types';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'credits' | 'feature';
    currentPlan?: 'free' | 'pro' | 'elite';
    requiredFeature?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, type, currentPlan = 'free', requiredFeature }) => {
    if (!isOpen) return null;

    const isFree = currentPlan === 'free';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors z-10"
                >
                    <X size={20} className="text-gray-500" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left Panel: Context & Message */}
                    <div className="p-8 md:p-12 flex flex-col justify-center space-y-6">

                        {/* Header Icon */}
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                            {type === 'credits' ? <Zap size={32} /> : <Crown size={32} />}
                        </div>

                        <div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4 leading-tight">
                                {type === 'credits' ? (
                                    isFree ? "Passez à la vitesse supérieure" : "Besoin de plus de puissance ?"
                                ) : (
                                    "Débloquez tout le potentiel"
                                )}
                            </h2>
                            <p className="text-gray-500 text-lg leading-relaxed">
                                {type === 'credits' ? (
                                    isFree
                                        ? "Vous avez utilisé tous vos crédits gratuits. Passez Pro pour continuer à générer du contenu sans limites."
                                        : "Votre solde de crédits est épuisé. Rechargez votre compte instantanément pour continuer."
                                ) : (
                                    <>
                                        La fonctionnalité <strong className="text-slate-900">{requiredFeature}</strong> est réservée aux membres Pro et Elite.
                                    </>
                                )}
                            </p>
                        </div>

                        {/* If Pro/Elite & Credits -> Show Top Up Option */}
                        {!isFree && type === 'credits' && (
                            <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center justify-between shadow-xl shadow-slate-200">
                                <div>
                                    <p className="font-bold text-lg">Pack Recharge</p>
                                    <p className="text-slate-400 text-sm">200 crédits supplémentaires</p>
                                </div>
                                <button className="px-6 py-3 bg-primary text-slate-900 font-bold rounded-xl hover:scale-105 transition-transform">
                                    10,00 €
                                </button>
                            </div>
                        )}

                        {/* If Free -> Show Upgrade CTA */}
                        {isFree && (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => alert("Redirection vers Stripe...")}
                                    className="w-full py-4 bg-primary text-slate-900 font-black rounded-2xl text-lg hover:scale-[1.02] shadow-xl shadow-primary/20 transition-all"
                                >
                                    Devenir Membre Pro
                                </button>
                                <p className="text-center text-xs text-gray-400 font-medium">Sans engagement. Annulable à tout moment.</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Value Proposition (Only for Free users or Feature lock) */}
                    <div className="bg-slate-50 p-8 md:p-12 border-l border-gray-100 flex flex-col justify-center">
                        {isFree ? (
                            <div className="space-y-8">
                                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-sm">Pourquoi passer Pro ?</h3>
                                <ul className="space-y-4">
                                    <FeatureItem text="Génération IA illimitée (Textes & Images)" />
                                    <FeatureItem text="Envoi de Newsletters (via Brevo)" />
                                    <FeatureItem text="Planification de campagnes" />
                                    <FeatureItem text="Accès aux stratégies de marque avancées" />
                                    <FeatureItem text="Support prioritaire" />
                                </ul>

                                <div className="pt-6 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-900">Plan Pro</p>
                                            <p className="text-xs text-gray-500">Pour les créateurs ambitieux</p>
                                        </div>
                                        <p className="text-2xl font-black text-slate-900">29€<span className="text-sm font-medium text-gray-400">/mois</span></p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // If already Pro but out of credits, show usage stats or benefits
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-sm">Votre utilisation</h3>
                                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-600">Crédits utilisés ce mois</span>
                                        <span className="font-bold text-slate-900">100%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-red-500 h-2 rounded-full w-full"></div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Vous produisez beaucoup de contenu ! Le pack recharge vous permet de continuer sans attendre le renouvellement mensuel.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FeatureItem = ({ text }: { text: string }) => (
    <li className="flex items-start gap-3 text-gray-600 font-medium">
        <div className="p-1 bg-green-100 text-green-600 rounded-full shrink-0 mt-0.5">
            <CheckCircle2 size={14} />
        </div>
        <span className="text-sm">{text}</span>
    </li>
);

export default UpgradeModal;
