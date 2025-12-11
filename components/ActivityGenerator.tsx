import React, { useState, useEffect } from 'react';
import { Activity, FocusArea } from '../types';
import { generateActivities } from '../services/geminiService';
import { Loader2, Sparkles, BookOpen, Clock, ShieldCheck, Bookmark, History, Trash2, ArrowLeft, Brain } from 'lucide-react';

interface Props {
  babyAge: number;
}

const ActivityGenerator: React.FC<Props> = ({ babyAge }) => {
  const [selectedFocus, setSelectedFocus] = useState<FocusArea>(FocusArea.MOTOR_KASAR);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // History State
  const [savedActivities, setSavedActivities] = useState<Activity[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('keinara_saved_activities');
    if (saved) {
      setSavedActivities(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('keinara_saved_activities', JSON.stringify(savedActivities));
  }, [savedActivities]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setActivities([]);
    setShowHistory(false);
    try {
      const results = await generateActivities(babyAge, selectedFocus);
      if (results.length === 0) {
          setError("Maaf, gagal membuat rekomendasi. Coba lagi nanti.");
      }
      setActivities(results);
    } catch (err) {
      setError('Gagal menghubungi layanan AI.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveActivity = (activity: Activity) => {
    const isSaved = savedActivities.some(a => a.title === activity.title);
    if (isSaved) {
      setSavedActivities(prev => prev.filter(a => a.title !== activity.title));
    } else {
      setSavedActivities(prev => [activity, ...prev]);
    }
  };

  const isActivitySaved = (title: string) => {
    return savedActivities.some(a => a.title === title);
  };

  // Render Activity Card Helper
  const renderActivityCard = (activity: Activity, index: number, isHistoryView: boolean = false) => (
    <div
      key={`${activity.title}-${index}`}
      className="bg-white rounded-2xl p-6 shadow-md border-l-4 border-blue-500 transition-all hover:-translate-y-1 relative group"
    >
      <div className="flex justify-between items-start mb-3 pr-8">
        <h3 className="text-lg font-bold text-gray-800">{activity.title}</h3>
        <span className="flex items-center text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap ml-2">
          <Clock className="w-3 h-3 mr-1" />
          {activity.duration}
        </span>
      </div>

      <button 
        onClick={() => toggleSaveActivity(activity)}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
        title={isActivitySaved(activity.title) ? "Hapus dari simpanan" : "Simpan aktivitas"}
      >
        <Bookmark 
          className={`w-5 h-5 ${isActivitySaved(activity.title) ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} 
        />
      </button>

      <div className="mb-4">
        <p className="text-sm text-gray-600 italic flex items-start gap-2 bg-yellow-50 p-2 rounded-lg">
            <BookOpen className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            {activity.benefits}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Bahan-bahan:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {activity.materials.map((m, i) => (
                  <li key={i}>{m}</li>
                  ))}
              </ul>
          </div>
          <div>
               <h4 className="text-sm font-semibold text-gray-700 mb-2">Cara Bermain:</h4>
               <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  {activity.instructions.map((step, i) => (
                  <li key={i} className="leading-relaxed">{step}</li>
                  ))}
              </ol>
          </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 p-3 rounded-lg mt-2">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span className="font-medium">Safety: {activity.safetyTip}</span>
      </div>

      {isHistoryView && (
        <button 
          onClick={() => toggleSaveActivity(activity)}
          className="mt-4 flex items-center gap-1 text-red-500 text-sm font-medium hover:text-red-700 w-full justify-end"
        >
          <Trash2 className="w-4 h-4" /> Hapus
        </button>
      )}
    </div>
  );

  if (showHistory) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setShowHistory(false)}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Kembali ke Generator
          </button>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Riwayat Tersimpan
          </h2>
        </div>

        {savedActivities.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Belum ada aktivitas yang disimpan.</p>
            <p className="text-sm text-gray-400">Tandai aktivitas favorit Anda untuk melihatnya di sini.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-1">
            {savedActivities.map((activity, index) => renderActivityCard(activity, index, true))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Generator Aktivitas Pintar
          </h2>
          <button
            onClick={() => setShowHistory(true)}
            className="text-sm flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors font-medium"
          >
            <History className="w-4 h-4" />
            Riwayat
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fokus Perkembangan
            </label>
            <select
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value as FocusArea)}
              className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50 focus:ring-2 focus:ring-blue-400 outline-none text-gray-700"
            >
              {Object.values(FocusArea).map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Brain className="w-5 h-5 animate-pulse" />
                <span className="animate-pulse">AI Sedang Berpikir...</span>
              </>
            ) : (
              'Buat Rencana Main'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-1">
        {activities.map((activity, index) => renderActivityCard(activity, index))}
      </div>
    </div>
  );
};

export default ActivityGenerator;