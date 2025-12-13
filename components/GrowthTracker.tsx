import React, { useState, useEffect } from 'react';
import { GrowthRecord } from '../types';
import { Plus, Trash2, TrendingUp, Ruler, Weight } from 'lucide-react';

// Simplified WHO Child Growth Standards (Boys Median P50)
// Source approx: WHO Multicentre Growth Reference Study Group
const WHO_STANDARDS = {
  weight: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6], // 0-12 months
  height: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72.0, 73.3, 74.5, 75.7] // 0-12 months
};

interface Props {
  currentAgeMonths: number;
}

const GrowthTracker: React.FC<Props> = ({ currentAgeMonths }) => {
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'weight' | 'height'>('weight');

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem('keinara_growth_records');
    if (saved) {
      setRecords(JSON.parse(saved).sort((a: GrowthRecord, b: GrowthRecord) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('keinara_growth_records', JSON.stringify(records));
  }, [records]);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || !newHeight) return;

    // Estimate age in months based on record date vs generic 0 month start
    // In a real app, we would calculate diff from birthDate. 
    // Here we trust the user enters data relevant to current age or we use the passed prop for "today".
    // Ideally, we store birthdate globally, but for this component, let's keep it simple.
    
    const newRecord: GrowthRecord = {
      id: Date.now().toString(),
      date: newDate,
      ageMonths: currentAgeMonths, // Simplified: assumes entry is for "current age"
      weight: parseFloat(newWeight),
      height: parseFloat(newHeight)
    };

    setRecords(prev => [...prev, newRecord].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setNewWeight('');
    setNewHeight('');
  };

  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  // --- CHART RENDERING LOGIC (SVG) ---
  const renderChart = (type: 'weight' | 'height') => {
    const width = 600;
    const height = 300;
    const padding = 40;
    
    // Domain (X): 0 to 12 months (or max recorded age if > 12)
    const maxAge = Math.max(12, ...records.map(r => r.ageMonths));
    const xScale = (age: number) => padding + (age / maxAge) * (width - padding * 2);

    // Range (Y): Min to Max value + padding
    const standardData = type === 'weight' ? WHO_STANDARDS.weight : WHO_STANDARDS.height;
    const userValues = records.map(r => type === 'weight' ? r.weight : r.height);
    const allValues = [...standardData, ...userValues];
    
    const minVal = Math.min(...allValues) * 0.9;
    const maxVal = Math.max(...allValues) * 1.1;
    
    const yScale = (val: number) => height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);

    // Generate Standard Line Path (WHO)
    const standardPath = standardData.map((val, i) => {
      const x = xScale(i);
      const y = yScale(val);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Generate User Line Path
    const userPath = records.map((r) => {
      const val = type === 'weight' ? r.weight : r.height;
      const x = xScale(r.ageMonths); // Note: ideally utilize date difference for precise X
      const y = yScale(val);
      return `${records.indexOf(r) === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid Lines (Horizontal) */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = padding + t * (height - padding * 2);
            return <line key={t} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="4" />
        })}

        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#9ca3af" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#9ca3af" strokeWidth="2" />

        {/* Labels X Axis (Months) */}
        {[0, 3, 6, 9, 12].map(m => {
            if (m > maxAge) return null;
            return (
                <text key={m} x={xScale(m)} y={height - 10} textAnchor="middle" fontSize="12" fill="#6b7280">
                    {m} Bln
                </text>
            )
        })}

        {/* WHO Standard Line */}
        <path d={standardPath} fill="none" stroke="#d1d5db" strokeWidth="3" strokeDasharray="5,5" />
        <text x={width - padding} y={yScale(standardData[standardData.length - 1])} fill="#9ca3af" fontSize="10" textAnchor="end" dy="-5">
            WHO (Std)
        </text>

        {/* User Line */}
        {records.length > 0 && (
            <>
                <path d={userPath} fill="none" stroke={type === 'weight' ? '#3b82f6' : '#10b981'} strokeWidth="3" />
                {records.map((r) => (
                    <circle 
                        key={r.id} 
                        cx={xScale(r.ageMonths)} 
                        cy={yScale(type === 'weight' ? r.weight : r.height)} 
                        r="5" 
                        fill="white" 
                        stroke={type === 'weight' ? '#3b82f6' : '#10b981'} 
                        strokeWidth="2" 
                    />
                ))}
            </>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" /> Grafik Pertumbuhan
          </h3>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
              <button 
                onClick={() => setActiveTab('weight')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'weight' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  Berat Badan
              </button>
              <button 
                onClick={() => setActiveTab('height')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'height' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  Tinggi Badan
              </button>
          </div>

          {/* Chart Container */}
          <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-gray-50 rounded-xl border border-gray-100 p-2 mb-6">
               {renderChart(activeTab)}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 justify-center">
              <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div> WHO Standard
              </div>
              <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${activeTab === 'weight' ? 'bg-blue-500' : 'bg-green-500'}`}></div> Si Kecil
              </div>
          </div>
      </div>

      {/* Add New Record Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-md font-bold text-gray-800 mb-4">Catat Pengukuran Baru</h3>
          <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
             <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
                 <input 
                    type="date" 
                    value={newDate} 
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    required
                 />
             </div>
             <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Berat (kg)</label>
                 <div className="relative">
                     <Weight className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                     <input 
                        type="number" 
                        step="0.01"
                        value={newWeight} 
                        onChange={e => setNewWeight(e.target.value)}
                        className="w-full pl-9 p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                        placeholder="0.0"
                        required
                    />
                 </div>
             </div>
             <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Tinggi (cm)</label>
                 <div className="relative">
                     <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                     <input 
                        type="number" 
                        step="0.1"
                        value={newHeight} 
                        onChange={e => setNewHeight(e.target.value)}
                        className="w-full pl-9 p-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                        placeholder="0.0"
                        required
                    />
                 </div>
             </div>
             <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors h-[38px]"
             >
                 <Plus className="w-4 h-4" /> Simpan
             </button>
          </form>
      </div>
      
      {/* History List */}
      {records.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700">Riwayat Pengukuran</h3>
              </div>
              <div className="divide-y divide-gray-100">
                  {records.map((r) => (
                      <div key={r.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                          <div>
                              <p className="font-medium text-gray-800 text-sm">{new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              <p className="text-xs text-gray-500">Usia sekitar {Math.round(r.ageMonths)} bulan</p>
                          </div>
                          <div className="flex items-center gap-6">
                              <div className="text-right">
                                  <p className="text-sm font-bold text-blue-600">{r.weight} kg</p>
                                  <p className="text-sm font-bold text-green-600">{r.height} cm</p>
                              </div>
                              <button 
                                onClick={() => handleDelete(r.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default GrowthTracker;