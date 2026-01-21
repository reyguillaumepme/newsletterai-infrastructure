
import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trend: number;
  icon: LucideIcon;
  subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon: Icon, subtitle }) => {
  const isPositive = trend >= 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 rounded-xl text-gray-700">
          <Icon size={24} />
        </div>
        <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold mt-1 tracking-tight">{value}</h3>
        <p className="text-gray-400 text-xs mt-2">{subtitle}</p>
      </div>
    </div>
  );
};

export default StatCard;
