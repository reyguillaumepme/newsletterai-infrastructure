import React, { useState, useEffect, useTransition } from 'react';
import { Mail, CheckCircle, Percent, Plus, Loader2, ArrowRight, Briefcase } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { databaseService } from '../services/databaseService';
import { Newsletter, Brand } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const dataChart = [
  { name: 'Lun', newsletters: 1 },
  { name: 'Mar', newsletters: 2 },
  { name: 'Mer', newsletters: 1 },
  { name: 'Jeu', newsletters: 4 },
  { name: 'Ven', newsletters: 3 },
  { name: 'Sam', newsletters: 0 },
  { name: 'Dim', newsletters: 2 },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [nlData, bData] = await Promise.all([
        databaseService.fetchNewsletters(),
        databaseService.fetchBrands()
      ]);

      startTransition(() => {
        setNewsletters(Array.isArray(nlData) ? nlData : []);
        setBrands(Array.isArray(bData) ? bData : []);
        setIsLoading(false);
      });
    };
    loadData();
  }, []);

  const handleNavigateNewsletter = (id: string) => {
    startTransition(() => {
      navigate(`/newsletters/${id}`);
    });
  };

  const handleViewAllNewsletters = () => {
    startTransition(() => {
      navigate('/newsletters');
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Tableau de bord</h2>
          <p className="text-gray-500">Pilotez votre infrastructure de contenu.</p>
        </div>
        <button
          onClick={() => startTransition(() => navigate('/newsletters/new'))}
          className="bg-primary hover:bg-[#ffca28] text-gray-900 px-6 py-3 rounded-2xl font-bold flex items-center shadow-lg transition-all hover:-translate-y-1"
        >
          <Plus size={20} className="mr-2" />
          Nouvelle newsletter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Campagnes" value={String(newsletters.length)} trend={15} icon={Mail} subtitle="Total généré" />
        <StatCard title="Marques" value={String(brands.length)} trend={0} icon={Briefcase} subtitle="Identités actives" />
        <StatCard title="Taux d'ouverture" value="42%" trend={4} icon={Percent} subtitle="Moyenne globale" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Volume hebdomadaire</h3>
          <div className="h-[300px] w-full">
            <React.Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-xl"><Loader2 className="animate-spin text-primary" /></div>}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="newsletters" stroke="#FFD54F" strokeWidth={4} dot={{ fill: '#FFD54F', r: 6, strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </React.Suspense>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold">Activités récentes</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {isLoading || isPending ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : newsletters.length > 0 ? (
              newsletters.slice(0, 5).map((nl) => (
                <div
                  key={nl.id}
                  onClick={() => handleNavigateNewsletter(nl.id)}
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Mail size={20} />
                    </div>
                    <div className="max-w-[140px]">
                      <p className="font-bold text-sm truncate">{nl.subject || "Sans sujet"}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">{nl.status}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-gray-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-gray-400 text-sm">Aucune activité récente.</div>
            )}
          </div>
          <button
            onClick={handleViewAllNewsletters}
            className="p-4 text-center text-xs font-bold text-gray-400 hover:text-gray-900 border-t border-gray-50 transition-colors"
          >
            Voir toutes les newsletters
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;