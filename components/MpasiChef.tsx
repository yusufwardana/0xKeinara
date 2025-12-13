import React, { useState } from 'react';
import { ChefHat, Utensils, Clock, Flame, Sparkles } from 'lucide-react';
import { generateRecipes } from '../services/geminiService';
import { Recipe } from '../types';

interface Props {
  babyAge: number;
}

const MpasiChef: React.FC<Props> = ({ babyAge }) => {
  const [ingredients, setIngredients] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  // If baby is too young for MPASI
  if (babyAge < 6) {
    return (
        <div className="p-8 text-center bg-orange-50 rounded-2xl border border-orange-100">
             <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-8 h-8 text-orange-500" />
             </div>
             <h3 className="text-lg font-bold text-gray-800 mb-2">Belum Waktunya MPASI</h3>
             <p className="text-gray-600">
                Fitur ini disarankan untuk bayi usia 6 bulan ke atas. 
                Saat ini, ASI/Susu Formula masih yang terbaik untuk si kecil! ❤️
             </p>
        </div>
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients.trim()) return;

    setLoading(true);
    setRecipes([]);
    
    try {
        const results = await generateRecipes(babyAge, ingredients);
        setRecipes(results);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Input Section */}
       <div className="bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
           <div className="flex items-center gap-3 mb-4">
               <ChefHat className="w-8 h-8" />
               <h2 className="text-xl font-bold">MPASI Chef</h2>
           </div>
           <p className="mb-4 opacity-90 text-sm">
               Bingung masak apa? Masukkan bahan yang ada di kulkas (misal: "Bayam, Tahu, Telur"), saya buatkan resepnya!
           </p>
           
           <form onSubmit={handleGenerate} className="relative">
               <input 
                 type="text" 
                 value={ingredients}
                 onChange={(e) => setIngredients(e.target.value)}
                 placeholder="Tulis bahan-bahan di sini..."
                 className="w-full pl-4 pr-32 py-3 rounded-xl text-gray-800 placeholder:text-gray-400 focus:ring-4 focus:ring-white/30 outline-none shadow-sm"
               />
               <button 
                type="submit"
                disabled={loading}
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-gray-900 text-white px-4 rounded-lg font-medium text-sm hover:bg-black transition-colors disabled:opacity-70 flex items-center gap-2"
               >
                   {loading ? (
                       <Sparkles className="w-4 h-4 animate-spin" />
                   ) : (
                       <>
                        <Flame className="w-4 h-4" /> Masak
                       </>
                   )}
               </button>
           </form>
       </div>

       {/* Recipes Result */}
       <div className="grid gap-6 md:grid-cols-1">
           {recipes.map((recipe, idx) => (
               <div key={idx} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                   <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-start">
                       <div>
                           <h3 className="font-bold text-gray-800 text-lg">{recipe.name}</h3>
                           <span className="inline-block mt-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                               Tekstur: {recipe.texture}
                           </span>
                       </div>
                   </div>
                   
                   <div className="p-5 space-y-4">
                       <div className="flex items-start gap-3">
                           <div className="mt-1 bg-green-100 p-1.5 rounded-full">
                               <Utensils className="w-4 h-4 text-green-600" />
                           </div>
                           <div>
                               <h4 className="font-semibold text-gray-700 text-sm">Bahan-bahan</h4>
                               <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                                   {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                               </ul>
                           </div>
                       </div>

                       <div className="flex items-start gap-3">
                           <div className="mt-1 bg-blue-100 p-1.5 rounded-full">
                               <Clock className="w-4 h-4 text-blue-600" />
                           </div>
                           <div>
                               <h4 className="font-semibold text-gray-700 text-sm">Cara Membuat</h4>
                               <ol className="text-sm text-gray-600 mt-1 list-decimal list-inside space-y-1">
                                   {recipe.steps.map((step, i) => <li key={i}>{step}</li>)}
                               </ol>
                           </div>
                       </div>
                       
                       <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800 flex gap-2">
                           <Sparkles className="w-4 h-4 flex-shrink-0" />
                           <div>
                               <span className="font-bold">Info Gizi:</span> {recipe.nutrition}
                           </div>
                       </div>
                   </div>
               </div>
           ))}
       </div>
    </div>
  );
};

export default MpasiChef;