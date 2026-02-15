import React, { useState, useEffect, useTransition } from 'react';
import { Mail, CheckCircle, Percent, Plus, Loader2, ArrowRight, Briefcase, BookOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { databaseService } from '../services/databaseService';
import { mailService } from '../services/mailService';
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
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [globalStats, setGlobalStats] = useState({ avgOpenRate: 0, avgClickRate: 0, totalSent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Chart Controls State
  const [chartUnit, setChartUnit] = useState<'day' | 'week' | 'month'>('week');
  const [chartDuration, setChartDuration] = useState(10);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [nlData, bData, subCount, stats] = await Promise.all([
          databaseService.fetchNewsletters(),
          databaseService.fetchBrands(),
          databaseService.fetchTotalContactCount(),
          mailService.getGlobalStats()
        ]);

        startTransition(() => {
          setNewsletters(Array.isArray(nlData) ? nlData : []);
          setBrands(Array.isArray(bData) ? bData : []);
          setTotalSubscribers(subCount);
          setGlobalStats(stats);
          setIsLoading(false);
        });
      } catch (error) {
        console.error("Dashboard Load Error:", error);
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute Chart Data
  const chartData = React.useMemo(() => {
    if (isLoading) return [];

    // 1. Generate keys for the requested period (X days/weeks/months backwards)
    const dataPoints: { dateKey: string; name: string; newsletters: number }[] = [];
    const today = new Date();

    for (let i = chartDuration - 1; i >= 0; i--) {
      const d = new Date();
      let dateKey = '';
      let name = '';

      if (chartUnit === 'day') {
        d.setDate(today.getDate() - i);
        dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
        name = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      } else if (chartUnit === 'week') {
        // Go back i weeks
        d.setDate(today.getDate() - (i * 7));
        // Find Monday of that week
        const day = d.getDay() || 7; // Get current day number, converting Sun (0) to 7
        if (day !== 1) d.setHours(-24 * (day - 1)); // Set to Monday
        dateKey = d.toISOString().split('T')[0]; // Week Start Date
        // Format: "Sem [Num]" or just date range? Let's use date range for clarity "DD/MM"
        name = `${d.getDate()}/${d.getMonth() + 1}`;
      } else if (chartUnit === 'month') {
        d.setMonth(today.getMonth() - i);
        d.setDate(1); // Start of month
        dateKey = `${d.getFullYear()}-${d.getMonth()}`; // YYYY-MonthIndex
        name = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      }

      dataPoints.push({ dateKey, name, newsletters: 0 });
    }

    // 2. Aggregate Data
    newsletters.forEach(nl => {
      const nlDate = new Date(nl.created_at);
      let matchKey = '';

      if (chartUnit === 'day') {
        matchKey = nlDate.toISOString().split('T')[0];
      } else if (chartUnit === 'week') {
        const d = new Date(nlDate);
        const day = d.getDay() || 7;
        if (day !== 1) d.setHours(-24 * (day - 1));
        matchKey = d.toISOString().split('T')[0];
      } else if (chartUnit === 'month') {
        matchKey = `${nlDate.getFullYear()}-${nlDate.getMonth()}`;
      }

      const point = dataPoints.find(p => p.dateKey === matchKey);
      if (point) point.newsletters += 1;
    });

    return dataPoints;
  }, [newsletters, chartUnit, chartDuration, isLoading]);

  // Derived Lists
  const draftNewsletters = newsletters.filter(n => n.status === 'draft').slice(0, 5);
  const sentNewsletters = newsletters.filter(n => n.status === 'sent').slice(0, 5);

  const handleNavigateNewsletter = (id: string) => {
    startTransition(() => {
      navigate(`/newsletters/${id}`);
    });
  };

  const ChartControls = () => (
    <div className="flex items-center space-x-2 text-sm z-10 relative">
      <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
        <select
          value={chartUnit}
          onChange={(e) => setChartUnit(e.target.value as any)}
          className="bg-transparent border-none focus:ring-0 text-gray-600 font-medium py-1 pl-2 pr-8 text-sm cursor-pointer hover:text-primary transition-colors outline-none"
        >
          <option value="day">Jours</option>
          <option value="week">Semaines</option>
          <option value="month">Mois</option>
        </select>
      </div>
      <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
        <span className="text-gray-400 px-2 font-medium text-xs uppercase">Derniers</span>
        <input
          type="number"
          min="1"
          max="52"
          value={chartDuration}
          onChange={(e) => setChartDuration(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-12 bg-transparent border-none focus:ring-0 text-center font-bold text-gray-900 border-l border-gray-200 outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-gray-500">Vue d'ensemble de votre activité.</p>
        </div>
        <button
          onClick={() => startTransition(() => navigate('/tutorial'))}
          className="bg-primary hover:bg-[#ffca28] text-gray-900 px-6 py-3 rounded-2xl font-bold flex items-center shadow-lg transition-all hover:-translate-y-1 active:scale-95"
        >
          <BookOpen size={20} className="mr-2" />
          Tutoriel d'utilisation
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Campagnes"
          value={String(newsletters.length)}
          trend={0}
          icon={Mail}
          subtitle="Total créé"
        />
        <StatCard
          title="Abonnés"
          value={String(totalSubscribers)}
          trend={0}
          icon={Briefcase}
          subtitle="Audience totale"
        />
        <StatCard
          title="Taux d'ouverture"
          value={`${globalStats.avgOpenRate}%`}
          trend={0}
          icon={Percent}
          subtitle="Moyenne globale"
        />
        <StatCard
          title="Emails envoyés"
          value={String(globalStats.totalSent)}
          trend={0}
          icon={CheckCircle}
          subtitle="Volume total"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-visible">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Volume de création</h3>
              <ChartControls />
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="newsletters"
                    stroke="#FFD54F"
                    strokeWidth={4}
                    dot={{ fill: '#FFD54F', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, stroke: '#FFD54F', strokeWidth: 2 }}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drafts Section */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Brouillons en cours</h3>
              <Link to="/newsletters?status=draft" className="text-sm font-bold text-primary hover:underline">Tout voir</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {draftNewsletters.length > 0 ? (
                draftNewsletters.map((nl) => (
                  <div key={nl.id} onClick={() => handleNavigateNewsletter(nl.id)} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 text-orange-400 rounded-xl flex items-center justify-center">
                        <ArrowRight size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900 truncate max-w-[200px]">{nl.subject || "Sans sujet"}</p>
                        <p className="text-xs text-gray-500">Modifié le {new Date(nl.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Brouillon
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">Aucun brouillon en cours.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Recent Activity & Top Brands (Placeholder for now, just recent sends) */}
        <div className="space-y-6">
          {/* Recent Sends */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Derniers envois</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {isLoading ? (
                <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
              ) : sentNewsletters.length > 0 ? (
                sentNewsletters.map((nl) => (
                  <div key={nl.id} onClick={() => handleNavigateNewsletter(nl.id)} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                        <CheckCircle size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900 truncate max-w-[150px]">{nl.subject || "Sans sujet"}</p>
                        <p className="text-xs text-gray-500">Envoyé le {new Date(nl.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-gray-400 text-sm">Aucun envoi récent.</div>
              )}
            </div>
            <button
              onClick={() => startTransition(() => navigate('/newsletters'))}
              className="p-4 text-center text-xs font-bold text-gray-400 hover:text-gray-900 border-t border-gray-50 transition-colors"
            >
              Voir tout l'historique
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;