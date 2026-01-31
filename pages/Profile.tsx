import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { authService } from '../services/authService';
import { Profile as ProfileType } from '../types';
import { Loader2, CreditCard, Zap, User, ShieldCheck, Wand2, Layout, Clock, Globe, MousePointerClick } from 'lucide-react';

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            const user = authService.getCurrentUser();
            if (user) {
                // Try fetching detailed profile from DB
                const data = await databaseService.fetchMyProfile();
                if (data) {
                    setProfile(data);
                } else {
                    // Fallback to minimal user info
                    setProfile({
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        subscription_plan: 'free',
                        credits: 5
                    });
                }
            }
            setIsLoading(false);
        };
        loadProfile();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (!profile) return <div>Profil introuvable.</div>;

    const getPlanColor = (plan?: string) => {
        switch (plan) {
            case 'elite': return 'bg-slate-900 text-white border-slate-700';
            case 'pro': return 'bg-primary text-slate-900 border-primary';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    const getPlanName = (plan?: string) => {
        switch (plan) {
            case 'elite': return 'Elite Business';
            case 'pro': return 'Pro Creator';
            default: return 'Découverte (Gratuit)';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-8">Mon Profil</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Info Carte */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                        <User size={32} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-400 uppercase tracking-wider mb-1">Identité</h2>
                        <p className="text-2xl font-bold text-slate-900 truncate" title={profile.email}>{profile.email}</p>
                    </div>
                </div>

                {/* Plan Carte */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck size={100} />
                    </div>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${getPlanColor(profile.subscription_plan).split(' ')[2]} bg-white`}>
                        <CreditCard size={32} className="text-slate-900" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-400 uppercase tracking-wider mb-1">Abonnement Actuel</h2>
                        <div className={`inline-flex px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider border-2 ${getPlanColor(profile.subscription_plan)}`}>
                            {getPlanName(profile.subscription_plan)}
                        </div>
                    </div>
                </div>

                {/* Credits Card */}
                <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl md:col-span-2 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute -left-10 -bottom-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Zap size={20} className="text-primary" fill="currentColor" /> Crédits IA Disponibles
                        </h2>
                        <p className="text-6xl font-black tracking-tighter">
                            {profile.credits !== undefined ? profile.credits : 0}
                        </p>
                    </div>

                    <div className="relative z-10 w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
                        <Zap size={40} className="text-primary" fill="currentColor" />
                    </div>
                </div>
            </div>

            {profile.subscription_plan === 'free' && (
                <div className="bg-yellow-50 border-2 border-yellow-100 rounded-[2rem] p-8 flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 shrink-0">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-bold text-yellow-900 mb-2">Passez à la vitesse supérieure</h3>
                            <p className="text-yellow-800 leading-relaxed">
                                Le plan gratuit est limité à 5 crédits et ne permet pas l'envoi réel de newsletters.
                                Débloquez tout le potentiel de NewsletterAI dès maintenant.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/', { state: { scrollToPricing: true } })}
                            className="px-8 py-4 bg-primary text-slate-900 rounded-xl font-black uppercase tracking-wide hover:bg-yellow-400 hover:scale-105 transition-all shadow-lg shadow-primary/20 shrink-0"
                        >
                            Voir les offres
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { icon: <Wand2 size={20} className="text-purple-600" />, title: "Rédaction IA", desc: "Ton et style 100% naturels." },
                            { icon: <Layout size={20} className="text-blue-600" />, title: "Studio Visuel", desc: "Mises en pages pro en un clic." },
                            { icon: <Clock size={20} className="text-green-600" />, title: "Gain de Temps", desc: "Créez en 5min au lieu de 4h." },
                            { icon: <ShieldCheck size={20} className="text-red-500" />, title: "Délivrabilité", desc: "Infrastructure robuste & sécurisée." },
                            { icon: <MousePointerClick size={20} className="text-orange-500" />, title: "Analytics", desc: "Suivi des ouvertures et clics." },
                            { icon: <Globe size={20} className="text-cyan-500" />, title: "Multi-Marques", desc: "Gérez plusieurs identités." }
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white/80 p-4 rounded-xl border border-yellow-100/50 flex items-start gap-4">
                                <div className="mt-1 shrink-0">{feature.icon}</div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900">{feature.title}</h4>
                                    <p className="text-xs text-slate-500 leading-snug">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
