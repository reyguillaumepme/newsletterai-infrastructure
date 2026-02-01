
import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Lock, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

interface DeleteBrandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    brandName: string;
}

const DeleteBrandModal: React.FC<DeleteBrandModalProps> = ({ isOpen, onClose, onConfirm, brandName }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // 1. Verify Password
            const currentUser = authService.getCurrentUser();
            if (!currentUser?.email) {
                throw new Error("Utilisateur non identifié.");
            }

            // We attempt a sign-in to verify the password.
            // Note: This creates a new session but validates the credentials.
            // We use a separate client instance or just the auth service to check.
            // Since authService.signIn updates global state, we might want to avoid side effects if possible,
            // but for now, re-authenticating is the safest "verification".
            // Let's assume authService.signIn behaves correctly. 
            // ACTUALLY: authService.signIn might redirect or change context. 
            // Let's look at authService.signIn implementation again. 
            // It calls syncSupabaseUser which updates localStorage. Ideally strictly "verify" would be better but signIn is robust.
            // Let's try to just use valid credentials check if possible, but standard way is signIn.

            // Let's try raw verify via a custom call if authService exposes it, otherwise stick to signIn.
            // Assuming signIn is safe enough for "Re-auth".

            // WAIT using the singleton we created in authService, we can just call supabase directly to check? 
            // No, let's use authService.signIn for consistency, but beware of side effects.
            // Actually, looking at authService.ts: it updates localStorage. This is fine.

            await authService.signIn(currentUser.email, password);

            // 2. Proceed with Deletion
            await onConfirm();
            onClose();

        } catch (err: any) {
            console.error(err);
            setError("Mot de passe incorrect ou erreur réseau.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-red-900/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 border border-red-100">

                {/* Header Warning */}
                <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                    <div className="bg-white p-3 rounded-xl text-red-600 shadow-sm">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-700 uppercase tracking-wide">
                            Zone de Danger
                        </h3>
                        <p className="text-red-600 text-xs font-medium">Cette action est irréversible</p>
                    </div>
                    <button onClick={onClose} className="ml-auto p-2 hover:bg-red-100 rounded-full text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">

                    <div className="text-center space-y-2">
                        <p className="text-gray-500 font-medium">Vous êtes sur le point de supprimer :</p>
                        <p className="text-xl font-black text-red-600 font-mono bg-red-50 py-2 px-4 rounded-lg inline-block">
                            {brandName}
                        </p>
                    </div>

                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl space-y-2">
                        <h4 className="flex items-center gap-2 font-bold text-orange-800 text-sm">
                            <AlertTriangle size={16} /> Impact de la suppression :
                        </h4>
                        <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside ml-2">
                            <li>Suppression de <b>tous les contacts</b> associés.</li>
                            <li>Suppression de <b>toutes les newsletters</b> (envoyées et brouillons).</li>
                            <li>Suppression de <b>tous les concepts et idées</b>.</li>
                        </ul>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Lock size={12} /> Confirmer avec votre mot de passe
                            </label>
                            <input
                                type="password"
                                required
                                autoFocus
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Votre mot de passe..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium"
                            />
                            {error && <p className="text-xs font-bold text-red-500 ml-1">{error}</p>}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !password}
                                className="flex-1 py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <Trash2 size={20} />}
                                Supprimer la marque
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default DeleteBrandModal;
