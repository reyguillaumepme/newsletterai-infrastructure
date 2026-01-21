
import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Briefcase, Trash2, Edit3, Loader2, X, AlertCircle, Settings, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { Brand } from '../types';

const Brands: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newBrand, setNewBrand] = useState({
    brand_name: '',
    description: '',
    target_audience: '',
    editorial_tone: ''
  });

  const loadBrands = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await databaseService.fetchBrands();
      setBrands(data || []);
    } catch (err: any) {
      console.error("Load Brands Failure:", err);
      setError(err.message || "Erreur de connexion à l'infrastructure cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    
    try {
      await databaseService.createBrand(newBrand);
      setIsModalOpen(false);
      setNewBrand({ brand_name: '', description: '', target_audience: '', editorial_tone: '' });
      await loadBrands();
    } catch (err: any) {
      console.error("Create Brand Failure:", err);
      setError(`Erreur infrastructure : ${err.message}. Veuillez vérifier la console Admin.`);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredBrands = brands.filter(b => b.brand_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Vos Marques</h2>
          <p className="text-gray-500">Gérez les identités et stratégies de vos newsletters.</p>
        </div>
        <button 
          onClick={() => { setError(null); setIsModalOpen(true); }}
          className="bg-primary hover:bg-[#ffca28] text-gray-900 px-6 py-3 rounded-2xl font-bold flex items-center shadow-lg transition-all hover:-translate-y-1"
        >
          <Plus size={20} className="mr-2" /> Nouvelle marque
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Rechercher une marque..."
          className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-lg shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] animate-in shake duration-500">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm shrink-0">
              <AlertTriangle size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800">Erreur d'infrastructure Cloud</h3>
              <p className="text-red-700 text-sm leading-relaxed max-w-xl">
                {error}
              </p>
            </div>
            <button 
              onClick={() => navigate('/admin')}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2"
            >
              <Settings size={18} /> Réparer via SQL
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : filteredBrands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.map((brand) => (
            <Link to={`/brands/${brand.id}`} key={brand.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1 flex flex-col h-full overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-700 group-hover:bg-primary transition-colors">
                  <Briefcase size={28} />
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><MoreVertical size={20} /></button>
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{brand.brand_name}</h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">{brand.description}</p>
              <div className="mt-auto pt-6 flex items-center justify-between border-t border-gray-50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">{brand.target_audience}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit3 size={18} className="text-gray-400" />
                  <Trash2 size={18} className="text-red-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6"><Search size={48} /></div>
          <h3 className="text-2xl font-bold mb-2">Aucune marque trouvée</h3>
          <p className="text-gray-400 max-w-sm">Commencez par créer votre première identité de marque.</p>
        </div>
      )}

      {/* MODAL CREATION MARQUE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <Plus size={24} className="text-primary" />
                  Créer une Marque
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleCreateBrand} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nom de la marque</label>
                    <input required value={newBrand.brand_name} onChange={e => setNewBrand({...newBrand, brand_name: e.target.value})} type="text" placeholder="Ex: AI Trends Weekly" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm font-medium"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Audience cible</label>
                    <input required value={newBrand.target_audience} onChange={e => setNewBrand({...newBrand, target_audience: e.target.value})} type="text" placeholder="Ex: Entrepreneurs, CTOs" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm font-medium"/>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ton éditorial</label>
                  <input required value={newBrand.editorial_tone} onChange={e => setNewBrand({...newBrand, editorial_tone: e.target.value})} type="text" placeholder="Ex: Expert, minimaliste et visionnaire" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm font-medium"/>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description courte</label>
                  <textarea required value={newBrand.description} onChange={e => setNewBrand({...newBrand, description: e.target.value})} rows={3} placeholder="De quoi parle votre marque ?" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-primary/20 transition-all resize-none text-sm font-medium"/>
                </div>

                <button type="submit" disabled={isCreating} className="w-full py-4 bg-primary text-gray-900 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
                  {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  Enregistrer la marque
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brands;
