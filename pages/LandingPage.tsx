import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Zap, Layout, Shield, Sparkles, Wand2, Globe, Clock, MousePointerClick } from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state && (location.state as any).scrollToPricing) {
            const pricingSection = document.getElementById('pricing');
            if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth' });
                window.history.replaceState({}, document.title);
            }
        }
    }, [location]);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary selection:text-white overflow-x-hidden">

            {/* Navigation — fixed white bar, always visible */}
            <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/logo.jpg" alt="NwsletterIA" className="h-20 w-auto" />
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/auth?mode=login')} className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">Connexion</button>
                        <button onClick={() => navigate('/auth?mode=register')} className="px-5 py-2.5 bg-primary text-slate-900 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-yellow-400 transition-all hover:scale-105 shadow-lg shadow-primary/30">
                            Démarrer Gratuitement
                        </button>
                    </div>
                </div>
            </nav>
            {/* Spacer for fixed nav */}
            <div className="h-20"></div>

            {/* Refactored Hero Section: Text Top -> Video Middle -> Text Bottom */}
            <header className="relative w-full pt-12 pb-24 bg-white text-center">
                <div className="max-w-7xl mx-auto px-6">

                    {/* 1. TOP: Badge & Title */}
                    <div className="max-w-4xl mx-auto mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nouvelle Version 2.0 Disponible</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            Votre Newsletter. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600">Sous Stéroïdes.</span>
                        </h1>
                    </div>

                    {/* 2. MIDDLE: Video */}
                    <div className="relative max-w-5xl mx-auto mb-12 rounded-2xl overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-[1200ms]">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-auto block"
                            src="/ProductVideo.mp4"
                        />
                        {/* Optional overlay to ensure video doesn't clash if it has light parts, usually not needed for product demos but keeps it clean */}
                        <div className="absolute inset-0 bg-slate-900/5 pointer-events-none mix-blend-multiply"></div>
                    </div>

                    {/* 3. BOTTOM: Subtitle & CTA */}
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-[1400ms]">
                        <p className="text-lg md:text-xl text-slate-500 mb-10 leading-relaxed">
                            Arrêtez de perdre du temps sur la mise en page. Laissez l'IA rédiger, designer et optimiser vos newsletters pour une conversion maximale.
                        </p>

                        <button onClick={() => navigate('/auth?mode=register')} className="px-10 py-5 bg-primary text-slate-950 rounded-2xl text-base font-black uppercase tracking-wider hover:bg-yellow-400 transition-all hover:scale-105 shadow-xl shadow-primary/25 inline-flex items-center gap-2">
                            <Zap size={20} /> Essayer Gratuitement
                        </button>
                    </div>

                </div>
            </header>

            {/* Features Grid */}
            <section className="py-24 bg-slate-50 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-3xl font-black mb-6 uppercase tracking-tight">Pourquoi NwsletterIA ?</h2>
                        <p className="text-slate-500 text-lg">Une suite complète d'outils conçus pour transformer votre simple email en une machine à engagement.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: <Wand2 className="text-purple-600" />, title: "Rédaction Assistée par IA", desc: "Adopte automatiquement votre ton et style d'écriture pour un rendu 100% naturel." },
                            { icon: <Layout className="text-blue-600" />, title: "Studio Visuel & Génération", desc: "Créez des images uniques et des mises en pages professionnelles en un clic." },
                            { icon: <Clock className="text-green-600" />, title: "Gain de Temps Massif", desc: "Passez de 4h à 5min pour créer une newsletter complète et engageante." },
                            { icon: <Shield className="text-red-500" />, title: "Sécurité & Délivrabilité", desc: "Infrastructure robuste garantissant que vos emails arrivent en boîte principale." },
                            { icon: <MousePointerClick className="text-orange-500" />, title: "Analytics Avancés", desc: "Suivez les taux d'ouverture, clics et heatmap pour optimiser chaque envoi." },
                            { icon: <Globe className="text-cyan-500" />, title: "Multi-Marques", desc: "Gérez plusieurs identités et stratégies de contenu depuis une interface unique." }
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-xl">
                                    {feature.icon}
                                </div>
                                <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-4xl font-black mb-6 uppercase tracking-tight">Des tarifs adaptés à votre croissance</h2>
                        <p className="text-slate-500 text-lg">Commencez gratuitement, payez quand vous réussissez.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">

                        {/* Free Plan */}
                        <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 relative group hover:border-slate-200 transition-all">
                            <h3 className="text-xl font-black uppercase text-slate-400 mb-4">Découverte</h3>
                            <div className="mb-8">
                                <span className="text-5xl font-black text-slate-900">0€</span>
                                <span className="text-slate-400 font-bold">/mois</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-8 min-h-[40px]">Pour tester la puissance de l'IA et découvrir l'interface.</p>

                            <button
                                onClick={() => navigate('/auth?mode=register')}
                                className="w-full py-4 rounded-xl bg-slate-100 text-slate-900 font-bold mb-10 hover:bg-slate-200 transition-all"
                            >
                                Créer un compte
                            </button>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                    <CheckCircle2 size={18} className="text-primary" /> <span><strong>5 Crédits</strong> IA offerts</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                    <CheckCircle2 size={18} className="text-primary" /> <span>Mode <strong>Test Uniquement</strong></span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                    <CheckCircle2 size={18} className="text-primary" /> <span>Accès Studio Visuel</span>
                                </div>
                            </div>
                        </div>

                        {/* Pro Plan */}
                        <div className="bg-slate-900 p-10 rounded-[2.5rem] relative transform lg:-translate-y-4 shadow-2xl">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-orange-400 text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                Le plus populaire
                            </div>
                            <h3 className="text-xl font-black uppercase text-primary mb-4">Pro Creator</h3>
                            <div className="mb-8">
                                <span className="text-5xl font-black text-white">29€</span>
                                <span className="text-slate-400 font-bold">/mois</span>
                            </div>
                            <p className="text-slate-400 text-sm mb-8 min-h-[40px]">Idéal pour les créateurs qui veulent économiser 10h/mois.</p>

                            <button
                                onClick={() => navigate('/auth?mode=register')}
                                className="w-full py-4 rounded-xl bg-primary text-slate-900 font-black uppercase tracking-wider mb-10 hover:scale-105 hover:bg-yellow-400 transition-all shadow-lg"
                            >
                                Commencer
                            </button>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                                    <CheckCircle2 size={18} className="text-primary" /> <span><strong>50 Crédits</strong> IA / mois</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                                    <CheckCircle2 size={18} className="text-primary" /> <span>Envois illimités</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                                    <CheckCircle2 size={18} className="text-primary" /> <span>Marques illimitées</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                                    <CheckCircle2 size={18} className="text-primary" /> <span>Support Prioritaire</span>
                                </div>
                            </div>
                        </div>

                        {/* Elite Plan */}
                        <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 relative group hover:border-slate-200 transition-all">
                            <h3 className="text-xl font-black uppercase text-slate-400 mb-4">Elite Business</h3>
                            <div className="mb-8">
                                <span className="text-5xl font-black text-slate-900">99€</span>
                                <span className="text-slate-400 font-bold">/mois</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-8 min-h-[40px]">Pour les agences et entreprises nécessitant de la puissance.</p>

                            <button
                                onClick={() => navigate('/auth?mode=register')}
                                className="w-full py-4 rounded-xl bg-slate-100 text-slate-900 font-bold mb-10 hover:bg-slate-200 transition-all"
                            >
                                Contacter l'équipe
                            </button>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                    <CheckCircle2 size={18} className="text-primary" /> <span><strong>Crédits Illimités</strong></span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                    <CheckCircle2 size={18} className="text-primary" /> <span>API Access</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                    <CheckCircle2 size={18} className="text-primary" /> <span>Account Manager dédié</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-24 bg-slate-900 text-center px-6">
                <h2 className="text-3xl lg:text-5xl font-black text-white mb-8 tracking-tight">Prêt à révolutionner vos newsletters ?</h2>
                <button onClick={() => navigate('/auth?mode=register')} className="px-10 py-5 bg-primary text-slate-950 rounded-2xl text-base font-black uppercase tracking-wider hover:bg-yellow-400 transition-all hover:scale-105 shadow-xl shadow-primary/20 flex items-center gap-3 mx-auto">
                    C'est parti <ArrowRight size={20} />
                </button>
            </section>

            <footer className="py-10 bg-slate-950 text-slate-600 text-center text-sm border-t border-slate-800">
                <p>&copy; 2026 NwsletterIA. Tous droits réservés.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
