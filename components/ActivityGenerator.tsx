import React, { useState, useEffect, useRef } from 'react';
import { Activity, FocusArea } from '../types';
import { generateActivities } from '../services/geminiService';
import { Sparkles, BookOpen, Clock, ShieldCheck, Bookmark, History, Trash2, ArrowLeft, Brain, Camera, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  babyAge: number;
  exactAgeDisplay?: string; // e.g. "6 Bulan 12 Hari"
}

const LOADING_MESSAGES = [
  "AI sedang melihat foto mainan...",
  "Menganalisis objek untuk bayi...",
  "Merancang aktivitas aman & seru...",
  "Menyesuaikan dengan motorik...",
  "Menyusun instruksi permainan..."
];

const ActivityGenerator: React.FC<Props> = ({ babyAge, exactAgeDisplay }) => {
  const [selectedFocus, setSelectedFocus] = useState<FocusArea>(FocusArea.MOTOR_KASAR);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState('');
  
  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
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

  // Cycle loading messages
  useEffect(() => {
    let interval: number;
    if (loading) {
      setLoadingMsgIndex(0);
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // --- IMAGE HANDLING LOGIC ---
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran foto maksimal 5MB ya, Bunda.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Resize image to max 800px width/height to save bandwidth & token
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 jpeg with 0.7 quality
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          // Remove prefix for API consumption (keeping it for display though)
          setSelectedImage(resizedBase64);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setActivities([]);
    setShowHistory(false);
    
    // Prepare Base64 string for API (remove data:image/jpeg;base64, prefix)
    const base64Data = selectedImage ? selectedImage.split(',')[1] : null;

    try {
      const results = await generateActivities(babyAge, selectedFocus, exactAgeDisplay, base64Data);
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
              Fokus Perkembangan <span className="text-gray-400 font-normal">(Usia: {exactAgeDisplay})</span>
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

          {/* Snap & Play Section */}
          <div className="border border-dashed border-blue-300 rounded-xl p-4 bg-blue-50/50">
             <div className="flex justify-between items-center mb-2">
                 <label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                     <Camera className="w-4 h-4" /> Snap & Play (Opsional)
                 </label>
                 {selectedImage && (
                     <button onClick={clearImage} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                         <X className="w-3 h-3" /> Hapus Foto
                     </button>
                 )}
             </div>
             
             {!selectedImage ? (
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer h-24 flex flex-col items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-100/50 transition-colors rounded-lg border-2 border-transparent hover:border-blue-200"
                 >
                     <ImageIcon className="w-8 h-8 mb-1" />
                     <span className="text-xs">Foto mainan / barang di sekitar</span>
                     <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleImageUpload}
                     />
                 </div>
             ) : (
                 <div className="relative h-40 w-full rounded-lg overflow-hidden group">
                     <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-white text-xs font-medium">Foto siap dianalisis AI</span>
                     </div>
                 </div>
             )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Brain className="w-5 h-5 animate-pulse" />
                <span className="animate-pulse w-48 text-left">{LOADING_MESSAGES[loadingMsgIndex]}</span>
              </>
            ) : (
              selectedImage ? 'Analisis Foto & Buat Aktivitas' : 'Buat Rencana Main Hari Ini'
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