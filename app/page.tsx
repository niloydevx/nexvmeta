"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, CheckCircle, XCircle, Sparkles, ScanEye, Download, Settings, LayoutGrid, 
  Calendar, Scissors, Zap, RefreshCw, Sliders, Box, Wand2, Save, TrendingUp, BarChart3, ShieldAlert, Plus, Edit3, Image as ImageIcon
} from "lucide-react";

// --- CONFIG & API KEYS ---
const REMOVE_BG_API_KEY = "yMT4aQLjH2pkmrQ7jU5FjquV";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wfwvaxchezdbqnxqtvkm.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_qkpIryzPwii4fKn6lE_baQ_EGwIO5ky";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- TYPES ---
type SettingsState = { titleMin: number; titleMax: number; keywordMin: number; keywordMax: number; descMin: number; descMax: number; platform: string; resolution: "4K" | "8K"; };
type AnalysisResult = { meta: { title: string; description: string; keywords: { tag: string; relevance: number }[]; category: number }; technical: { quality_score: number; notes: string }; prompts: { sanitized_prompt: string }; };
type FileItem = { id: string; file: File; preview: string; status: "idle" | "uploading" | "analyzing" | "done" | "error"; result: AnalysisResult | null; publicUrl?: string; };

// --- GLASSY TOAST SYSTEM ---
function Toast({ message, type, onClose }: { message: string, type: 'success'|'error'|'info', onClose: () => void }) {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] z-50 flex items-center gap-4 font-medium text-sm backdrop-blur-2xl border ${
        type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 
        type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-200' : 
        'bg-blue-500/10 border-blue-500/30 text-blue-200'
      }`}>
      {type === 'success' ? <CheckCircle size={20} className="text-emerald-400"/> : type === 'error' ? <XCircle size={20} className="text-red-400"/> : <Sparkles size={20} className="text-blue-400"/>}
      {message}
    </motion.div>
  );
}

// --- MAIN APP COMPONENT ---
export default function NexVmetaPro() {
  const [activeView, setActiveView] = useState("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const [settings, setSettings] = useState<SettingsState>({ titleMin: 15, titleMax: 70, keywordMin: 30, keywordMax: 49, descMin: 50, descMax: 200, platform: "Adobe Stock", resolution: "8K" });

  const showToast = (message: string, type: 'success'|'error'|'info' = 'info') => setToast({message, type});

  return (
    <div className="h-screen bg-[#030305] text-white font-sans flex overflow-hidden relative selection:bg-blue-500/40">
      
      {/* Ambient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>

      {/* GLASSY SIDEBAR */}
      <aside className="w-20 lg:w-64 bg-white/[0.02] border-r border-white/[0.05] backdrop-blur-3xl flex flex-col z-20 shadow-2xl">
        <div className="p-6 border-b border-white/[0.05] flex items-center gap-4">
           <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/20">N</div>
           <span className="font-extrabold text-2xl tracking-tight hidden lg:block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">NexV<span className="text-blue-500">meta</span></span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-1">
          <NavItem active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} icon={LayoutGrid} label="Batch Workspace" />
          <div className="px-8 py-3 mt-4 text-[10px] uppercase text-gray-500 font-bold hidden lg:block tracking-widest">Premium Tools</div>
          <NavItem active={activeView === "converter"} onClick={() => setActiveView("converter")} icon={RefreshCw} label="Any Converter" />
          <NavItem active={activeView === "bgremover"} onClick={() => setActiveView("bgremover")} icon={Scissors} label="Pro BG Remover" />
          <NavItem active={activeView === "upscaler"} onClick={() => setActiveView("upscaler")} icon={Zap} label="4K/8K Upscaler" />
          <NavItem active={activeView === "calendar"} onClick={() => setActiveView("calendar")} icon={Calendar} label="Stock Events" />
          <NavItem active={activeView === "scraper"} onClick={() => setActiveView("scraper")} icon={TrendingUp} label="Trend Scraper" />
        </div>

        <div className="p-6 border-t border-white/[0.05]">
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/20 transition-all shadow-lg">
             <Settings size={20} className="text-gray-400" />
             <span className="hidden lg:block text-sm font-semibold text-gray-200">Global Rules</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative z-10 overflow-hidden">
        {activeView === "dashboard" && <DashboardView settings={settings} showToast={showToast} />}
        {activeView === "converter" && <ConverterView showToast={showToast} />}
        {activeView === "bgremover" && <BgRemoverView showToast={showToast} />}
        {activeView === "upscaler" && <UpscalerView settings={settings} showToast={showToast} />}
        {activeView === "calendar" && <CalendarView />}
        {activeView === "scraper" && <ScraperView />}
      </main>

      {/* GLASSY SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className="w-96 h-full bg-[#0a0a0f]/90 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-8 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                  <h3 className="font-bold flex items-center gap-2 text-xl text-white"><Sliders size={20} className="text-blue-500"/> Pro Config</h3>
                  <button onClick={() => setShowSettings(false)} className="bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors border border-white/5"><XCircle size={18} className="text-gray-400 hover:text-white"/></button>
              </div>
              <div className="space-y-8">
                  <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-5 rounded-2xl border border-blue-500/20 shadow-inner">
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-widest block mb-3">Upscale Target</label>
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                      {["4K", "8K"].map(res => (
                          <button key={res} onClick={() => setSettings({...settings, resolution: res as "4K"|"8K"})}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${settings.resolution === res ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}>
                            {res}
                          </button>
                      ))}
                    </div>
                  </div>
                  {[ { label: "Title Length", minKey: "titleMin", maxKey: "titleMax", absMin: 5, absMax: 100 }, { label: "Keywords", minKey: "keywordMin", maxKey: "keywordMax", absMin: 5, absMax: 49 } ].map((s: any, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-widest">{s.label}</label>
                        <span className="text-xs text-white font-mono bg-white/10 px-2 py-1 rounded-md">{(settings as any)[s.minKey]} - {(settings as any)[s.maxKey]}</span>
                      </div>
                      <div className="flex gap-3 items-center bg-black/30 p-4 rounded-2xl border border-white/5 shadow-inner">
                        <input type="range" min={s.absMin} max={s.absMax/2} value={(settings as any)[s.minKey]} onChange={(e) => setSettings({...settings, [s.minKey]: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                        <input type="range" min={s.absMax/2} max={s.absMax} value={(settings as any)[s.maxKey]} onChange={(e) => setSettings({...settings, [s.maxKey]: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
}

// --- 1. PREMIUM BATCH DASHBOARD ---
function DashboardView({ settings, showToast }: { settings: SettingsState, showToast: any }) {
  const [queue, setQueue] = useState<FileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newKeyword, setNewKeyword] = useState(""); 

  const handleFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files).map(file => ({ id: Math.random().toString(36).substr(2, 9), file, preview: URL.createObjectURL(file), status: "idle" as const, result: null }));
    setQueue(prev => [...prev, ...newFiles]);
    showToast(`Added ${newFiles.length} assets to workspace`, 'info');
  };

  const runBatch = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
      return showToast("Supabase Keys Missing in .env.local!", 'error');
    }

    setProcessing(true);
    const pending = queue.filter(q => q.status === "idle");
    for (const item of pending) {
      try {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "uploading" } : q));
        
        // Upload directly to Supabase to bypass Vercel Limits
        const fileName = `${Date.now()}-${item.file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error: uploadError } = await supabase.storage.from('nexvmeta-uploads').upload(fileName, item.file);
        if (uploadError) throw new Error(uploadError.message);
        
        const { data: { publicUrl } } = supabase.storage.from('nexvmeta-uploads').getPublicUrl(fileName);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "analyzing", publicUrl } : q));

        // Call Gemini API
        const analyzeRes = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: publicUrl, settings }) });
        const data = await analyzeRes.json();
        if(data.error) throw new Error(data.error);
        
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "done", result: data } : q));
      } catch (err) { 
        console.error(err);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "error" } : q)); 
      }
    }
    setProcessing(false);
    showToast("AI Batch Analysis Complete", 'success');
  };

  const exportAdobeCSV = () => {
    const completedItems = queue.filter(q => q.status === "done" && q.result);
    if (completedItems.length === 0) return showToast("No files ready for export.", 'error');
    
    const headers = ["Filename", "Title", "Keywords", "Category", "Releases"];
    const rows = completedItems.map(item => {
      const res = item.result!;
      const keywordString = res.meta.keywords.sort((a,b) => b.relevance - a.relevance).map(k => k.tag).join(",");
      return [ `"${item.file.name}"`, `"${res.meta.title.replace(/"/g, '""')}"`, `"${keywordString}"`, res.meta.category || 7, "" ].join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = `Adobe_Pro_Export_${new Date().toISOString().slice(0,10)}.csv`; link.click();
    showToast(`Securely Exported ${completedItems.length} records`, 'success');
  };

  const updateSelectedMeta = (field: 'title' | 'description', value: string) => { setQueue(prev => prev.map(q => q.id === selectedId && q.result ? { ...q, result: { ...q.result, meta: { ...q.result.meta, [field]: value } } } : q )); };
  const removeKeyword = (tagToRemove: string) => { setQueue(prev => prev.map(q => q.id === selectedId && q.result ? { ...q, result: { ...q.result, meta: { ...q.result.meta, keywords: q.result.meta.keywords.filter(k => k.tag !== tagToRemove) } } } : q )); };
  const addKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKeyword.trim()) {
      setQueue(prev => prev.map(q => q.id === selectedId && q.result ? { ...q, result: { ...q.result, meta: { ...q.result.meta, keywords: [{tag: newKeyword.trim(), relevance: 100}, ...q.result.meta.keywords] } } } : q ));
      setNewKeyword("");
    }
  };

  const selectedItem = queue.find(q => q.id === selectedId);

  return (
    <div className="h-full flex relative"
         onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
         onDragLeave={() => setIsDragging(false)}
         onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}>
       
       <AnimatePresence>
         {isDragging && (
           <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-50 bg-blue-900/30 backdrop-blur-md border-2 border-dashed border-blue-400 flex items-center justify-center m-6 rounded-[40px] shadow-[0_0_100px_rgba(37,99,235,0.4)]">
             <div className="text-4xl font-extrabold text-white flex flex-col items-center gap-6 drop-shadow-2xl">
               <div className="p-6 bg-blue-500/20 rounded-full animate-bounce"><Upload size={64} className="text-blue-300"/></div>
               Drop Assets to Workspace
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Left Queue Manager */}
       <div className="w-96 bg-white/[0.01] border-r border-white/[0.05] flex flex-col z-10 backdrop-blur-sm">
          <div className="p-6">
             <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)}/>
             <button onClick={() => fileInputRef.current?.click()} className="w-full py-10 bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-blue-500 hover:bg-blue-500/5 rounded-3xl flex flex-col items-center gap-4 transition-all group">
                <div className="p-4 bg-white/5 group-hover:bg-blue-500/20 rounded-2xl transition-colors"><Upload size={24} className="text-gray-400 group-hover:text-blue-400"/></div>
                <span className="text-sm font-bold uppercase tracking-widest text-gray-400 group-hover:text-blue-400">Add Media</span>
             </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 space-y-3 custom-scrollbar pb-6">
             {queue.map(item => (
                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={item.id} onClick={() => setSelectedId(item.id)} 
                  className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer border transition-all duration-300 ${selectedId === item.id ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_30px_rgba(37,99,235,0.15)]' : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                   <img src={item.preview} className="w-14 h-14 rounded-xl object-cover shadow-md"/>
                   <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-gray-200">{item.file.name}</p>
                      <div className="mt-2 flex items-center">
                        <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase font-bold tracking-wider ${item.status === 'done' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : item.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : item.status === 'idle' ? 'bg-white/5 text-gray-400 border border-white/5' : 'bg-blue-500/20 text-blue-400 border border-blue-500/20 animate-pulse'}`}>
                          {item.status}
                        </span>
                      </div>
                   </div>
                </motion.div>
             ))}
          </div>
          <div className="p-6 border-t border-white/[0.05] bg-black/20 backdrop-blur-md space-y-4">
             <button onClick={runBatch} disabled={processing || queue.filter(q => q.status === 'idle').length === 0} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all border border-blue-400/30">
               {processing ? <RefreshCw className="animate-spin" size={18}/> : <ScanEye size={18}/>} Initialize AI Engine
             </button>
             <button onClick={exportAdobeCSV} disabled={queue.filter(q => q.status === 'done').length === 0} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
               <Download size={18}/> Export Verified CSV
             </button>
          </div>
       </div>

       {/* Right Premium Editor */}
       <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {selectedItem?.result ? (
               <motion.div key={selectedItem.id} initial={{opacity:0, y:20, scale:0.98}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:-20, scale:0.98}} className="max-w-5xl mx-auto space-y-8">
                  
                  {/* Top: Image & Edits */}
                  <div className="flex gap-10 bg-white/[0.02] p-8 rounded-[32px] border border-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-xl">
                     <div className="relative group shrink-0">
                       <img src={selectedItem.preview} className="w-72 h-72 object-cover rounded-[24px] shadow-2xl border border-white/10"/>
                       <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-xl text-xs font-bold text-white border border-white/20 shadow-lg">{settings.resolution} TARGET</div>
                     </div>
                     <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 w-fit px-4 py-2 rounded-full border border-blue-500/20">
                           <Edit3 size={16}/> <span className="text-xs font-bold uppercase tracking-widest">Live Metadata Editor</span>
                        </div>
                        <div>
                           <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-2">Optimized Title (Max {settings.titleMax})</label>
                           <textarea value={selectedItem.result.meta.title} onChange={(e) => updateSelectedMeta('title', e.target.value)}
                             className="w-full bg-black/40 border border-white/10 hover:border-blue-500/50 focus:border-blue-500 focus:bg-black/60 rounded-2xl p-5 text-white text-xl font-semibold outline-none resize-none mt-2 transition-all shadow-inner" rows={2}/>
                        </div>
                        <div>
                           <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-2">Description</label>
                           <textarea value={selectedItem.result.meta.description} onChange={(e) => updateSelectedMeta('description', e.target.value)}
                             className="w-full bg-black/40 border border-white/10 hover:border-blue-500/50 focus:border-blue-500 rounded-2xl p-5 text-gray-300 text-sm outline-none resize-none mt-2 transition-all shadow-inner" rows={2}/>
                        </div>
                     </div>
                  </div>

                  {/* 0-100% Keyword Manager */}
                  <div className="bg-white/[0.02] p-8 rounded-[32px] border border-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-xl">
                     <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                           <div className="p-2.5 bg-emerald-500/20 rounded-xl"><Sparkles size={18} className="text-emerald-400"/></div>
                           <div>
                             <h3 className="text-sm font-bold text-white uppercase tracking-widest">Keyword Engine</h3>
                             <p className="text-[10px] text-gray-500">{selectedItem.result.meta.keywords.length} tags • Ranked by AI Relevance (0-100%)</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus-within:border-blue-500 transition-colors shadow-inner">
                           <Plus size={16} className="text-blue-400"/>
                           <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={addKeyword}
                             placeholder="Add manual tag & press Enter" className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-600 w-56"/>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        <AnimatePresence>
                          {selectedItem.result.meta.keywords.map((k) => {
                             let style = "bg-white/5 border-white/10 text-gray-400";
                             if(k.relevance >= 90) style = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
                             else if(k.relevance >= 70) style = "bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-[0_0_10px_rgba(37,99,235,0.1)]";
                             
                             return (
                             <motion.span layout initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}} key={k.tag} 
                               className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${style}`}>
                               {k.tag}
                               <span className="opacity-60 text-[10px] border-l border-white/10 pl-2 font-mono">{k.relevance}%</span>
                               <button onClick={() => removeKeyword(k.tag)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-1"><XCircle size={14}/></button>
                             </motion.span>
                          )})}
                        </AnimatePresence>
                     </div>
                  </div>

                  {/* Analytics & Prompts */}
                  <div className="grid grid-cols-2 gap-8">
                     <div className={`p-8 rounded-[32px] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-xl border ${selectedItem.result.technical.quality_score > 80 ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                        <div className="flex justify-between items-end mb-6">
                          <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Forensic Viability</div>
                          <div className={`text-6xl font-black tracking-tighter drop-shadow-lg ${selectedItem.result.technical.quality_score > 80 ? 'text-emerald-400' : 'text-red-400'}`}>{selectedItem.result.technical.quality_score}</div>
                        </div>
                        <div className="w-full bg-black/50 h-3 rounded-full mb-6 overflow-hidden border border-white/10 shadow-inner">
                           <motion.div initial={{width:0}} animate={{width: `${selectedItem.result.technical.quality_score}%`}} transition={{duration: 1.5, ease:"easeOut"}} className={`h-full rounded-full shadow-[0_0_15px_currentColor] ${selectedItem.result.technical.quality_score > 80 ? 'bg-emerald-500 text-emerald-500' : 'bg-red-500 text-red-500'}`}></motion.div>
                        </div>
                        <p className="text-sm text-gray-300 flex items-start gap-3 leading-relaxed bg-black/30 p-5 rounded-2xl border border-white/5">
                          {selectedItem.result.technical.quality_score < 80 && <ShieldAlert size={20} className="text-red-400 shrink-0"/>}
                          {selectedItem.result.technical.notes}
                        </p>
                     </div>
                     
                     <div className="p-8 bg-purple-900/10 border border-purple-500/20 rounded-[32px] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-xl relative group">
                        <div className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Sparkles size={16}/> {settings.resolution} Image-To-Prompt</div>
                        <div className="bg-black/50 p-6 rounded-2xl border border-white/5 h-40 overflow-y-auto custom-scrollbar shadow-inner">
                          <p className="text-sm font-mono text-gray-300 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
                            {selectedItem.result.prompts.sanitized_prompt}
                          </p>
                        </div>
                        <button onClick={() => {navigator.clipboard.writeText(selectedItem.result!.prompts.sanitized_prompt); showToast('Prompt Copied', 'success')}} className="absolute top-6 right-6 p-3 bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white rounded-xl transition-all border border-purple-500/30 shadow-lg">
                          <Save size={18}/>
                        </button>
                     </div>
                  </div>
               </motion.div>
            ) : (
               <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full flex flex-col items-center justify-center text-gray-500">
                  <div className="w-32 h-32 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-8 shadow-2xl backdrop-blur-xl">
                     <ImageIcon size={48} className="opacity-20"/>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-400 mb-2 tracking-tight">Workspace Idle</h3>
                  <p className="text-sm">Select an analyzed asset from the queue to edit metadata.</p>
               </motion.div>
            )}
          </AnimatePresence>
       </div>
    </div>
  );
}

// --- SUB-VIEWS (Glassy Styled) ---
function BgRemoverView({ showToast }: any) { 
  const [image, setImage] = useState<File | null>(null); const [resultUrl, setResultUrl] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const processBgRemoval = async () => { if (!image) return; setLoading(true); const formData = new FormData(); formData.append("image_file", image); formData.append("size", "auto"); try { const response = await fetch("https://api.remove.bg/v1.0/removebg", { method: "POST", headers: { "X-Api-Key": REMOVE_BG_API_KEY }, body: formData }); if (!response.ok) throw new Error(); const blob = await response.blob(); setResultUrl(URL.createObjectURL(blob)); showToast('Background Removed!', 'success'); } catch (e) { showToast("API Limit Reached", "error"); } setLoading(false); };
  return <div className="h-full flex items-center justify-center p-8"><div className="bg-white/[0.02] border border-white/[0.05] rounded-[40px] p-12 max-w-2xl w-full text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-2xl"><div className="w-20 h-20 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-pink-500/30"><Scissors size={40} className="text-pink-400"/></div><h2 className="text-4xl font-extrabold mb-3 tracking-tight">Pro BG Remover</h2><p className="text-gray-400 mb-10 text-sm font-medium">Powered by remove.bg enterprise API</p>{!resultUrl ? <div className="space-y-6"><input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-400 file:mr-6 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all bg-black/30 rounded-xl border border-white/5"/><button onClick={processBgRemoval} disabled={!image || loading} className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-pink-900/20">{loading ? "Processing Alpha Channel..." : "Isolate Subject"}</button></div> : <div className="space-y-6"><img src={resultUrl} className="max-h-72 mx-auto rounded-2xl border border-white/10 bg-[url('https://media.istockphoto.com/id/1146311516/vector/checker-seamless-pattern-vector-transparent-grid-background-transparency-grid-texture.jpg?s=612x612&w=0&k=20&c=d5m6hT4fA0Q0A0o9y0_0A0')]"/><div className="flex gap-4"><button onClick={() => { setImage(null); setResultUrl(null); }} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 font-bold transition-all">Reset Image</button><a href={resultUrl} download="removed_bg.png" className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all"><Download size={20}/> Download PNG</a></div></div>}</div></div>; 
}
function UpscalerView({ settings, showToast }: any) { 
  const [prompt, setPrompt] = useState(""); const generateUpscalePrompt = () => { setPrompt(`(Upscale Trigger) Subject in ${settings.resolution} resolution, photorealistic texture, ray traced lighting, unreal engine 5 style, masterpiece --v 6.0 --upbeta`); showToast('Prompt Generated', 'success'); };
  return <div className="h-full flex items-center justify-center p-8"><div className="bg-white/[0.02] border border-white/[0.05] rounded-[40px] p-12 max-w-2xl w-full shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-2xl"><div className="flex items-center gap-6 mb-10"><div className="p-5 bg-purple-500/20 rounded-2xl border border-purple-500/30"><Zap size={32} className="text-purple-400"/></div><div><h2 className="text-3xl font-extrabold tracking-tight">AI Upscale Engineer</h2><p className="text-sm text-gray-400 mt-1">Target Engine: <span className="text-white font-bold bg-white/10 px-2 py-1 rounded-md">{settings.resolution}</span></p></div></div><div className="space-y-8"><div className="p-6 bg-black/30 rounded-2xl border border-white/5 text-gray-400 text-sm leading-relaxed shadow-inner">Generate the perfect <span className="text-purple-400 font-bold">MagnificAI</span> or <span className="text-purple-400 font-bold">Topaz</span> prompt engineered specifically to pass Adobe's 2026 technical requirements without artifacting.</div><button onClick={generateUpscalePrompt} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"><Wand2 size={20}/> Synthesize {settings.resolution} Prompt</button>{prompt && <div className="bg-black/50 p-6 rounded-2xl border border-purple-500/30 relative group shadow-inner"><p className="text-sm font-mono text-gray-300 mb-4">{prompt}</p><button onClick={() => {navigator.clipboard.writeText(prompt); showToast('Copied to Clipboard', 'success')}} className="flex items-center gap-2 text-xs text-purple-400 font-bold hover:text-white bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/20 transition-all"><Save size={14}/> Copy Payload</button></div>}</div></div></div>; 
}
function ConverterView({ showToast }: any) { 
  const [files, setFiles] = useState<File[]>([]); const [format, setFormat] = useState("image/png"); const convert = () => { files.forEach(file => { const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0); const link = document.createElement("a"); link.download = `nexv_${file.name.split('.')[0]}.${format.split('/')[1]}`; link.href = canvas.toDataURL(format); link.click(); }; img.src = e.target?.result as string; }; reader.readAsDataURL(file); }); showToast(`Converted ${files.length} files`, 'success'); };
  return <div className="h-full flex items-center justify-center p-10"><div className="bg-white/[0.02] border border-white/[0.05] rounded-[40px] p-12 max-w-2xl w-full text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-2xl"><div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-blue-500/30"><RefreshCw size={40} className="text-blue-400"/></div><h2 className="text-4xl font-extrabold mb-10 tracking-tight">Any Format Converter</h2><div className="space-y-8"><div className="p-10 border-2 border-dashed border-white/10 rounded-3xl bg-black/20 hover:bg-black/40 transition-colors"><input type="file" multiple onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} className="block w-full text-sm text-gray-400 file:mr-6 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 transition-all cursor-pointer"/><p className="text-blue-400 font-bold text-sm mt-6 bg-blue-500/10 inline-block px-4 py-2 rounded-lg border border-blue-500/20">{files.length} assets queued in memory</p></div><div className="flex gap-4"><select onChange={(e) => setFormat(e.target.value)} className="bg-black/50 text-white px-6 py-4 rounded-xl border border-white/10 font-bold outline-none focus:border-blue-500 transition-colors"><option value="image/png">Export as PNG</option><option value="image/jpeg">Export as JPG</option><option value="image/webp">Export as WEBP</option></select><button onClick={convert} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">Convert Locally</button></div></div></div></div>; 
}
function CalendarView() { 
  const events = [ { date: "Feb 14", title: "Valentine's Day", type: "Trending" }, { date: "Mar 08", title: "Intl Women's Day", type: "High Demand" }, { date: "Mar 17", title: "St. Patrick's Day", type: "Seasonal" }, { date: "Mar 31", title: "Easter Sunday", type: "Evergreen" } ];
  return <div className="h-full p-12 flex flex-col items-center justify-center"><div className="max-w-3xl w-full"><div className="flex items-center gap-4 mb-10"><div className="p-4 bg-orange-500/20 rounded-2xl border border-orange-500/30"><Calendar size={32} className="text-orange-400"/></div><h2 className="text-4xl font-extrabold tracking-tight">Global Content Calendar</h2></div><div className="grid gap-4">{events.map((ev, i) => (<div key={i} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl flex justify-between items-center hover:bg-white/[0.05] transition-all backdrop-blur-xl shadow-lg"><div className="flex items-center gap-6"><div className="text-center bg-black/40 border border-white/5 px-4 py-3 rounded-xl min-w-[80px]"><div className="text-xs text-gray-500 uppercase font-bold tracking-widest">{ev.date.split(' ')[0]}</div><div className="text-xl font-black text-white">{ev.date.split(' ')[1]}</div></div><span className="font-bold text-xl">{ev.title}</span></div><span className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 uppercase tracking-widest">{ev.type}</span></div>))}</div></div></div>; 
}
function ScraperView() { 
  return <div className="h-full flex items-center justify-center p-10"><div className="bg-white/[0.02] border border-white/[0.05] rounded-[40px] p-12 max-w-2xl w-full text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-2xl"><div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/30"><TrendingUp size={40} className="text-emerald-400"/></div><h2 className="text-4xl font-extrabold mb-4 tracking-tight">Trend Analyzer Engine</h2><p className="text-gray-400 mb-8 text-sm leading-relaxed">Live web-scraping logic is restricted by browser security protocols. The Trend Engine utilizes Gemini AI within the Main Workspace to cross-reference market gaps during upload analysis.</p><div className="bg-black/30 border border-white/5 p-6 rounded-2xl inline-block shadow-inner"><span className="text-emerald-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2"><CheckCircle size={16}/> Engine Active in Batch Workspace</span></div></div></div>; 
}
function NavItem({ active, onClick, icon: Icon, label }: any) {
  return <button onClick={onClick} className={`w-full flex items-center gap-4 px-8 py-4 transition-all group ${active ? "bg-blue-500/10 border-l-4 border-blue-500 text-blue-400 shadow-[inset_10px_0_20px_-10px_rgba(37,99,235,0.3)]" : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-4 border-transparent"}`}><Icon size={20} className={`transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`} /><span className="text-sm font-semibold hidden lg:block tracking-wide">{label}</span></button>;
}
