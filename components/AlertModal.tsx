import React from 'react';
import { X, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'info' | 'error' | 'success';
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, title, message, type = 'info' }) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'error': return <AlertTriangle className="text-red-500" size={32} />;
            case 'success': return <CheckCircle2 className="text-green-500" size={32} />;
            default: return <Info className="text-blue-500" size={32} />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'error': return 'bg-red-50';
            case 'success': return 'bg-green-50';
            default: return 'bg-blue-50';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                    <div className={`p-4 rounded-full ${getBgColor()}`}>
                        {getIcon()}
                    </div>
                    <div className="space-y-2">
                        {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
                        <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors mt-2"
                    >
                        Compris
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
