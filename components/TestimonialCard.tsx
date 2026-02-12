
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

export interface Testimonial {
    id: string;
    text: string;
    author: string;
    role: string;
    initial: string;
    avatarColor: string;
    bgGradient: string;
}

interface TestimonialCardProps {
    data: Testimonial;
    onNext: () => void;
    onPrev: () => void;
    isBackground?: boolean;
}

export default function TestimonialCard({ data, onNext, onPrev, isBackground = false }: TestimonialCardProps) {
    return (
        <div className={`relative w-full h-full bg-white rounded-[30px] overflow-hidden flex flex-col border border-zinc-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all ${isBackground ? 'brightness-95 grayscale-[0.3] shadow-none' : 'ring-1 ring-black/5'}`}>

            {/* Dynamic Background - subtle gradient */}
            {!isBackground && (
                <div className="absolute inset-0 rounded-[30px] shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] pointer-events-none z-20" />
            )}
            <div
                className="absolute inset-0 opacity-30 pointer-events-none transition-colors duration-500"
                style={{ background: `linear-gradient(to bottom, ${data.bgGradient}, #ffffff)` }}
            />

            {/* Content Section */}
            <div className="flex-1 px-8 flex flex-col relative z-10 pt-10 pb-4 justify-between">

                {/* Quote Icon */}
                <div className="text-primary/20 mb-4">
                    <Quote size={48} fill="currentColor" />
                </div>

                {/* Testimonial Text */}
                <motion.div
                    layoutId={`text-${data.id}`}
                    className="font-display text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-snug"
                >
                    "{data.text}"
                </motion.div>

                {/* Author Section (Replaces Player) */}
                <div className="mt-8 bg-white/80 rounded-[24px] p-4 flex items-center gap-4 shadow-lg shadow-zinc-200/50 border border-white/50 backdrop-blur-md relative overflow-hidden group ring-1 ring-black/5">

                    {/* Avatar */}
                    <div className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-black/5 flex items-center justify-center font-bold text-lg ${data.avatarColor}`}>
                        {data.initial}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-slate-900 font-bold text-base truncate">{data.author}</h3>
                        <p className="text-slate-500 text-xs truncate font-medium uppercase tracking-wide">{data.role}</p>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
