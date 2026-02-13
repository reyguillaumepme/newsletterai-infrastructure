import React, { useState, useEffect, useTransition, useRef } from 'react';
import {
  Mail,
  MousePointer2,
  Eye,
  RefreshCcw,
  ChevronDown,
  Loader2,
  TrendingUp,
  Check,
  Building
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
import { mailService } from '../services/mailService';
import { databaseService } from '../services/databaseService';
import { Statistics as StatsType, Brand } from '../types';

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [displayedStats, setDisplayedStats] = useState<any[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');

  const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);

  const campaignDropdownRef = useRef<HTMLDivElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setIsLoading(true);
    const [statsData, brandsData] = await Promise.all([
      mailService.getAllCampaignStatistics(),
      databaseService.fetchBrands()
    ]);

    // Sort by date desc
    const sortedStats = Array.isArray(statsData) ? statsData.sort((a: any, b: any) => new Date(b.full_date).getTime() - new Date(a.full_date).getTime()) : [];

    startTransition(() => {
      setStats(sortedStats);
      setBrands(brandsData);
      // Initialize displayed stats with sorted data
      // Filter availability depends on if a brand was already selected (persisted state logic?)
      // For now, reset to all or keep current selection logic in useEffect
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let filtered = stats;

    if (selectedBrandId !== 'all') {
      filtered = filtered.filter(s => s.brand_id === selectedBrandId);
    }

    if (selectedCampaignId !== 'all') {
      // If a campaign is selected, check if it belongs to selected brand (if any)
      // If user switches brand, we might need to reset campaign selection if it doesn't match
      const campaign = stats.find(s => s.id === selectedCampaignId);
      if (campaign && (selectedBrandId === 'all' || campaign.brand_id === selectedBrandId)) {
        filtered = filtered.filter(s => s.id === selectedCampaignId);
      } else {
        // Campaign doesn't match selected brand, strictly speaking we should reset selectedCampaignId,
        // but inside this effect we just filter. 
        // Better to handle reset in the brand selection handler or another effect?
        // Let's filter strictly here.
        filtered = filtered.filter(s => s.id === selectedCampaignId);
      }
    }

    setDisplayedStats(filtered);
  }, [selectedCampaignId, selectedBrandId, stats]);

  // Reset campaign when brand changes
  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    setSelectedCampaignId('all'); // Reset campaign selection to avoid mismatch
    setIsBrandDropdownOpen(false);
  };

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
        setIsCampaignDropdownOpen(false);
      }
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await loadData();
    setIsSyncing(false);
  };

  const totalSent = displayedStats.reduce((acc, curr) => acc + (Number(curr.sent_count) || 0), 0);
  const totalOpens = displayedStats.reduce((acc, curr) => acc + (Number(curr.opens) || 0), 0);
  const totalClicks = displayedStats.reduce((acc, curr) => acc + (Number(curr.clicks) || 0), 0);

  const avgOpenRate = totalSent > 0 ? (totalOpens / totalSent * 100).toFixed(1) : "0";
  const avgClickRate = totalOpens > 0 ? (totalClicks / totalOpens * 100).toFixed(1) : "0";

  const selectedCampaign = stats.find(s => s.id === selectedCampaignId);
  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  // Filter available campaigns based on selected Brand
  const availableCampaigns = selectedBrandId === 'all'
    ? stats
    : stats.filter(s => s.brand_id === selectedBrandId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Top Header with Title and Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Statistiques Performance</h2>
          <p className="text-gray-500">Données issues de vos dernières campagnes.</p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">

          {/* Brand Filter */}
          <div className="relative w-full md:w-auto" ref={brandDropdownRef}>
            <button
              onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
              className="w-full md:w-[240px] bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-sm text-sm text-left flex items-center gap-2 relative transition-all hover:border-gray-300"
            >
              {selectedBrandId === 'all' ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <Building size={14} className="text-gray-500" />
                  </div>
                  <span className="truncate">Toutes les marques</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                    {selectedBrand?.logo_url ? (
                      <img src={selectedBrand.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-500">{selectedBrand?.brand_name?.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="truncate">{selectedBrand?.brand_name || "Marque inconnue"}</span>
                </>
              )}
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} size={16} />
            </button>

            {isBrandDropdownOpen && (
              <div className="absolute top-full mt-2 w-full min-w-[240px] right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="p-1">
                  <button
                    onClick={() => handleBrandChange('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedBrandId === 'all' ? 'bg-primary/10 text-primary-dark font-medium' : 'text-gray-700'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Building size={16} className="text-gray-500" />
                    </div>
                    <span className="flex-1">Toutes les marques</span>
                    {selectedBrandId === 'all' && <Check size={16} className="text-primary" />}
                  </button>

                  <div className="h-px bg-gray-100 my-1 mx-2"></div>

                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => handleBrandChange(brand.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedBrandId === brand.id ? 'bg-primary/10 text-primary-dark font-medium' : 'text-gray-700'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-gray-500">{brand.brand_name.substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="truncate flex-1">{brand.brand_name}</span>
                      {selectedBrandId === brand.id && <Check size={16} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Campaign Filter */}
          <div className="relative w-full md:w-auto" ref={campaignDropdownRef}>
            <button
              onClick={() => setIsCampaignDropdownOpen(!isCampaignDropdownOpen)}
              className="w-full md:w-[260px] bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-sm text-sm text-left flex items-center gap-2 relative transition-all hover:border-gray-300"
            >
              {selectedCampaignId === 'all' ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <TrendingUp size={14} className="text-gray-500" />
                  </div>
                  <span className="truncate">Toutes les campagnes</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                    {selectedCampaign?.image_url ? (
                      <img src={selectedCampaign.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Mail size={12} className="text-gray-400" />
                    )}
                  </div>
                  <span className="truncate">{selectedCampaign?.subject || "Sans titre"}</span>
                </>
              )}
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-200 ${isCampaignDropdownOpen ? 'rotate-180' : ''}`} size={16} />
            </button>

            {isCampaignDropdownOpen && (
              <div className="absolute top-full mt-2 w-full min-w-[300px] right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="p-1">
                  <button
                    onClick={() => { setSelectedCampaignId('all'); setIsCampaignDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedCampaignId === 'all' ? 'bg-primary/10 text-primary-dark font-medium' : 'text-gray-700'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={16} className="text-gray-500" />
                    </div>
                    <span className="flex-1">Toutes les campagnes</span>
                    {selectedCampaignId === 'all' && <Check size={16} className="text-primary" />}
                  </button>

                  <div className="h-px bg-gray-100 my-1 mx-2"></div>

                  {availableCampaigns.length > 0 ? (
                    availableCampaigns.map((stat) => (
                      <button
                        key={stat.id}
                        onClick={() => { setSelectedCampaignId(stat.id); setIsCampaignDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedCampaignId === stat.id ? 'bg-primary/10 text-primary-dark font-medium' : 'text-gray-700'}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                          {stat.image_url ? (
                            <img src={stat.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Mail size={16} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate font-medium">{stat.subject || "Sans titre"}</span>
                          <span className="text-xs text-gray-400">{stat.date}</span>
                        </div>
                        {selectedCampaignId === stat.id && <Check size={16} className="text-primary" />}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-gray-400 text-sm">
                      Aucune campagne trouvée pour cette marque.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="hidden md:flex bg-primary hover:bg-[#ffca28] text-gray-900 px-4 py-2 rounded-xl text-sm font-bold items-center shadow-sm transition-all disabled:opacity-50 h-[42px]"
          >
            {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
          </button>
        </div>
      </div>

      {/* Dynamic Context Section (Centered Image & Info) */}
      <div className="flex flex-col items-center justify-center text-center py-6">
        <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg border-4 border-white bg-gray-50 flex items-center justify-center mb-4 relative z-10">
          {selectedCampaignId === 'all' ? (
            selectedBrandId === 'all' ? (
              <img src="/assets/mascot_stats.png" alt="Mascot" className="w-full h-full object-cover" />
            ) : (
              selectedBrand?.logo_url ? (
                <img src={selectedBrand.logo_url} alt="Brand" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center text-2xl font-bold text-gray-900">
                  {selectedBrand?.brand_name?.substring(0, 2).toUpperCase()}
                </div>
              )
            )
          ) : (
            selectedCampaign?.image_url ? (
              <img src={selectedCampaign.image_url} alt="Campaign" className="w-full h-full object-cover" />
            ) : (
              <Mail size={40} className="text-gray-300" />
            )
          )}
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {selectedCampaignId === 'all' ? (
            selectedBrandId === 'all' ? (
              <p className="text-gray-500 font-medium">Visualisation des données globales de toutes les marques.</p>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900">{selectedBrand?.brand_name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">Statistiques globales pour cette marque.</p>
              </>
            )
          ) : (
            <>
              <h3 className="text-xl font-bold text-gray-900">{selectedCampaign?.subject || "Campagne sans titre"}</h3>
              <p className="text-sm text-gray-500 mt-0.5">Envoyée le {selectedCampaign?.date}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Emails envoyés"
          value={totalSent.toLocaleString()}
          trend={0}
          icon={Mail}
          subtitle={selectedCampaignId === 'all' ? "Volume total" : "Pour cette campagne"}
        />
        <StatCard
          title="Taux d'ouverture"
          value={`${avgOpenRate}%`}
          trend={0}
          icon={Eye}
          subtitle={`${totalOpens.toLocaleString()} ouvertures`}
        />
        <StatCard
          title="Taux de clic (CTOR)"
          value={`${avgClickRate}%`}
          trend={0}
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
          ) : displayedStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayedStats.slice(0, 10).reverse()}>
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