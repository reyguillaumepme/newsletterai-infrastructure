import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AnalyticsCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color?: string;
    subtext?: string;
    isLoading?: boolean;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
    label,
    value,
    icon: Icon,
    color = "text-blue-600",
    subtext,
    isLoading = false
}) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between min-w-[200px]">
            <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
                {isLoading ? (
                    <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md" />
                ) : (
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-extrabold text-slate-800">{value}</h3>
                        {subtext && <span className="text-xs text-slate-400 font-medium">{subtext}</span>}
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                <Icon className={color} size={24} />
            </div>
        </div>
    );
};

export default AnalyticsCard;
