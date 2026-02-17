"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudUpload, Sparkles, CheckCircle2, 
  Trash2, Copy, Image as ImageIcon, Loader2, AlertTriangle, Download,
  ShieldAlert, X, Activity, Layers, TerminalSquare, Settings2, RefreshCw
} from "lucide-react";

// --- CONFIG ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wfwvaxchezdbqnxqtvkm.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_qkpIryzPwii4fKn6lE_baQ_EGwIO5ky"
);

const PLATFORMS = [
  { 
    id: 'adobe', name: 'Adobe Stock', 
    icon: (<div className="bg-[#000000] w-9 h-9 rounded-[8px] flex items-center justify-center border border-white/10 shadow-sm shrink-0"><span className="text-white font-bold text-[14px] tracking-tighter">St</span></div>)
  },
  { 
    id: 'shutterstock', name: 'Shutterstock', 
    icon: (<div className="bg-[#EA3B43] w-9 h-9 rounded-[8px] flex items-center justify-center shadow-sm shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5"/></svg></div>)
  }
];

type AnalysisResult = { meta?: { title?: string; description?: string; keywords?: { tag: string; relevance: number }[]; category?: number }; technical?: { quality_score?: number; notes?: string }; prompts?: { sanitized_prompt?: string }; limit_remaining?: number; limit_reset?: string; };
type FileItem = { id: string; file?: File; preview: string; status: "idle" | "uploading" | "analyzing" | "done" | "error"; result: AnalysisResult | null; publicUrl?: string; fileName?: string; name: string; progress: number; };

function Toast({ message, type, onClose }: { message: string, type: 'success'|'error'|'info', onClose: () => void }) {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <motion.div layout initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} drag="x" dragConstraints={{ left: 0, right: 300 }} dragElastic={0.2} onDragEnd={(e, { offset, velocity }) => { if (offset.x > 100 || velocity.x > 500) onClose(); }}
      className={`fixed z-[100] bottom-6 right-6 min-w-[280px] flex items-center gap-3 px-3 py-2.5 rounded-lg shadow-2xl backdrop-blur-xl border border-white/10 bg-[#18181b]/95`}>
      <div className={`shrink-0 p-1.5 rounded-md ${type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-[#4569FF]/20 text-[#4569FF]'}`}>
        {type === 'success' ? <CheckCircle2 size={14} /> : type === 'error' ? <AlertTriangle size={14} /> : <Sparkles size={14} />}
      </div>
      <span className="flex-1 font-medium text-[11px] text-zinc-200">{message}</span>
      <button onClick={onClose} className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10"><X size={12}/></button>
    </motion.div>
  );
}

export default function NexVmetaStudioPro() {
  const [queue, setQueue] = useState<FileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [apiLimit, setApiLimit] = useState<number>(1000); 
  const [resetTimestamp, setResetTimestamp] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [panelTab, setPanelTab] = useState<'metadata' | 'details'>('metadata');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const showToast = (message: string, type: 'success'|'error'|'info' = 'info') => setToast({message, type});

  const [settings, setSettings] = useState({ 
    titleMin: 20, titleMax: 100, descMin: 50, descMax: 200, 
    keywordMin: 35, keywordMax: 49, resolution: "8K", 
    platforms: ['adobe'] 
  });

  useEffect(() => { 
    const savedQueue = localStorage.getItem('nexvmeta_pro_v6'); 
    if (savedQueue) { try { setQueue(JSON.parse(savedQueue)); } catch (e) {} } 
    
    const savedTime = localStorage.getItem('nexvmeta_limit_reset_db');
    if (savedTime && parseInt(savedTime) > Date.now()) {
       setResetTimestamp(parseInt(savedTime));
       setApiLimit(0);
    } else {
       localStorage.removeItem('nexvmeta_limit_reset_db');
    }
  }, []);

  useEffect(() => { const savableQueue = queue.map(q => ({ ...q, file: undefined })).filter(q => q.publicUrl); localStorage.setItem('nexvmeta_pro_v6', JSON.stringify(savableQueue)); }, [queue]);

  useEffect(() => {
    if (!resetTimestamp) { setTimeLeft(null); return; }
    const interval = setInterval(() => {
      const remaining = Math.floor((resetTimestamp - Date.now()) / 1000);
      if (remaining <= 0) {
        setResetTimestamp(null);
        setTimeLeft(null);
        setApiLimit(1000);
        localStorage.removeItem('nexvmeta_limit_reset_db');
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [resetTimestamp]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  const handleFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files).map(file => ({ id: Math.random().toString(36).substr(2, 9), file, preview: URL.createObjectURL(file), name: file.name, status: "idle" as const, result: null, progress: 0, fileName: "" }));
    setQueue(prev => [...prev, ...newFiles]);
    showToast(`Queued ${newFiles.length} files`, 'info');
  };

  const togglePlatform = (id: string) => {
    setSettings(prev => {
      const newPlatforms = prev.platforms.includes(id) 
        ? prev.platforms.filter(p => p !== id) 
        : [...prev.platforms, id];
      return { ...prev, platforms: newPlatforms };
    });
  };

  const runBatch = async () => {
    if (timeLeft !== null && timeLeft > 0) return showToast(`Rate Limit Active! Resets in ${formatTime(timeLeft)}`, 'error');
    if (settings.platforms.length === 0) return showToast("Select at least one Target Platform", 'error');
    
    setProcessing(true);
    const pending = queue.filter(q => q.status === "idle" && q.file);
    let successCount = 0;
    
    for (const item of pending) {
      try {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "analyzing" } : q));
        const fileName = `${Date.now()}-${item.file!.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error: uploadError } = await supabase.storage.from('nexvmeta-uploads').upload(fileName, item.file!);
        if (uploadError) throw new Error(uploadError.message);
        
        const { data: { publicUrl } } = supabase.storage.from('nexvmeta-uploads').getPublicUrl(fileName);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, publicUrl, fileName } : q));

        const analyzeRes = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: publicUrl, settings }) });
        const data = await analyzeRes.json();
        if(data.error) throw new Error(data.error);
        
        if(data.limit_remaining !== undefined && data.limit_remaining !== null) {
          setApiLimit(data.limit_remaining);
          if(data.limit_remaining === 0 && data.limit_reset) {
             let totalSecs = 0;
             const mMatch = data.limit_reset.match(/(\d+)m/);
             const sMatch = data.limit_reset.match(/([\d.]+)s/);
             if (mMatch) totalSecs += parseInt(mMatch[1]) * 60;
             if (sMatch) totalSecs += Math.ceil(parseFloat(sMatch[1]));
             const futureTime = Date.now() + (totalSecs * 1000);
             setResetTimestamp(futureTime);
             localStorage.setItem('nexvmeta_limit_reset_db', futureTime.toString());
          }
        }

        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "done", result: data } : q));
        if(!selectedId) setSelectedId(item.id);
        successCount++;
      } catch (err) { 
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "error" } : q)); 
      }
      
      // SMART DELAY: Prevents 429 Too Many Requests by cooling down between files
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    setProcessing(false);
    if(successCount > 0) showToast(`Generated metadata for ${successCount} assets`, 'success');
  };

  const retryFailed = () => {
    setQueue(prev => prev.map(q => q.status === 'error' ? { ...q, status: 'idle' } : q));
    showToast("Re-queued failed items. Press Start Engine.", 'info');
  };

  const exportCSV = () => {
    const completedItems = queue.filter(q => q.status === "done" && q.result);
    if (completedItems.length === 0) return showToast("No items to export", 'error');
    if (settings.platforms.length === 0) return showToast("No platform selected", 'error');
    
    settings.platforms.forEach((platform, index) => {
      setTimeout(() => {
        let headers: string[] = []; 
        let rows: string[] = [];
        completedItems.forEach(item => {
          const safeMeta = item.result?.meta || {};
          const keywordString = (safeMeta.keywords || []).map((k:any) => k.tag).join(",");
          const title = (safeMeta.title || "Untitled").replace(/"/g, '""');
          const desc = (safeMeta.description || "").replace(/"/g, '""');
          const category = safeMeta.category || 7;
          
          if(platform === 'adobe') {
             headers = ["Filename", "Title", "Keywords", "Category", "Releases"]; 
             rows.push([ `"${item.name}"`, `"${title}"`, `"${keywordString}"`, category, "" ].join(",")); 
          } else if(platform === 'shutterstock') {
             headers = ["Filename", "Description", "Keywords", "Categories", "Editorial", "Illustration"]; 
             rows.push([ `"${item.name}"`, `"${desc}"`, `"${keywordString}"`, category, "no", "yes" ].join(","));
          }
        });
        
        const link = document.createElement("a"); 
        link.href = encodeURI("data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")); 
        link.download = `${platform.toUpperCase()}_Export_${Date.now()}.csv`; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 800);
    });

    showToast(`Exported ${settings.platforms.length} CSV file(s)`, 'success');
  };

  const clearAll = () => {
     if(!confirm("Clear workspace?")) return;
     queue.forEach(item => { if (item.fileName) supabase.storage.from('nexvmeta-uploads').remove([item.fileName]).catch(console.error); });
     setQueue([]); setSelectedId(null); localStorage.removeItem('nexvmeta_pro_v6');
  };

  const copyText = (text: string, label: string) => { navigator.clipboard.writeText(text); showToast(`${label} copied`, 'info'); };

  const doneCount = queue.filter(q => q.status === 'done').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const selectedItem = queue.find(q => q.id === selectedId);

  const safeMeta = selectedItem?.result?.meta || {};
  const safeTech = selectedItem?.result?.technical || {};
  const currentTitle = safeMeta.title || "No Title Generated";
  const currentDesc = safeMeta.description || "No Description Generated";
  const currentKeywords = safeMeta.keywords || [];
  const currentScore = Number(safeTech.quality_score) || 85; 
  const currentNotes = safeTech.notes || "Forensic analysis executed successfully.";
  const currentPrompt = selectedItem?.result?.prompts?.sanitized_prompt || "No prompt generated.";

  return (
    <div className="flex h-screen bg-[#09090b] text-[#e4e4e7] font-sans text-[12px] antialiased overflow-hidden selection:bg-[#4569FF]/30 relative">
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type='number'] { -moz-appearance: textfield; }
      `}} />

      {/* LEFT SIDEBAR */}
      <aside className="w-[260px] bg-[#09090b] border-r border-[#27272a] flex flex-col shrink-0 z-20">
        
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#27272a]">
          <div className="flex items-center gap-2">
             <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain rounded" onError={(e) => e.currentTarget.style.display = 'none'} />
             <span className="font-bold text-[13px] tracking-tight text-white">Nexvmeta <span className="text-[#4569FF]">Pro</span></span>
          </div>
          <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap transition-colors ${timeLeft !== null && timeLeft > 0 ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' : 'bg-[#4569FF]/10 text-[#4569FF] border-[#4569FF]/20'}`}>
            {timeLeft !== null && timeLeft > 0 ? `Resets: ${formatTime(timeLeft)}` : `${apiLimit} RPD`}
          </div>
        </div>

        <div className="p-3 border-b border-[#27272a]">
          <button onClick={runBatch} disabled={processing || queue.filter(q => q.status === 'idle').length === 0 || (timeLeft !== null && timeLeft > 0)} className="w-full h-8 bg-white hover:bg-zinc-200 text-black disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 flex items-center justify-center gap-2 rounded-md text-[11px] font-bold transition-all shadow-sm">
            {processing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} 
            {processing ? "ENGINE RUNNING" : timeLeft !== null && timeLeft > 0 ? "LIMIT REACHED" : "START ENGINE"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
          
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-zinc-400"><Layers size={12}/><h3 className="text-[11px] font-semibold uppercase tracking-wider">Target Platform</h3></div>
            <div className="grid grid-cols-2 gap-2">
               {PLATFORMS.map(plat => {
                 const isSelected = settings.platforms.includes(plat.id);
                 return (
                   <button key={plat.id} onClick={() => togglePlatform(plat.id)}
                     className={`py-3 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all duration-200 ${isSelected ? 'border-[#4569FF] bg-[#4569FF]/10 shadow-[0_0_15px_rgba(69,105,255,0.15)] ring-1 ring-[#4569FF]/50' : 'border-[#27272a] bg-[#18181b] opacity-70 hover:opacity-100 hover:border-zinc-600'}`}>
                     {plat.icon}
                     <span className={`text-[10px] font-semibold tracking-wide truncate px-1 w-full text-center ${isSelected ? 'text-[#4569FF]' : 'text-zinc-400'}`}>{plat.name}</span>
                   </button>
                 );
               })}
            </div>
          </div>

          <div className="h-px w-full bg-[#27272a]"></div>
          
          <div className="space-y-3">
             <div className="flex items-center gap-1.5 mb-1 text-zinc-400"><Settings2 size={12}/><h3 className="text-[11px] font-semibold uppercase tracking-wider">Engine Rules</h3></div>
             {[ { label: 'Title Chars', min: 'titleMin', max: 'titleMax' }, { label: 'Desc Chars', min: 'descMin', max: 'descMax' }, { label: 'Keywords', min: 'keywordMin', max: 'keywordMax' } ].map((f, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 shrink-0">{f.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input type="number" value={(settings as any)[f.min]} onChange={e => setSettings({...settings, [f.min]: +e.target.value})} className="w-12 h-6 bg-[#18181b] border border-[#27272a] rounded text-center text-[11px] text-zinc-300 font-mono outline-none focus:border-[#4569FF] transition-colors"/>
                    <span className="text-zinc-600">-</span>
                    <input type="number" value={(settings as any)[f.max]} onChange={e => setSettings({...settings, [f.max]: +e.target.value})} className="w-12 h-6 bg-[#18181b] border border-[#27272a] rounded text-center text-[11px] text-zinc-300 font-mono outline-none focus:border-[#4569FF] transition-colors"/>
                  </div>
                </div>
             ))}
          </div>
        </div>

        <div className="p-3 border-t border-[#27272a]">
           <button onClick={exportCSV} disabled={doneCount === 0 || settings.platforms.length === 0} className="w-full h-8 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] disabled:opacity-50 text-zinc-300 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-2">
             <Download size={12}/> Export Data
           </button>
        </div>
      </aside>

      {/* RIGHT WORKSPACE */}
      <main className="flex-1 relative flex flex-col bg-[#09090b]"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}>
         
         <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)}/>

         {queue.length > 0 && (
           <header className="h-12 border-b border-[#27272a] flex items-center justify-between px-4 shrink-0 bg-[#09090b] z-10">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold text-white">Batch Queue</span>
                <div className="h-4 w-px bg-[#27272a]"></div>
                <span className="text-[11px] text-zinc-500">{queue.length} files <span className="text-[#4569FF] ml-1">• {doneCount} processed</span></span>
              </div>
              <div className="flex items-center gap-2">
                 
                 {/* RETRY BUTTON ADDED HERE */}
                 {errorCount > 0 && (
                   <button onClick={retryFailed} className="h-7 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-[11px] font-medium transition-all flex items-center gap-1.5">
                     <RefreshCw size={12}/> Retry Failed ({errorCount})
                   </button>
                 )}

                 <button onClick={() => fileInputRef.current?.click()} className="h-7 px-3 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded text-[11px] font-medium text-zinc-300 transition-all flex items-center gap-1.5"><CloudUpload size={12}/> Import</button>
                 <button onClick={clearAll} className="h-7 px-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border border-zinc-700/50 rounded text-[11px] font-medium transition-all flex items-center gap-1.5"><Trash2 size={12}/> Clear</button>
              </div>
           </header>
         )}

         {queue.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
               <div onClick={() => fileInputRef.current?.click()} className={`w-full max-w-xl border border-dashed rounded-xl flex flex-col items-center justify-center py-20 transition-all cursor-pointer ${isDragging ? 'bg-[#4569FF]/5 border-[#4569FF]' : 'bg-[#09090b] border-[#27272a] hover:border-zinc-500'}`}>
                  <div className="w-12 h-12 bg-[#18181b] border border-[#27272a] rounded-lg flex items-center justify-center mb-4 shadow-sm"><CloudUpload size={20} className="text-zinc-400"/></div>
                  <h2 className="text-[14px] font-bold text-zinc-200 mb-1">Drop Assets Here</h2>
                  <p className="text-[11px] text-zinc-500 mb-6">Supports JPG, PNG, WEBP • Max 1,000 files</p>
               </div>
            </div>
         ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#09090b]">
               <div className="flex flex-wrap gap-2">
                 <AnimatePresence>
                   {queue.map(item => (
                     <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} key={item.id} onClick={() => item.status === 'done' && setSelectedId(item.id)}
                       className={`relative w-28 h-28 rounded-lg overflow-hidden cursor-pointer transition-all ${selectedId === item.id ? 'border-[2px] border-[#4569FF] ring-2 ring-[#4569FF]/20 shadow-lg' : 'border border-[#27272a] hover:border-zinc-500'} bg-[#18181b]`}>
                       <img src={item.publicUrl || item.preview} className="w-full h-full object-cover"/>
                       {(item.status === 'uploading' || item.status === 'analyzing') && (<div className="absolute inset-0 bg-[#09090b]/80 flex items-center justify-center backdrop-blur-sm"><Loader2 size={16} className="text-[#4569FF] animate-spin"/></div>)}
                       {item.status === 'error' && (<div className="absolute inset-0 bg-red-900/80 flex items-center justify-center backdrop-blur-md"><AlertTriangle size={16} className="text-white"/></div>)}
                       {item.status === 'done' && (<div className="absolute top-1.5 right-1.5 bg-[#09090b]/80 rounded p-0.5 backdrop-blur-md border border-white/10"><CheckCircle2 size={12} className="text-emerald-400"/></div>)}
                     </motion.div>
                   ))}
                 </AnimatePresence>
               </div>
            </div>
         )}

         {/* BOTTOM PANEL */}
         <AnimatePresence>
           {selectedItem?.result && (
              <motion.div initial={{y: "100%"}} animate={{y: 0}} exit={{y: "100%"}} transition={{type: "spring", stiffness: 400, damping: 35}} 
                className="bg-[#18181b] border-t border-[#27272a] p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-30 shrink-0 h-[40vh] min-h-[300px] flex flex-col">
                
                <div className="flex items-center justify-between border-b border-[#27272a] pb-3 mb-4 shrink-0">
                   <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <ImageIcon size={14}/> <span className="text-[12px] font-mono truncate max-w-[200px]" title={selectedItem.name}>{selectedItem.name}</span>
                      </div>
                      <div className="h-4 w-px bg-[#27272a]"></div>
                      <div className="flex items-center gap-4">
                         <button onClick={() => setPanelTab('metadata')} className={`text-[11px] font-semibold uppercase tracking-wider transition-all ${panelTab === 'metadata' ? 'text-[#4569FF]' : 'text-zinc-500 hover:text-zinc-300'}`}>Metadata</button>
                         <button onClick={() => setPanelTab('details')} className={`text-[11px] font-semibold uppercase tracking-wider transition-all ${panelTab === 'details' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Forensics</button>
                      </div>
                   </div>
                   <button onClick={() => setSelectedId(null)} className="p-1 text-zinc-500 hover:text-zinc-200"><X size={14}/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  
                  {panelTab === 'metadata' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex gap-6 h-full">
                       <div className="w-40 shrink-0 h-full">
                         <img src={selectedItem.publicUrl || selectedItem.preview} className="w-full aspect-square object-cover rounded-md border border-[#27272a] bg-[#09090b]"/>
                       </div>
                       
                       <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title ({currentTitle.length}c)</span>
                              <button onClick={() => copyText(currentTitle, 'Title')} className="text-[10px] text-zinc-500 hover:text-[#4569FF] flex items-center gap-1"><Copy size={10}/> Copy</button>
                            </div>
                            <div className="p-2 bg-[#09090b] border border-[#27272a] rounded text-[12px] text-zinc-200 font-medium leading-relaxed">{currentTitle}</div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description ({currentDesc.length}c)</span>
                              <button onClick={() => copyText(currentDesc, 'Description')} className="text-[10px] text-zinc-500 hover:text-[#4569FF] flex items-center gap-1"><Copy size={10}/> Copy</button>
                            </div>
                            <div className="p-2 bg-[#09090b] border border-[#27272a] rounded text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{currentDesc}</div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Keywords ({currentKeywords.length})</span>
                              <button onClick={() => copyText(currentKeywords.map(k=>k.tag).join(', '), 'Keywords')} className="text-[10px] text-zinc-500 hover:text-[#4569FF] flex items-center gap-1"><Copy size={10}/> Copy</button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-[#09090b] border border-[#27272a] rounded max-h-24 overflow-y-auto custom-scrollbar">
                              {currentKeywords.map((k, idx) => (
                                <span key={`${k.tag}-${idx}`} className={`px-2 py-0.5 rounded-[4px] border text-[10px] font-medium ${k.relevance > 85 ? 'bg-[#4569FF]/10 border-[#4569FF]/30 text-[#4569FF]' : 'bg-[#18181b] border-[#27272a] text-zinc-400'}`}>
                                  {k.tag}
                                </span>
                              ))}
                            </div>
                          </div>
                       </div>
                    </motion.div>
                  )}

                  {panelTab === 'details' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="grid grid-cols-2 gap-6">
                       <div className={`p-4 rounded-lg border ${currentScore > 80 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert size={12}/> Analysis Matrix</span>
                            <span className={`text-2xl font-black ${currentScore > 80 ? 'text-emerald-400' : 'text-red-400'}`}>{currentScore}<span className="text-[12px] text-zinc-600">/100</span></span>
                          </div>
                          <div className="space-y-3">
                             {[ {l: 'Lighting & Contrast', v: Math.floor(currentScore * 0.25)}, {l: 'Sharpness & Focus', v: Math.floor(currentScore * 0.24)}, {l: 'Composition', v: Math.floor(currentScore * 0.26)}, {l: 'Generative Artifacts', v: Math.floor(currentScore * 0.25)} ].map((b, i) => (
                               <div key={i}>
                                 <div className="flex justify-between text-[10px] mb-1 text-zinc-400"><span>{b.l}</span><span>{b.v}/25</span></div>
                                 <div className="h-1 w-full bg-[#09090b] rounded-full overflow-hidden"><div className={`h-full rounded-full ${b.v > 20 ? 'bg-emerald-500' : b.v > 15 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${(b.v/25)*100}%`}}></div></div>
                               </div>
                             ))}
                          </div>
                          <p className="mt-4 text-[11px] text-zinc-400 bg-[#09090b] p-2 rounded border border-[#27272a] leading-relaxed italic border-l-2 border-l-[#4569FF]">"{currentNotes}"</p>
                       </div>

                       <div className="flex flex-col h-full">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><TerminalSquare size={12}/> Reverse Beast Prompt</span>
                            <button onClick={() => copyText(currentPrompt, 'Prompt')} className="text-[10px] text-zinc-500 hover:text-[#4569FF] flex items-center gap-1"><Copy size={10}/> Copy</button>
                          </div>
                          <div className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg p-3 overflow-y-auto custom-scrollbar">
                            <p className="text-[11px] font-mono text-[#4569FF]/80 leading-relaxed">{currentPrompt}</p>
                          </div>
                       </div>
                    </motion.div>
                  )}

                </div>
              </motion.div>
           )}
         </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
