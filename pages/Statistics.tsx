import React, { useState, useEffect, useTransition } from 'react';
import {
  Mail,
  MousePointer2,
  Eye,
  RefreshCcw,
  ChevronDown,
  Loader2,
  TrendingUp
} from 'lucide-react';
import StatCard from '../components/StatCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { databaseService } from '../services/databaseService';
import { Statistics as StatsType } from '../types';

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<StatsType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadStats = async () => {
    setIsLoading(true);
    const data = await databaseService.fetchStatistics();
    startTransition(() => {
      setStats(Array.isArray(data) ? data : []);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await databaseService.syncStats();
    await loadStats();
    setIsSyncing(false);
  };

  const totalSent = stats.reduce((acc, curr) => acc + (Number(curr.sent_count) || 0), 0);
  const totalOpens = stats.reduce((acc, curr) => acc + (Number(curr.opens) || 0), 0);
  const totalClicks = stats.reduce((acc, curr) => acc + (Number(curr.clicks) || 0), 0);
  const avgOpenRate = totalSent > 0 ? (totalOpens / totalSent * 100).toFixed(1) : "0";
  const avgClickRate = totalOpens > 0 ? (totalClicks / totalOpens * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Statistiques Performance</h2>
          <p className="text-gray-500">Données issues de vos dernières campagnes.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-primary hover:bg-[#ffca28] text-gray-900 px-6 py-2 rounded-xl text-sm font-bold flex items-center shadow-sm transition-all disabled:opacity-50"
        >
          {isSyncing ? <Loader2 className="animate-spin mr-2" size={18} /> : <RefreshCcw size={18} className="mr-2" />}
          Synchroniser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Emails envoyés"
          value={totalSent.toLocaleString()}
          trend={12}
          icon={Mail}
          subtitle="Volume total"
        />
        <StatCard
          title="Taux d'ouverture"
          value={`${avgOpenRate}%`}
          trend={5}
          icon={Eye}
          subtitle={`${totalOpens.toLocaleString()} ouvertures`}
        />
        <StatCard
          title="Taux de clic (CTR)"
          value={`${avgClickRate}%`}
          trend={-2}
          icon={MousePointer2}
          subtitle={`${totalClicks.toLocaleString()} clics`}
        />
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <TrendingUp size={20} className="text-primary" />
          Engagement par Newsletter
        </h3>
        <div className="h-[400px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>
          ) : stats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.slice(0, 10).reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="opens" name="Ouvertures" fill="#FFD54F" radius={[6, 6, 0, 0]} barSize={30} />
                <Bar dataKey="clicks" name="Clics" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">Aucune donnée disponible.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;