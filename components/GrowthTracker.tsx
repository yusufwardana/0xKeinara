import React, { useState, useEffect } from 'react';
import { GrowthRecord } from '../types';
import { analyzeGrowth } from '../services/geminiService';
import { Plus, Scale, Ruler, Calendar as CalendarIcon, TrendingUp, Activity } from 'lucide-react';

interface Props {
  babyName: string;
  gender: string;
  birthDate: string;
}

const GrowthTracker: React.FC<Props> = ({ babyName, gender, birthDate }) => {
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('keinara_growth_records');
    if (saved) {
      setRecords(JSON.parse(saved));
    }
    const savedAnalysis = localStorage.getItem('keinara_growth_analysis');
    if (savedAnalysis) {
      setAnalysis(savedAnalysis);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('keinara_growth_records', JSON.stringify(records));
  }, [records]);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: GrowthRecord = {
      id: Date.now().toString(),
      date,
      weight: parseFloat(weight),
      height: parseFloat(height)
    };
    
    // Add and sort by date descending
    const updated = [...records, newRecord].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecords(updated);
    
    // Reset form
    setWeight('');
    setHeight('');
    setShowForm(false);
    
    // Clear old analysis as data changed
    setAnalysis(''); 
    localStorage.removeItem('keinara_growth_analysis');
  };

  const handleAnalyze = async () => {
    if (records.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeGrowth(records, babyName, gender, birthDate);
      setAnalysis(result);
      localStorage.setItem('keinara_growth_analysis', result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getLastRecord = () => records.length > 0 ? records[0] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity className="w-24 h-24" />
        </div>
        
        <div className="relative z-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Pertumbuhan Terkini
            </h2>
            
            {getLastRecord() ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
                            <Scale className="w-4 h-4" /> Berat Badan
                        </div>
                        <div className="text-2xl font-bold">{getLastRecord()?.weight} <span className="text-sm font-normal">kg</span></div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
                            <Ruler className="w-4 h-4" /> Tinggi Badan
                        </div>
                        <div className="text-2xl font-bold">{getLastRecord()?.height} <span className="text-sm font-normal">cm</span></div>
                    </div>
                </div>
            ) : (
                <p className="text-indigo-100 italic">Belum ada data. Tambahkan data pertama!</p>
            )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex-1 bg-white border border-indigo-200 text-indigo-600 font-semibold py-3 px-4 rounded-xl shadow-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Catat Data
        </button>
        {records.length > 0 && (
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menganalisis...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Analisis AI
              </>
            )}
          </button>
        )}
      </div>

      {/* Input Form */}
      {showForm && (
        <form onSubmit={handleAddRecord} className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100 space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pengukuran</label>
            <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="date" 
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
                />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Berat (kg)</label>
                 <div className="relative">
                    <input 
                        type="number" 
                        step="0.01"
                        required
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
                 </div>
            </div>
            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Tinggi (cm)</label>
                 <div className="relative">
                    <input 
                        type="number" 
                        step="0.1"
                        required
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">cm</span>
                 </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">
            Simpan Data
          </button>
        </form>
      )}

      {/* Analysis Result */}
      {analysis && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-500">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                Hasil Analisis AI
            </h3>
            <div className="prose prose-sm prose-indigo text-gray-600 leading-relaxed whitespace-pre-wrap">
                {analysis}
            </div>
            <p className="text-xs text-gray-400 mt-4 italic">
                *Analisis ini dibuat oleh AI berdasarkan data yang Anda masukkan dan standar umum. Selalu konsultasikan dengan dokter anak untuk diagnosis medis yang akurat.
            </p>
        </div>
      )}

      {/* History List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700">
            Riwayat Pengukuran
        </div>
        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {records.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                    Belum ada data tersimpan.
                </div>
            ) : (
                records.map((record) => (
                    <div key={record.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                <CalendarIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-800">
                                    {new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="font-bold text-gray-700">{record.weight} kg</div>
                             <div className="text-xs text-gray-500">{record.height} cm</div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default GrowthTracker;