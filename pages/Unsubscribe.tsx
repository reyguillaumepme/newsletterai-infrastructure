
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const Unsubscribe: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const email = searchParams.get('email');
  const brandId = searchParams.get('brand_id');

  useEffect(() => {
    const handleUnsubscribe = async () => {
      if (!email || !brandId) {
        setStatus('error');
        return;
      }
      try {
        const success = await databaseService.unsubscribeContact(email, brandId);
        setStatus(success ? 'success' : 'error');
      } catch (e) {
        setStatus('error');
      }
    };
    handleUnsubscribe();
  }, [email, brandId]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6 animate-in zoom-in duration-500">
        
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Traitement en cours...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-100">
              <CheckCircle2 className="text-green-500" size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">Désabonné</h1>
              <p className="text-gray-500 font-medium">
                L'adresse <strong>{email}</strong> a bien été retirée de cette liste de diffusion.
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-8">Vous ne recevrez plus d'emails de cette marque.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-red-100">
              <XCircle className="text-red-500" size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">Erreur</h1>
              <p className="text-gray-500 font-medium">Impossible de traiter votre demande. Le lien est peut-être invalide ou expiré.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
