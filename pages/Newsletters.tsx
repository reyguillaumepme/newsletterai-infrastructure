import React, { useState, useEffect, useTransition } from 'react';
import { Plus, Search, ChevronDown, ChevronUp, Mail, Clock, CheckCircle2, FileText, Loader2, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { Newsletter, Brand } from '../types';

const Newsletters: React.FC = () => {
  const navigate = useNavigate();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSentNewsletters, setShowSentNewsletters] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [newslettersData, brandsData] = await Promise.all([
        databaseService.fetchNewsletters(),
        databaseService.fetchBrands()
      ]);
      setNewsletters(Array.isArray(newslettersData) ? newslettersData : []);
      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleNavigate = (id: string) => {
    startTransition(() => {
      navigate(`/newsletters/${id}`);
    });
  };

  // Generate color from brand name (consistent hash-based color)
  const getBrandColor = (brandName: string): string => {
    let hash = 0;
    for (let i = 0; i < brandName.length; i++) {
      hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 95%)`;
  };

  const getBrandTextColor = (brandName: string): string => {
    let hash = 0;
    for (let i = 0; i < brandName.length; i++) {
      hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  // Filter newsletters
  const filteredNewsletters = newsletters.filter(nl => {
    const matchesBrand = selectedBrandId === 'all' || nl.brand_id === selectedBrandId;
    const matchesSearch = !searchQuery ||
      nl.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nl.brands?.brand_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBrand && matchesSearch;
  });

  // Group by status
  const groupedNewsletters = {
    drafts: filteredNewsletters.filter(nl => nl.status === 'draft'),
    scheduled: filteredNewsletters.filter(nl => nl.status === 'scheduled'),
    sent: filteredNewsletters.filter(nl => nl.status === 'sent')
  };

  // BrandBadge Component
  const BrandBadge: React.FC<{ newsletter: Newsletter }> = ({ newsletter }) => {
    const brandName = newsletter.brands?.brand_name || 'Sans marque';
    const bgColor = getBrandColor(brandName);
    const textColor = getBrandTextColor(brandName);

    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {newsletter.brands?.logo_url && (
          <img src={newsletter.brands.logo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
        )}
        <span>{brandName}</span>
      </div>
    );
  };

  // NewsletterCard Component
  const NewsletterCard: React.FC<{
    newsletter: Newsletter;
    size: 'large' | 'medium' | 'small';
  }> = ({ newsletter, size }) => {
    const sizeClasses = {
      large: 'h-[300px] p-6',
      medium: 'h-[200px] p-5',
      small: 'h-[80px] p-4'
    };

    const StatusIcon = () => {
      switch (newsletter.status) {
        case 'sent':
          return <CheckCircle2 size={16} className="text-green-600" />;
        case 'scheduled':
          return <Clock size={16} className="text-blue-600" />;
        default:
          return <FileText size={16} className="text-yellow-600" />;
      }
    };

    if (size === 'small') {
      return (
        <div
          onClick={() => handleNavigate(newsletter.id)}
          className="bg-white border border-gray-100 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 p-4 group"
        >
          <StatusIcon />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
              {newsletter.subject || '(Sans sujet)'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {new Date(newsletter.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <BrandBadge newsletter={newsletter} />
        </div>
      );
    }

    return (
      <div
        onClick={() => handleNavigate(newsletter.id)}
        className={`bg-white border border-gray-100 rounded-3xl hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer flex flex-col ${sizeClasses[size]} group`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <StatusIcon />
            <span className="text-xs font-bold text-gray-400 uppercase">
              {newsletter.status === 'draft' ? 'Brouillon' : newsletter.status === 'scheduled' ? 'Planifiée' : 'Envoyée'}
            </span>
          </div>
          <BrandBadge newsletter={newsletter} />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {newsletter.subject || '(Sans sujet)'}
          </h3>
          {size === 'large' && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Créé le {new Date(newsletter.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Mail size={14} />
                <span>Prêt à être envoyé</span>
              </div>
            </>
          )}
          {size === 'medium' && newsletter.scheduled_at && (
            <p className="text-sm text-blue-600 font-bold">
              📅 Envoi prévu : {new Date(newsletter.scheduled_at).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <button className="text-sm font-bold text-primary group-hover:underline">
            {newsletter.status === 'draft' ? 'Continuer l\'édition →' : 'Voir les détails →'}
          </button>
        </div>
      </div>
    );
  };

  // StatusSection Component
  const StatusSection: React.FC<{
    title: string;
    count: number;
    children: React.ReactNode;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
  }> = ({ title, count, children, collapsible = false, defaultCollapsed = false }) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    if (count === 0) return null;

    return (
      <div className="space-y-4">
        <div
          className={`flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''}`}
          onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        >
          <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
            {title} <span className="text-primary">({count})</span>
          </h3>
          {collapsible && (
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          )}
        </div>
        {!isCollapsed && children}
      </div>
    );
  };

  return (
    <div className={`space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Vos Newsletters</h2>
          <p className="text-gray-500">Rédigez, planifiez et suivez vos publications.</p>
        </div>
        <button
          onClick={() => handleNavigate('new')}
          className="bg-primary hover:bg-[#ffca28] text-gray-900 px-6 py-2 rounded-xl text-sm font-bold flex items-center shadow-sm transition-all"
        >
          <Plus size={18} className="mr-2" /> Nouvelle Newsletter
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par sujet ou marque..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {/* Brand Filter */}
          <div className="relative">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-all appearance-none bg-white cursor-pointer min-w-[200px]"
            >
              <option value="all">Toutes les marques</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <>
          {/* Drafts & Scheduled Section */}
          {(groupedNewsletters.drafts.length > 0 || groupedNewsletters.scheduled.length > 0) && (
            <StatusSection
              title="📝 BROUILLONS & PLANIFIÉES"
              count={groupedNewsletters.drafts.length + groupedNewsletters.scheduled.length}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedNewsletters.drafts.map(nl => (
                  <NewsletterCard key={nl.id} newsletter={nl} size="large" />
                ))}
                {groupedNewsletters.scheduled.map(nl => (
                  <NewsletterCard key={nl.id} newsletter={nl} size="medium" />
                ))}
              </div>
            </StatusSection>
          )}

          {/* Sent Section (Collapsible) */}
          <StatusSection
            title="✅ ENVOYÉES"
            count={groupedNewsletters.sent.length}
            collapsible
            defaultCollapsed={true}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedNewsletters.sent.map(nl => (
                <NewsletterCard key={nl.id} newsletter={nl} size="small" />
              ))}
            </div>
          </StatusSection>

          {/* Empty State */}
          {filteredNewsletters.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-gray-100">
              <Mail size={40} className="text-gray-200 mb-4" />
              <p className="text-gray-400">
                {searchQuery || selectedBrandId !== 'all'
                  ? 'Aucune newsletter ne correspond à vos critères.'
                  : 'Aucune newsletter. Commencez par en créer une !'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Newsletters;