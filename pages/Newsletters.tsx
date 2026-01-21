import React, { useState, useEffect, useTransition } from 'react';
import { Plus, Search, Calendar, Send, Clock, MoreVertical, CheckCircle2, AlertCircle, Sparkles, Mail, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { Newsletter } from '../types';

const Newsletters: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const loadNewsletters = async () => {
      setIsLoading(true);
      const data = await databaseService.fetchNewsletters();
      setNewsletters(Array.isArray(data) ? data : []);
      setIsLoading(false);
    };
    loadNewsletters();
  }, []);

  const handleNavigate = (id: string) => {
    // Crucial en React 19 pour éviter l'erreur #525 lors de l'ouverture de composants lourds
    startTransition(() => {
      navigate(`/newsletters/${id}`);
    });
  };

  const StatusBadge = ({ status, scheduled }: { status: string, scheduled?: string }) => {
    switch(status) {
      case 'sent': return <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase"><CheckCircle2 size={12}/> Envoyé</span>;
      case 'scheduled': return <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase"><Clock size={12}/> Prévu: {scheduled}</span>;
      default: return <span className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-[10px] font-bold uppercase"><AlertCircle size={12}/> Brouillon</span>;
    }
  };

  const safeNewsletters = Array.isArray(newsletters) ? newsletters : [];
  const filteredNewsletters = safeNewsletters.filter(nl => filter === 'all' ? true : nl.status === filter);

  return (
    <div className={`space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Vos Newsletters</h2>
          <p className="text-gray-500">Rédigez, planifiez et suivez vos publications.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => handleNavigate('new')} 
            className="bg-primary hover:bg-[#ffca28] text-gray-900 px-6 py-2 rounded-xl text-sm font-bold flex items-center shadow-sm transition-all disabled:opacity-50"
          >
            <Plus size={18} className="mr-2" /> Nouvelle Newsletter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        {(isLoading || isPending) && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
             <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        )}
        
        {filteredNewsletters.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {filteredNewsletters.map((nl) => (
              <div 
                key={nl.id} 
                onClick={() => handleNavigate(nl.id)}
                className="p-6 hover:bg-gray-50/50 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                    <Mail size={28} className="group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold group-hover:text-primary transition-colors">{nl.subject || "(Sans sujet)"}</h4>
                    <p className="text-xs text-gray-400">Créé le {new Date(nl.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={nl.status} scheduled={nl.scheduled_at} />
                  <ArrowRight size={20} className="text-gray-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Mail size={40} className="text-gray-200 mb-4" />
            <p className="text-gray-400">Aucune newsletter. Commencez par en créer une !</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Newsletters;