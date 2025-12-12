import React, { useState, useEffect } from 'react';
import { Baby, Activity as ActivityIcon, ListChecks, Eye, Settings, Calendar, User } from 'lucide-react';
import ActivityGenerator from './components/ActivityGenerator';
import VisualStimulator from './components/VisualStimulator';
import MilestoneTracker from './components/MilestoneTracker';
import { calculateAge, AgeDetail } from './utils/ageCalculator';

type View = 'activities' | 'visual' | 'milestones';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('activities');
  
  // Profile State
  const [babyName, setBabyName] = useState('Keinara');
  const [birthDate, setBirthDate] = useState<string>('');
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
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-gray-800 pb-24 md:pb-0">
      
      {/* Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Baby className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Profil Si Kecil</h2>
              <p className="text-gray-500 text-sm">Kami butuh data ini untuk menghitung usia presisi.</p>
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
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-400 outline-none"
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
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-400 outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
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
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-xl">
              <Baby className="w-6 h-6 text-orange-500" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent hidden sm:block">
              0xKeinara
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