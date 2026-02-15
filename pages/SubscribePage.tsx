
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { Brand } from '../types';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function SubscribePage() {
    const { slug } = useParams<{ slug: string }>();
    const [brand, setBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const loadBrand = async () => {
            if (!slug) return;
            try {
                const data = await databaseService.fetchBrandBySlug(slug);
                setBrand(data);
            } catch (e) {
                console.error("Erreur chargement marque:", e);
            } finally {
                setLoading(false);
            }
        };
        loadBrand();
    }, [slug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brand || !email) return;

        setStatus('submitting');
        try {
            // Création du contact
            // Note: Pour une vraie app publique, il faudrait une API publique ou une fonction Edge sans Auth utilisateur.
            // Ici, si l'utilisateur n'est pas connecté, createContact échouera avec la config actuelle (RLS).
            // Pour la démo / mock local, ça passe.

            // Simulation d'appel API public (à remplacer par appel Edge Function en prod)
            const result = await databaseService.createContact({
                brand_id: brand.id,
                email: email,
                first_name: firstName,
                status: 'subscribed',
                created_at: new Date().toISOString()
            });

            if (result) {
                setStatus('success');
            } else {
                throw new Error("Erreur lors de l'inscription");
            }
        } catch (error: any) {
            console.error(error);
            // En mode démo local, createContact peut ne pas marcher si pas d'auth.
            // On simule le succès pour la démo UI si erreur technique (sauf si email invalide)
            if (error.message.includes("Non connecté") && !(databaseService as any)['isUsingCloud']?.()) {
                setStatus('success'); // Fallback local demo
            } else {
                setStatus('error');
                setErrorMessage("Une erreur est survenue. Réessayez plus tard.");
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    if (!brand) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                <AlertCircle size={48} className="mb-4 text-slate-300" />
                <h1 className="text-xl font-bold mb-2">Page introuvable</h1>
                <p>Cette newsletter n'existe pas ou a été désactivée.</p>
            </div>
        );
    }

    const settings = brand.subscription_settings || {
        title: "Rejoignez ma newsletter",
        subtitle: "Recevez mes meilleurs conseils chaque semaine.",
        button_text: "S'inscrire",
        primary_color: "#0F172A",
        logo_visible: true
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Inscription confirmée !</h2>
                    <p className="text-slate-500 mb-8">Merci de rejoindre la communauté <strong>{brand.brand_name}</strong>. Surveillez votre boîte mail.</p>
                    <button onClick={() => window.location.reload()} className="text-sm font-medium text-slate-400 hover:text-slate-600 underline">
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans selection:bg-slate-200">
            <div className="w-full max-w-lg bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100">

                {/* Header */}
                <div className="text-center mb-10">
                    {settings.logo_visible && brand.logo_url && (
                        <img
                            src={brand.logo_url}
                            alt={brand.brand_name}
                            className="w-20 h-20 mx-auto mb-6 rounded-2xl object-cover shadow-sm border border-slate-100"
                        />
                    )}
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-4 leading-tight">
                        {settings.title}
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        {settings.subtitle}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2 ml-1">Votre Email</label>
                        <input
                            type="email"
                            id="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vous@exemple.com"
                            className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:ring-0 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label htmlFor="firstname" className="block text-sm font-bold text-slate-700 mb-2 ml-1">Nom et Prénom</label>
                        <input
                            type="text"
                            id="firstname"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Votre nom complet"
                            className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:ring-0 transition-all font-medium"
                        />
                    </div>

                    {status === 'error' && (
                        <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium flex items-center gap-2">
                            <AlertCircle size={16} />
                            {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        style={{ backgroundColor: settings.primary_color }}
                        className="w-full py-4 rounded-xl text-white font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-lg hover:translate-y-[-2px] disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                        {status === 'submitting' ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={20} /> Traitement...
                            </span>
                        ) : settings.button_text}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-300 font-medium">
                        Propulsé par <a href="/" className="hover:text-slate-400 transition-colors">NwsletterIA</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
