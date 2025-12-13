import React, { useState, useEffect } from 'react';
import { Baby, Activity as ActivityIcon, ListChecks, Eye, Settings, Calendar, User, Ruler, Weight, Utensils } from 'lucide-react';
import ActivityGenerator from './components/ActivityGenerator';
import VisualStimulator from './components/VisualStimulator';
import MilestoneTracker from './components/MilestoneTracker';
import MpasiChef from './components/MpasiChef';
import ChatAssistant from './components/ChatAssistant';
import { calculateAge, AgeDetail } from './utils/ageCalculator';
import { GrowthRecord } from './types';

type View = 'activities' | 'visual' | 'milestones' | 'mpasi';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('activities');
  
  // Profile State
  const [babyName, setBabyName] = useState('Keinara');
  const [birthDate, setBirthDate] = useState<string>('');
  const [initialWeight, setInitialWeight] = useState<string>('');
  const [initialHeight, setInitialHeight] = useState<string>('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [ageDetail, setAgeDetail] = useState<AgeDetail>({ months: 6, days: 0, totalDays: 180, display: '6 Bulan' });

  // Load Profile from Local Storage
  useEffect(() => {
    const savedName = localStorage.getItem('keinara_profile_name');
    const savedDate = localStorage.getItem('keinara_profile_dob');
    
    if (savedName) setBabyName(savedName);
    if (savedDate) {
      setBirthDate(savedDate);
      setAgeDetail(calculateAge(savedDate));
    } else {
      setIsEditingProfile(true); // First time or no data
    }
  }, []);

  // Save Profile Handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('keinara_profile_name', babyName);
    localStorage.setItem('keinara_profile_dob', birthDate);
    setAgeDetail(calculateAge(birthDate));
    
    // If weight/height provided during first setup, save as a record
    if (initialWeight && initialHeight) {
        const existingRecords = localStorage.getItem('keinara_growth_records');
        if (!existingRecords) {
            const ageInfo = calculateAge(birthDate);
            const initialRecord: GrowthRecord = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                ageMonths: ageInfo.months,
                weight: parseFloat(initialWeight),
                height: parseFloat(initialHeight)
            };
            localStorage.setItem('keinara_growth_records', JSON.stringify([initialRecord]));
        }
    }
    
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-gray-800 pb-24 md:pb-0 relative">
      
      {/* GLOBAL CHAT ASSISTANT */}
      <ChatAssistant babyName={babyName} ageDisplay={ageDetail.display} />
      
      {/* Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Baby className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Profil Si Kecil</h2>
              <p className="text-gray-500 text-sm">Data untuk personalisasi aktivitas & grafik.</p>
            </div>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Panggilan</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    value={babyName}
                    onChange={(e) => setBabyName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                    placeholder="Contoh: Keinara"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="date" 
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>

              {/* Optional: Only show for initial setup if no records exist */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Berat Saat Ini (kg)</label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <input 
                        type="number" 
                        step="0.01"
                        value={initialWeight}
                        onChange={(e) => setInitialWeight(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tinggi Saat Ini (cm)</label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <input 
                        type="number" 
                        step="0.1"
                        value={initialHeight}
                        onChange={(e) => setInitialHeight(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                        placeholder="0.0"
                      />
                    </div>
                  </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Simpan Profil
              </button>
              
              {/* Optional: Cancel button if user wants to close without saving (only if data exists) */}
              {birthDate && (
                <button 
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="w-full text-gray-400 text-sm hover:text-gray-600"
                >
                  Batal
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Baby className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">
              Keinara
            </h1>
          </div>
          
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 pl-3 pr-2 py-1.5 rounded-full border border-gray-200 transition-colors group"
          >
            <div className="text-right">
              <p className="text-xs text-gray-500 font-medium leading-none mb-0.5">Halo, {babyName}</p>
              <p className="text-sm font-bold text-gray-800 leading-none">{ageDetail.display}</p>
            </div>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-500">
              <Settings className="w-4 h-4" />
            </div>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div key={currentView} className="animate-fade-in">
          {currentView === 'activities' && (
            <div>
              <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Rekomendasi Hari Ini</h2>
                  <p className="text-gray-500">Ide bermain spesifik untuk usia {ageDetail.display}.</p>
              </div>
              <ActivityGenerator 
                babyAge={ageDetail.months || 3} // Fallback to 3 if < 1 month, but logic handles 0
                exactAgeDisplay={ageDetail.display}
              />
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
                  <p className="text-gray-500">Pantau tumbuh kembang {babyName} setiap bulan.</p>
              </div>
              <MilestoneTracker babyAge={ageDetail.months || 3} />
            </div>
          )}

          {currentView === 'mpasi' && (
             <div>
               <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chef MPASI</h2>
                  <p className="text-gray-500">Buat resep lezat dari bahan yang ada di kulkas Bunda.</p>
              </div>
              <MpasiChef babyAge={ageDetail.months || 3} />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation (Mobile First) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          <button 
            onClick={() => setCurrentView('activities')}
            className={`flex flex-col items-center gap-1 ${currentView === 'activities' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <ActivityIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Main</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('visual')}
            className={`flex flex-col items-center gap-1 ${currentView === 'visual' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Eye className="w-5 h-5" />
            <span className="text-[10px] font-medium">Visual</span>
          </button>

          <button 
            onClick={() => setCurrentView('mpasi')}
            className={`flex flex-col items-center gap-1 ${currentView === 'mpasi' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-medium">MPASI</span>
          </button>

          <button 
            onClick={() => setCurrentView('milestones')}
            className={`flex flex-col items-center gap-1 ${currentView === 'milestones' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <ListChecks className="w-5 h-5" />
            <span className="text-[10px] font-medium">Jurnal</span>
          </button>
        </div>
      </nav>

      {/* Desktop Navigation (Visible only on md+) */}
      <div className="hidden md:flex fixed top-24 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full border border-gray-200 p-1.5 z-40">
         <button 
            onClick={() => setCurrentView('activities')}
            className={`px-5 py-2 rounded-full font-medium transition-colors text-sm flex items-center gap-2 ${currentView === 'activities' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ActivityIcon className="w-4 h-4" /> Aktivitas
          </button>
          <button 
            onClick={() => setCurrentView('visual')}
            className={`px-5 py-2 rounded-full font-medium transition-colors text-sm flex items-center gap-2 ${currentView === 'visual' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Eye className="w-4 h-4" /> Visual
          </button>
           <button 
            onClick={() => setCurrentView('mpasi')}
            className={`px-5 py-2 rounded-full font-medium transition-colors text-sm flex items-center gap-2 ${currentView === 'mpasi' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Utensils className="w-4 h-4" /> MPASI
          </button>
          <button 
            onClick={() => setCurrentView('milestones')}
            className={`px-5 py-2 rounded-full font-medium transition-colors text-sm flex items-center gap-2 ${currentView === 'milestones' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ListChecks className="w-4 h-4" /> Jurnal
          </button>
      </div>
    </div>
  );
};

export default App;