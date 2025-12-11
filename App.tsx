import React, { useState } from 'react';
import { Baby, Activity as ActivityIcon, ListChecks, Eye } from 'lucide-react';
import ActivityGenerator from './components/ActivityGenerator';
import VisualStimulator from './components/VisualStimulator';
import MilestoneTracker from './components/MilestoneTracker';

type View = 'activities' | 'visual' | 'milestones';

const App: React.FC = () => {
  const [babyAge, setBabyAge] = useState<number>(6); // Default 6 months
  const [currentView, setCurrentView] = useState<View>('activities');

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-gray-800 pb-24 md:pb-0">
      {/* Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-xl">
              <Baby className="w-6 h-6 text-orange-500" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              0xKeinara
            </h1>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <span className="text-sm font-medium text-gray-600">Usia:</span>
            <select 
              value={babyAge} 
              onChange={(e) => setBabyAge(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer"
            >
              {Array.from({ length: 10 }, (_, i) => i + 3).map(age => (
                <option key={age} value={age}>{age} Bulan</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div key={currentView} className="animate-fade-in">
          {currentView === 'activities' && (
            <div>
              <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Rekomendasi Aktivitas</h2>
                  <p className="text-gray-500">Ide bermain sesuai umur untuk stimulasi optimal.</p>
              </div>
              <ActivityGenerator babyAge={babyAge} />
            </div>
          )}

          {currentView === 'visual' && (
             <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Stimulasi Visual</h2>
                  <p className="text-gray-500">Latih fokus dan pelacakan mata si kecil.</p>
              </div>
              <VisualStimulator />
            </div>
          )}

          {currentView === 'milestones' && (
             <div>
               <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Jurnal Perkembangan</h2>
                  <p className="text-gray-500">Pantau tumbuh kembang si kecil setiap bulan.</p>
              </div>
              <MilestoneTracker babyAge={babyAge} />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation (Mobile First) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          <button 
            onClick={() => setCurrentView('activities')}
            className={`flex flex-col items-center gap-1 ${currentView === 'activities' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <ActivityIcon className="w-6 h-6" />
            <span className="text-xs font-medium">Aktivitas</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('visual')}
            className={`flex flex-col items-center gap-1 ${currentView === 'visual' ? 'text-orange-600' : 'text-gray-400'}`}
          >
            <Eye className="w-6 h-6" />
            <span className="text-xs font-medium">Visual</span>
          </button>

          <button 
            onClick={() => setCurrentView('milestones')}
            className={`flex flex-col items-center gap-1 ${currentView === 'milestones' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <ListChecks className="w-6 h-6" />
            <span className="text-xs font-medium">Milestone</span>
          </button>
        </div>
      </nav>

      {/* Desktop Navigation (Visible only on md+) */}
      <div className="hidden md:flex fixed top-24 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full border border-gray-200 p-1.5 z-40">
         <button 
            onClick={() => setCurrentView('activities')}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${currentView === 'activities' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Aktivitas
          </button>
          <button 
            onClick={() => setCurrentView('visual')}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${currentView === 'visual' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Visual
          </button>
          <button 
            onClick={() => setCurrentView('milestones')}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${currentView === 'milestones' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Milestone
          </button>
      </div>
    </div>
  );
};

export default App;