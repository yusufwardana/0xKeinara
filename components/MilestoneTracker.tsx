import React, { useState, useEffect } from 'react';
import { FocusArea, Milestone } from '../types';
import { CheckCircle2, Circle, Filter } from 'lucide-react';
import { getMilestoneAdvice } from '../services/geminiService';

interface Props {
  babyAge: number;
}

// Static basic milestones to ensure app works without AI initially, 
// could be expanded dynamically if needed.
const BASE_MILESTONES: Milestone[] = [
  { id: '1', ageRange: '3-6', category: FocusArea.MOTOR_KASAR, description: 'Mengangkat kepala saat tengkurap', checked: false },
  { id: '2', ageRange: '3-6', category: FocusArea.SOSIAL, description: 'Tersenyum spontan pada orang lain', checked: false },
  { id: '3', ageRange: '3-6', category: FocusArea.KOMUNIKASI, description: 'Menoleh ke arah suara', checked: false },
  { id: '4', ageRange: '6-9', category: FocusArea.MOTOR_KASAR, description: 'Duduk tanpa sandaran', checked: false },
  { id: '5', ageRange: '6-9', category: FocusArea.MOTOR_HALUS, description: 'Memindahkan benda dari satu tangan ke tangan lain', checked: false },
  { id: '6', ageRange: '9-12', category: FocusArea.MOTOR_KASAR, description: 'Merangkak atau merayap', checked: false },
  { id: '7', ageRange: '9-12', category: FocusArea.KOMUNIKASI, description: 'Meniru suara sederhana (ma-ma, da-da)', checked: false },
  { id: '8', ageRange: '9-12', category: FocusArea.KOGNITIF, description: 'Memahami konsep "tidak" (meski kadang melanggar)', checked: false },
];

const MilestoneTracker: React.FC<Props> = ({ babyAge }) => {
  const [milestones, setMilestones] = useState<Milestone[]>(BASE_MILESTONES);
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FocusArea | 'Semua'>('Semua');

  // Filter relevant milestones roughly based on age input AND selected category
  const relevantMilestones = milestones.filter(m => {
      const [min, max] = m.ageRange.split('-').map(Number);
      // Show milestones if baby is within or just past the range
      const isAgeRelevant = babyAge >= min;
      const isCategoryRelevant = selectedCategory === 'Semua' || m.category === selectedCategory;
      
      return isAgeRelevant && isCategoryRelevant;
  });

  useEffect(() => {
    const fetchAdvice = async () => {
        setLoadingAdvice(true);
        const text = await getMilestoneAdvice(babyAge);
        setAdvice(text);
        setLoadingAdvice(false);
    };
    fetchAdvice();
  }, [babyAge]);

  const toggleMilestone = (id: string) => {
    setMilestones(prev => prev.map(m => 
      m.id === id ? { ...m, checked: !m.checked } : m
    ));
  };

  const calculateProgress = () => {
      // Calculate progress based on age-relevant milestones (ignoring category filter for overall progress)
      const ageRelevant = milestones.filter(m => {
          const [min] = m.ageRange.split('-').map(Number);
          return babyAge >= min;
      });

      if (ageRelevant.length === 0) return 0;
      const checked = ageRelevant.filter(m => m.checked).length;
      return Math.round((checked / ageRelevant.length) * 100);
  };

  const categories = ['Semua', ...Object.values(FocusArea)];

  return (
    <div className="space-y-6">
       {/* Summary Card */}
       <div className="bg-gradient-to-r from-green-400 to-teal-500 rounded-2xl p-6 text-white shadow-lg">
           <h2 className="text-2xl font-bold mb-2">Perkembangan Bulan ke-{babyAge}</h2>
           <p className="opacity-90 text-sm leading-relaxed min-h-[60px]">
               {loadingAdvice ? "Memuat info perkembangan..." : advice}
           </p>
           <div className="mt-4 bg-white/20 rounded-full h-2 w-full">
               <div 
                className="bg-white h-full rounded-full transition-all duration-500" 
                style={{ width: `${calculateProgress()}%`}}
               />
           </div>
           <div className="text-right text-xs mt-1 font-medium">{calculateProgress()}% Milestones Tercapai</div>
       </div>

       {/* Checklist */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="p-4 bg-gray-50 border-b border-gray-100">
               <div className="flex items-center gap-2 mb-4">
                 <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter Kategori
                 </h3>
               </div>
               
               {/* Category Filters */}
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 {categories.map((cat) => (
                   <button
                     key={cat}
                     onClick={() => setSelectedCategory(cat as FocusArea | 'Semua')}
                     className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                       selectedCategory === cat
                         ? 'bg-green-500 text-white border-green-500'
                         : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                     }`}
                   >
                     {cat}
                   </button>
                 ))}
               </div>
           </div>

           <div className="divide-y divide-gray-100">
               {relevantMilestones.length > 0 ? (
                   relevantMilestones.map((item) => (
                       <div 
                        key={item.id} 
                        onClick={() => toggleMilestone(item.id)}
                        className="p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                       >
                           <div className={`mt-1 flex-shrink-0 ${item.checked ? 'text-green-500' : 'text-gray-300'}`}>
                               {item.checked ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                           </div>
                           <div>
                               <p className={`text-gray-800 font-medium ${item.checked ? 'line-through text-gray-400' : ''}`}>
                                   {item.description}
                               </p>
                               <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                                   {item.category}
                               </span>
                           </div>
                       </div>
                   ))
               ) : (
                   <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                       <p>Belum ada milestone untuk kategori ini.</p>
                       {selectedCategory !== 'Semua' && (
                         <button 
                           onClick={() => setSelectedCategory('Semua')}
                           className="text-green-600 text-sm font-medium hover:underline"
                         >
                           Tampilkan Semua
                         </button>
                       )}
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default MilestoneTracker;