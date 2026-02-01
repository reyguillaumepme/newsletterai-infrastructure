
import React from 'react';
import { AlertTriangle, Trash2, X, FileText, ArrowRight, Eye, AlertCircle } from 'lucide-react';
import { Idea, Newsletter } from '../types';
import { Link } from 'react-router-dom';

interface DeleteIdeaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    idea: Idea | null;
    associatedNewsletter: Newsletter | null;
}

const DeleteIdeaModal: React.FC<DeleteIdeaModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    idea,
    associatedNewsletter
}) => {
    if (!isOpen || !idea) return null;

    // Case 1: Idea is unused (Safe to delete)
    const isSafeToDelete = !idea.newsletter_id && !idea.used;

    // Case 2: Newsletter Sent (Blocked)
    const isBlocked = associatedNewsletter?.status === 'sent';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">

                {/* Header */}
                <div className={`p-6 border-b flex items-center gap-4 ${isBlocked ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`p-3 rounded-xl shadow-sm ${isBlocked ? 'bg-red-100 text-red-600' : 'bg-white text-gray-900'}`}>
                        {isBlocked ? <AlertCircle size={24} /> : <Trash2 size={24} />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold uppercase tracking-wide ${isBlocked ? 'text-red-800' : 'text-gray-900'}`}>
                            {isBlocked ? 'Suppression Impossible' : 'Supprimer le concept ?'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="ml-auto p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">

                    {/* Context: The Idea */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        {idea.image_url ? (
                            <img src={idea.image_url} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-gray-400 border border-gray-100">
                                <FileText size={20} />
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Concept ciblé</p>
                            <h4 className="font-bold text-gray-900 line-clamp-1">{idea.title}</h4>
                        </div>
                    </div>

                    {/* LOGIC BRANCHES */}

                    {isSafeToDelete && (
                        <div className="space-y-6">
                            <p className="text-gray-600">
                                Êtes-vous sûr de vouloir supprimer cette idée ? Cette action est irréversible.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={async () => { await onConfirm(); onClose(); }}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    )}

                    {!isSafeToDelete && !isBlocked && (
                        <div className="space-y-6">
                            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl space-y-3">
                                <div className="flex items-center gap-2 text-orange-800 font-bold">
                                    <AlertTriangle size={18} />
                                    <span>Idée en cours d'utilisation</span>
                                </div>
                                <p className="text-sm text-orange-700 leading-relaxed">
                                    Cette idée est attachée à une newsletter en brouillon. Vous devez la <b>détacher</b> avant de pouvoir la supprimer.
                                </p>
                                {associatedNewsletter && (
                                    <Link
                                        to={`/newsletters/${associatedNewsletter.id}`}
                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-all group"
                                    >
                                        <span className="font-bold text-gray-800 text-sm truncate">{associatedNewsletter.subject || "Sans titre"}</span>
                                        <ArrowRight size={16} className="text-orange-500 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Compris
                            </button>
                        </div>
                    )}

                    {isBlocked && (
                        <div className="space-y-6">
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl space-y-3">
                                <p className="text-sm text-red-700 leading-relaxed">
                                    Cette idée a été envoyée avec la newsletter ci-dessous le <b>{new Date(associatedNewsletter?.created_at || '').toLocaleDateString()}</b>.
                                    Pour préserver l'historique, sa suppression est impossible.
                                </p>
                                {associatedNewsletter && (
                                    <Link
                                        to={`/newsletters/${associatedNewsletter.id}`}
                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-all group"
                                    >
                                        <span className="font-bold text-gray-800 text-sm truncate">{associatedNewsletter.subject || "Sans titre"}</span>
                                        <Eye size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
                                    </Link>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DeleteIdeaModal;
