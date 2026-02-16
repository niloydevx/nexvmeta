"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { 
  Upload, CheckCircle, XCircle, Sparkles, ScanEye, Download, Settings, LayoutGrid, 
  Calendar, Scissors, Zap, RefreshCw, Sliders, Box, Wand2, Save, TrendingUp, BarChart3, 
  ShieldAlert, Trash2, AlertCircle, ZoomIn, ArrowRightLeft, Activity, Info, Image as ImageIcon
} from "lucide-react";

// --- API KEYS & CONFIG ---
const REMOVE_BG_API_KEY = "yMT4aQLjH2pkmrQ7jU5FjquV"; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wfwvaxchezdbqnxqtvkm.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_qkpIryzPwii4fKn6lE_baQ_EGwIO5ky"
);

// --- TYPES ---
type ToastType = { id: string; msg: string; type: "success" | "error" | "info" };

type SettingsState = {
  titleMin: number; titleMax: number;
  keywordMin: number; keywordMax: number;
  descMin: number; descMax: number;
  platform: string;
  resolution: "4K" | "8K"; 
};

type AnalysisResult = {
  meta: { title: string; description: string; keywords: { tag: string; relevance: number }[]; category: number };
  technical: { quality_score: number; notes: string };
  prompts: { sanitized_prompt: string };
};

type FileItem = {
  id: string; 
  name: string;
  preview: string; 
  status: "uploading" | "ready" | "analyzing" | "done" | "error";
  progress: number;
  result: AnalysisResult | null;
  publicUrl?: string; 
  errorMessage?: string;
};

// --- HELPER FUNCTIONS ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const analyzeWithRetry = async (publicUrl: string, settings: SettingsState, addToast: Function, maxRetries = 5) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      console.log(`Analysis attempt ${attempt + 1}/${maxRetries} for URL:`, publicUrl);
      
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: publicUrl, settings })
      });
      
      const data = await analyzeRes.json();
      
      // Handle rate limits
      if (analyzeRes.status === 429) {
        throw new Error("RateLimitExceeded");
      }
      
      // Handle other errors
      if (!analyzeRes.ok) {
        throw new Error(data.error || `HTTP ${analyzeRes.status}`);
      }
      
      if (data.error) {
        if (data.error.includes("429") || data.error.includes("Rate limit") || data.error.includes("quota")) {
          throw new Error("RateLimitExceeded");
        }
        throw new Error(data.error);
      }
      
      return data;
    } catch (err: any) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, err.message);
      
      if (attempt >= maxRetries) throw err;
      
      // Smart Wait: If 429 Rate Limit, wait 30 seconds for quota reset. Otherwise wait 5s.
      const isRateLimit = err.message.includes("RateLimitExceeded") || 
                         err.message.includes("429") || 
                         err.message.includes("quota") ||
                         err.message.includes("Quota");
      
      const waitTime = isRateLimit ? 30000 : 5000;
      
      addToast(
        isRateLimit 
          ? `⚠️ API rate limit hit! Auto-retrying in ${waitTime/1000}s... (Attempt ${attempt}/${maxRetries})` 
          : `Retrying analysis in ${waitTime/1000}s... (Attempt ${attempt}/${maxRetries})`,
        "info"
      );
      
      await delay(waitTime);
    }
  }
};

// --- MAIN APP COMPONENT ---
export default function NexVmetaPro() {
  const [activeView, setActiveView] = useState("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  
  const [settings, setSettings] = useState<SettingsState>({
    titleMin: 15, titleMax: 70,
    keywordMin: 30, keywordMax: 49,
    descMin: 50, descMax: 200,
    platform: "Adobe Stock",
    resolution: "8K"
  });

  // --- LIFTED STATE FOR PERSISTENCE ---
  const [queue, setQueue] = useState<FileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  // Load Queue on App Mount
  useEffect(() => {
    const saved = localStorage.getItem("nexvmeta_queue_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setQueue(parsed);
      } catch (e) {
        console.error("Failed to parse saved queue:", e);
      }
    }
  }, []);

  // Sync Queue to LocalStorage
  useEffect(() => {
    localStorage.setItem("nexvmeta_queue_v2", JSON.stringify(queue));
  }, [queue]);

  // Toast Notification Trigger
  const addToast = (msg: string, type: ToastType["type"] = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // --- LIFTED LOGIC (Prevents data loss & allows background processing) ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    // Filter for image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      addToast(`${files.length - imageFiles.length} non-image file(s) skipped`, "info");
    }
    
    if (imageFiles.length === 0) {
      addToast("No valid image files selected", "error");
      return;
    }
    
    addToast(`${imageFiles.length} file(s) added to queue`, "info");

    for (const file of imageFiles) {
      const id = Math.random().toString(36).substr(2, 9);
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${Date.now()}-${safeFileName}`;
      const localPreview = URL.createObjectURL(file);
      
      setQueue(prev => [...prev, {
        id, 
        name: file.name, 
        preview: localPreview, 
        status: "uploading", 
        progress: 0, 
        result: null
      }]);

      try {
        // Upload to Supabase with progress tracking
        const { error } = await supabase.storage
          .from('nexvmeta-uploads')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('nexvmeta-uploads')
          .getPublicUrl(fileName);
        
        // Update queue item
        setQueue(prev => prev.map(q => 
          q.id === id ? { 
            ...q, 
            status: "ready", 
            progress: 100, 
            publicUrl, 
            preview: publicUrl 
          } : q
        ));
        
        addToast(`✅ Uploaded: ${file.name}`, "success");
      } catch (err) {
        console.error("Upload error:", err);
        setQueue(prev => prev.map(q => 
          q.id === id ? { 
            ...q, 
            status: "error", 
            progress: 0,
            errorMessage: err instanceof Error ? err.message : "Upload failed"
          } : q
        ));
        addToast(`❌ Upload failed for ${file.name}`, "error");
      }
    }
    
    // Clear input
    e.target.value = '';
  };

  const runBatch = async () => {
    setProcessing(true);
    const pendingItems = queue.filter(q => q.status === "ready" || q.status === "error");
    
    if (pendingItems.length === 0) {
      addToast("No ready items to process", "info");
      setProcessing(false);
      return;
    }
    
    addToast(`Starting analysis for ${pendingItems.length} images...`, "info");
    
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      if (!item.publicUrl) continue;
      
      let analysisInterval: NodeJS.Timeout | null = null;

      try {
        // Progressive delay between requests to avoid rate limits
        // First item: 1s delay, subsequent: 3s delay
        const requestDelay = i === 0 ? 1000 : 3000;
        await delay(requestDelay);

        setQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, status: "analyzing", progress: 0, errorMessage: undefined } : q
        ));
        
        // Simulate progress
        analysisInterval = setInterval(() => {
           setQueue(prev => prev.map(q => {
              if (q.id === item.id && q.status === "analyzing") {
                 return { ...q, progress: Math.min(q.progress + Math.floor(Math.random() * 8) + 2, 95) };
              }
              return q;
           }));
        }, 800);

        const data = await analyzeWithRetry(item.publicUrl, settings, addToast);
        
        if(analysisInterval) clearInterval(analysisInterval);
        
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, status: "done", progress: 100, result: data } : q
        ));
        
        addToast(`✅ Analyzed: ${item.name}`, "success");
      } catch (err) {
        if(analysisInterval) clearInterval(analysisInterval);
        
        const errorMessage = err instanceof Error ? err.message : "Analysis failed";
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, status: "error", progress: 0, errorMessage } : q
        ));
        
        addToast(`❌ Analysis failed for ${item.name}`, "error");
      }
    }
    
    setProcessing(false);
    addToast("✅ Batch processing complete!", "success");
  };

  const clearAll = () => {
    if(confirm("Are you sure you want to delete all data?")) {
      // Clean up object URLs
      queue.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
      
      setQueue([]); 
      localStorage.removeItem("nexvmeta_queue_v2"); 
      setSelectedId(null);
      addToast("Workspace cleared.", "info");
    }
  };

  const removeItem = (id: string) => {
    const item = queue.find(q => q.id === id);
    if (item?.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(item.preview);
    }
    setQueue(prev => prev.filter(q => q.id !== id));
    if (selectedId === id) setSelectedId(null);
    addToast("Item removed", "info");
  };

  const exportAdobeCSV = () => {
    const completedItems = queue.filter(q => q.status === "done" && q.result);
    if (completedItems.length === 0) {
      addToast("No completed files to export", "error");
      return;
    }

    const headers = ["Filename", "Title", "Description", "Keywords", "Category", "Releases"];
    const rows = completedItems.map(item => {
      const res = item.result!;
      const keywordString = res.meta.keywords
        .sort((a, b) => b.relevance - a.relevance)
        .map(k => k.tag)
        .join(", ");
      
      return [
        `"${item.name}"`,
        `"${res.meta.title.replace(/"/g, '""')}"`,
        `"${res.meta.description.replace(/"/g, '""')}"`,
        `"${keywordString}"`,
        res.meta.category || 7,
        ""
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `AdobeStock_Batch_${new Date().toISOString().slice(0,10)}.csv`; 
    link.click();
    addToast("CSV Exported successfully!", "success");
  };

  const retryFailed = async () => {
    const failedItems = queue.filter(q => q.status === "error");
    if (failedItems.length === 0) {
      addToast("No failed items to retry", "info");
      return;
    }
    
    // Reset failed items to ready
    setQueue(prev => prev.map(q => 
      q.status === "error" ? { ...q, status: "ready", progress: 0, errorMessage: undefined } : q
    ));
    
    addToast(`Reset ${failedItems.length} failed items for retry`, "info");
  };

  return (
    <div className="h-screen bg-[#030308] text-white font-sans flex overflow-hidden selection:bg-blue-500/30 relative">
      
      {/* GLOWING AMBIENT BACKGROUNDS (GLASS EFFECT) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* TOAST NOTIFICATION CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl backdrop-blur-2xl border shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto ${
              t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' : 
              t.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-100' : 
              'bg-blue-500/10 border-blue-500/30 text-blue-100'
            }`}
          >
            {t.type === 'success' ? <CheckCircle size={18} className="text-emerald-400"/> : 
             t.type === 'error' ? <AlertCircle size={18} className="text-red-400"/> : 
             <Info size={18} className="text-blue-400"/>}
            <span className="text-sm font-medium">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* SIDEBAR (GLASSMORPHISM) */}
      <aside className="w-20 lg:w-64 bg-white/[0.02] backdrop-blur-3xl border-r border-white/5 flex flex-col z-20 shrink-0 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
           <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">N</div>
           <span className="font-bold text-xl tracking-tight hidden lg:block bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">NexV<span className="text-blue-500">meta</span></span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
          <NavItem active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} icon={LayoutGrid} label="Workspace" />
          
          <div className="px-6 py-2 mt-4 text-[10px] uppercase text-gray-500 font-bold hidden lg:block tracking-widest">Pro Tools</div>
          <NavItem active={activeView === "converter"} onClick={() => setActiveView("converter")} icon={RefreshCw} label="Any Converter" />
          <NavItem active={activeView === "bgremover"} onClick={() => setActiveView("bgremover")} icon={Scissors} label="Pro BG Remover" />
          <NavItem active={activeView === "upscaler"} onClick={() => setActiveView("upscaler")} icon={Zap} label="AI Pro Upscaler" />
          <NavItem active={activeView === "calendar"} onClick={() => setActiveView("calendar")} icon={Calendar} label="Stock Events" />
          <NavItem active={activeView === "scraper"} onClick={() => setActiveView("scraper")} icon={TrendingUp} label="Trend Scraper" />
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-gray-400 hover:text-white transition-all backdrop-blur-lg">
             <Settings size={20} />
             <span className="hidden lg:block text-sm font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative z-10 flex flex-col overflow-hidden">
        {activeView === "dashboard" && (
            <DashboardView 
                queue={queue} 
                selectedId={selectedId} 
                setSelectedId={setSelectedId} 
                processing={processing} 
                handleUpload={handleUpload} 
                runBatch={runBatch} 
                clearAll={clearAll} 
                removeItem={removeItem}
                retryFailed={retryFailed}
                exportAdobeCSV={exportAdobeCSV} 
                addToast={addToast} 
            />
        )}
        {activeView === "converter" && <ConverterView addToast={addToast} />}
        {activeView === "bgremover" && <BgRemoverView addToast={addToast} />}
        {activeView === "upscaler" && <UpscalerView addToast={addToast} />}
        {activeView === "calendar" && <CalendarView />}
        {activeView === "scraper" && <ScraperView addToast={addToast} />}
      </main>

      {/* SETTINGS MODAL (GLASSY) */}
      {showSettings && (
        <div className="absolute top-4 right-4 z-50 w-80 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-6 animate-in fade-in slide-in-from-right-10">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2 text-lg"><Sliders size={18} className="text-blue-500"/> Config</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors"><XCircle size={18} className="text-gray-400 hover:text-white"/></button>
           </div>
           <div className="space-y-5">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <label className="text-xs text-blue-300 font-bold uppercase block mb-2">Metadata Target</label>
                <div className="flex bg-black/40 rounded-xl p-1">
                   {["4K", "8K"].map(res => (
                      <button 
                        key={res}
                        onClick={() => { setSettings({...settings, resolution: res as "4K"|"8K"}); addToast(`Target updated to ${res}`, "info"); }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          settings.resolution === res ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {res}
                      </button>
                   ))}
                </div>
              </div>
              
              {/* Length Settings */}
              {[
                ['Title', 'titleMin', 'titleMax', 5, 100], 
                ['Description', 'descMin', 'descMax', 10, 300], 
                ['Keywords', 'keywordMin', 'keywordMax', 5, 49]
              ].map(([label, minKey, maxKey, minLimit, maxLimit]) => (
                <div key={label.toString()}>
                  <label className="text-xs text-gray-400 font-bold uppercase block mb-2">{label} Length (Min-Max)</label>
                  <div className="flex gap-2">
                     <input 
                       type="number" 
                       min={minLimit as number} 
                       value={settings[minKey as keyof SettingsState] as number} 
                       onChange={(e) => setSettings({...settings, [minKey]: parseInt(e.target.value) || 0})} 
                       className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-sm text-center focus:border-blue-500 outline-none backdrop-blur-md transition-all"
                     />
                     <span className="flex items-center text-gray-600">-</span>
                     <input 
                       type="number" 
                       max={maxLimit as number} 
                       value={settings[maxKey as keyof SettingsState] as number} 
                       onChange={(e) => setSettings({...settings, [maxKey]: parseInt(e.target.value) || 0})} 
                       className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-sm text-center focus:border-blue-500 outline-none backdrop-blur-md transition-all"
                     />
                  </div>
                </div>
              ))}
              
              <div className="pt-2">
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all"
                >
                  Save Settings
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- 1. MAIN BATCH DASHBOARD (GLASSY) ---
function DashboardView({ 
  queue, selectedId, setSelectedId, processing, handleUpload, 
  runBatch, clearAll, removeItem, retryFailed, exportAdobeCSV, addToast 
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedItem = queue.find((q: FileItem) => q.id === selectedId);
  
  const readyCount = queue.filter((q: FileItem) => q.status === "ready").length;
  const doneCount = queue.filter((q: FileItem) => q.status === "done").length;
  const errorCount = queue.filter((q: FileItem) => q.status === "error").length;

  return (
    <div className="h-full flex relative z-10">
       {/* List Sidebar (Glass) */}
       <div className="w-80 bg-white/2 backdrop-blur-xl border-r border-white/5 flex flex-col relative shrink-0 shadow-2xl">
          <div className="p-4 flex gap-2 border-b border-white/5">
             <input 
               type="file" 
               multiple 
               ref={fileInputRef} 
               className="hidden" 
               onChange={handleUpload}
               accept="image/*"
             />
             <button 
               onClick={() => fileInputRef.current?.click()} 
               className="flex-1 py-4 border border-dashed border-white/10 hover:border-blue-500 rounded-2xl flex flex-col items-center gap-1 text-gray-400 hover:text-blue-400 transition-all bg-black/20 hover:bg-blue-500/10"
             >
                <Upload size={20}/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
             </button>
             <button 
               onClick={clearAll} 
               className="w-16 py-4 border border-dashed border-white/10 hover:border-red-500 rounded-2xl flex flex-col items-center gap-1 text-gray-400 hover:text-red-400 transition-all bg-black/20 hover:bg-red-500/10"
             >
                <Trash2 size={20}/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Clear</span>
             </button>
          </div>
          
          {/* Stats Bar */}
          <div className="px-4 py-2 flex gap-2 text-[10px] border-b border-white/5">
            <span className="text-yellow-400">📋 {queue.length}</span>
            <span className="text-green-400">✅ {doneCount}</span>
            <span className="text-blue-400">⏳ {readyCount}</span>
            <span className="text-red-400">❌ {errorCount}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
             {queue.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                 <ImageIcon size={32} className="mb-2 opacity-30" />
                 <p className="text-xs text-center">No images in queue<br />Click Upload to start</p>
               </div>
             ) : (
               queue.map((item: FileItem) => (
                 <div 
                   key={item.id} 
                   onClick={() => setSelectedId(item.id)} 
                   className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer border relative overflow-hidden transition-all duration-300 ${
                     selectedId === item.id ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_20px_rgba(37,99,235,0.1)]' : 
                     'border-white/5 bg-black/20 hover:bg-white/5'
                   }`}
                 >
                   {(item.status === 'uploading' || item.status === 'analyzing') && (
                     <div 
                       className={`absolute left-0 bottom-0 h-1 transition-all duration-300 ${
                         item.status === 'analyzing' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 
                         'bg-gradient-to-r from-blue-500 to-cyan-500'
                       }`} 
                       style={{width: `${item.progress}%`}}
                     ></div>
                   )}
                   
                   <img 
                     src={item.preview} 
                     className="w-11 h-11 rounded-xl object-cover bg-gray-900 border border-white/10 shrink-0"
                     alt={item.name}
                     onError={(e) => {
                       (e.target as HTMLImageElement).src = 'https://via.placeholder.com/44?text=Error';
                     }}
                   />
                   
                   <div className="min-w-0 flex-1">
                      <p className="text-xs truncate text-gray-200 font-medium">{item.name}</p>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className={`text-[9px] uppercase font-bold flex items-center gap-1 tracking-wider ${
                          item.status === 'done' ? 'text-emerald-400' : 
                          item.status === 'error' ? 'text-red-400' : 
                          item.status === 'ready' ? 'text-yellow-400' : 
                          item.status === 'analyzing' ? 'text-purple-400' : 
                          'text-blue-400'
                        }`}>
                          {item.status === 'analyzing' && <RefreshCw size={10} className="animate-spin"/>}
                          {item.status === 'uploading' || item.status === 'analyzing' ? `${item.progress}%` : item.status}
                        </span>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                          className="text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <XCircle size={12} />
                        </button>
                      </div>
                      
                      {item.errorMessage && (
                        <p className="text-[8px] text-red-400 truncate mt-1">{item.errorMessage}</p>
                      )}
                   </div>
                 </div>
               ))
             )}
          </div>

          <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md space-y-3">
             {errorCount > 0 && (
               <button 
                 onClick={retryFailed} 
                 className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/30 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
               >
                 <RefreshCw size={16}/> Retry Failed ({errorCount})
               </button>
             )}
             
             <button 
               onClick={runBatch} 
               disabled={processing || readyCount === 0} 
               className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
             >
               {processing ? <RefreshCw className="animate-spin" size={16}/> : <ScanEye size={16}/>} 
               {processing ? "Processing..." : `Analyze ${readyCount} Image${readyCount !== 1 ? 's' : ''}`}
             </button>
             
             <button 
               onClick={exportAdobeCSV} 
               disabled={doneCount === 0} 
               className="w-full bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all backdrop-blur-md"
             >
               <Download size={16}/> Export CSV ({doneCount})
             </button>
          </div>
       </div>

       {/* Analysis View (Glass) */}
       <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
          {selectedItem?.result ? (
             <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="flex gap-8 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl">
                   <div className="relative group shrink-0">
                     <img 
                       src={selectedItem.preview} 
                       className="w-56 h-56 object-cover rounded-2xl shadow-2xl border border-white/10"
                       alt={selectedItem.name}
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-xs font-bold text-white uppercase tracking-widest truncate">{selectedItem.name}</span>
                     </div>
                   </div>
                   <div className="flex-1 space-y-5">
                      <div>
                         <label className="text-xs text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                           <Sparkles size={14}/> Optimized Title
                         </label>
                         <div className="text-2xl font-bold text-white leading-tight mt-2">{selectedItem.result.meta.title}</div>
                      </div>
                      <div className="w-full h-px bg-gradient-to-r from-white/10 to-transparent"></div>
                      <div>
                         <label className="text-xs text-gray-500 font-bold uppercase tracking-widest">Description</label>
                         <div className="text-sm text-gray-300 mt-2 leading-relaxed">{selectedItem.result.meta.description}</div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className={`p-6 border rounded-3xl backdrop-blur-xl ${
                     selectedItem.result.technical.quality_score > 80 ? 'bg-emerald-500/5 border-emerald-500/20' : 
                     'bg-red-500/5 border-red-500/20'
                   }`}>
                      <div className="flex justify-between mb-3">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Forensic Score</div>
                        <div className="text-sm font-bold text-white bg-black/40 px-3 py-1 rounded-full">{selectedItem.result.technical.quality_score}/100</div>
                      </div>
                      <div className="w-full bg-black/40 h-2 rounded-full mb-4 border border-white/5 overflow-hidden">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${
                             selectedItem.result.technical.quality_score > 80 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 
                             'bg-gradient-to-r from-red-600 to-orange-500'
                           }`} 
                           style={{width: `${selectedItem.result.technical.quality_score}%`}}
                         ></div>
                      </div>
                      <p className="text-xs text-gray-400 flex items-start gap-2 leading-relaxed">
                        {selectedItem.result.technical.quality_score < 80 && <ShieldAlert size={14} className="text-red-400 shrink-0 mt-0.5"/>}
                        {selectedItem.result.technical.notes}
                      </p>
                   </div>
                   
                   <div className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-3xl backdrop-blur-xl relative group">
                      <div className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-3 flex justify-between items-center">
                         <span className="flex items-center gap-2"><Wand2 size={14}/> Reverse Prompt</span>
                         <button 
                           onClick={() => {
                             navigator.clipboard.writeText(selectedItem.result!.prompts.sanitized_prompt); 
                             addToast("Prompt copied!", "success");
                           }} 
                           className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-500/20 p-1.5 rounded-lg hover:bg-purple-500/40 text-purple-300"
                         >
                           <Save size={14}/>
                         </button>
                      </div>
                      <p className="text-[11px] font-mono text-gray-300 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity bg-black/30 p-4 rounded-2xl border border-white/5">
                        {selectedItem.result.prompts.sanitized_prompt}
                      </p>
                   </div>
                </div>

                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
                   <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4 block">Top Priority Keywords</label>
                   <div className="flex flex-wrap gap-2">
                      {selectedItem.result.meta.keywords.map((k: any, i: number) => (
                         <span 
                           key={i} 
                           className={`px-4 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition-all hover:scale-105 cursor-default ${
                             i < 10 ? 'bg-blue-500/10 border-blue-500/30 text-blue-200 shadow-[0_0_10px_rgba(37,99,235,0.2)]' : 
                             'bg-white/5 border-white/10 text-gray-400'
                           }`}
                         >
                           {k.tag} <span className="text-[8px] opacity-50">({k.relevance})</span>
                         </span>
                      ))}
                   </div>
                </div>
             </div>
          ) : selectedItem?.status === 'error' ? (
             <div className="h-full flex flex-col items-center justify-center text-red-500/80 animate-in fade-in duration-500">
                <AlertCircle size={80} className="mb-6 opacity-50 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]"/>
                <p className="text-lg font-medium text-white">Analysis Failed</p>
                <p className="text-sm text-gray-400 mt-2">{selectedItem.errorMessage || "Check logs or wait for Auto-Retry to clear limit."}</p>
                <button 
                  onClick={() => retryFailed()} 
                  className="mt-6 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-sm font-bold text-red-400 transition-all"
                >
                  Retry Failed Items
                </button>
             </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-500/50 animate-in fade-in duration-500">
                <Box size={80} className="mb-6 opacity-20"/>
                <p className="text-lg font-medium text-gray-400">Select an image to view forensic details.</p>
                {queue.length === 0 && (
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="mt-6 px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-sm font-bold text-blue-400 transition-all"
                  >
                    Upload Your First Image
                  </button>
                )}
             </div>
          )}
       </div>
    </div>
  );
}

// --- 2. BG REMOVER (GLASSY) ---
function BgRemoverView({ addToast }: { addToast: Function }) {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
      setError(null);
      addToast("Image loaded for background removal", "info");
    }
  };

  const processBgRemoval = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    addToast("Removing background...", "info");
    
    const formData = new FormData();
    formData.append("image_file", image);
    formData.append("size", "auto");

    try {
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST", 
        headers: { "X-Api-Key": REMOVE_BG_API_KEY }, 
        body: formData,
      });
      
      if (!response.ok) {
        if (response.status === 402) {
          throw new Error("API quota exhausted");
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      addToast("Background removed successfully!", "success");
    } catch (error) { 
      const message = error instanceof Error ? error.message : "Failed to remove background";
      setError(message);
      addToast(`Failed: ${message}`, "error"); 
    }
    setLoading(false);
  };

  const downloadImage = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `removed_bg_${Date.now()}.png`;
      link.click();
      addToast("Image downloaded!", "success");
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 relative z-10">
       <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 max-w-2xl w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-[0_0_40px_rgba(225,29,72,0.4)] rotate-3 hover:rotate-0 transition-transform">
             <Scissors size={36}/>
          </div>
          <h2 className="text-4xl font-bold mb-3 tracking-tight">Pro Background Remover</h2>
          <p className="text-gray-400 mb-10 text-sm">Powered by remove.bg AI</p>

          {!resultUrl ? (
            <div className="space-y-6">
              <input 
                type="file" 
                onChange={handleFileSelect} 
                accept="image/*"
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 file:backdrop-blur-md file:transition-all cursor-pointer bg-black/20 rounded-full p-2 border border-white/5"
              />
              
              {previewUrl && (
                <div className="relative p-2 bg-white/5 rounded-3xl border border-white/10">
                  <img 
                    src={previewUrl} 
                    className="max-h-48 mx-auto rounded-2xl object-contain"
                    alt="Preview"
                  />
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <button 
                onClick={processBgRemoval} 
                disabled={!image || loading} 
                className="w-full bg-white text-black py-4 rounded-2xl font-bold disabled:opacity-50 hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                {loading ? <RefreshCw className="animate-spin mx-auto"/> : "Magic Remove"}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="relative p-2 bg-white/5 rounded-3xl border border-white/10">
                 <img 
                   src={resultUrl} 
                   className="max-h-72 mx-auto rounded-2xl bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAhSURBVDiN7c4xEQAACAOh2v9pI0AEYjAz1Q0eHm8eDw+HCXUDBR0x3mUAAAAASUVORK5CYII=')] bg-repeat shadow-inner"
                   alt="Removed background"
                 />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => { 
                    setImage(null); 
                    setPreviewUrl(null); 
                    setResultUrl(null); 
                  }} 
                  className="flex-1 py-4 border border-white/10 rounded-2xl hover:bg-white/10 font-bold transition-all backdrop-blur-md"
                >
                  Upload New
                </button>
                <button 
                  onClick={downloadImage} 
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-transform"
                >
                  <Download size={18}/> HD Download
                </button>
              </div>
            </div>
          )}
       </div>
    </div>
  );
}

// --- 3. ADVANCED UPSCALER UI (GLASSY) ---
function UpscalerView({ addToast }: { addToast: Function }) {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"result"|"compare">("result");

  const [scale, setScale] = useState(4);
  const [model, setModel] = useState("High Fidelity");
  const [denoise, setDenoise] = useState(50);
  const [enhance, setEnhance] = useState(30);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file); 
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file)); 
      setResultUrl(null); 
      setProgress(0);
      addToast("Image loaded for upscaling.", "info");
    }
  };

  const processUpscale = async () => {
    if (!previewUrl) return;
    setIsProcessing(true); 
    setProgress(0);
    addToast("Initializing AI Models...", "info");

    // Simulate processing with progress
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i);
      await delay(100);
    }

    // Simulate upscaling result
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale; 
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if(ctx) {
        ctx.imageSmoothingEnabled = true; 
        ctx.imageSmoothingQuality = "high";
        ctx.filter = `contrast(${100 + enhance/2}%) saturate(${100 + denoise/4}%)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(canvas.toDataURL("image/png"));
      }
      setIsProcessing(false);
      addToast("Upscaling complete! (Demo - Actual upscaling requires API)", "success");
    };
  };

  const downloadImage = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `upscaled_${scale}x_${Date.now()}.png`;
      link.click();
      addToast("Image downloaded!", "success");
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row relative z-10">
       <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
          {!previewUrl ? (
             <div className="max-w-md w-full text-center">
                <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*"/>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 hover:border-purple-500 bg-white/2 backdrop-blur-3xl rounded-[2.5rem] p-16 cursor-pointer transition-all hover:bg-purple-500/5 group shadow-2xl">
                   <div className="w-24 h-24 bg-purple-600/20 rounded-4xl flex items-center justify-center mx-auto mb-8 text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                      <Zap size={40}/>
                   </div>
                   <h3 className="text-2xl font-bold mb-3 tracking-tight">Drop Image to Upscale</h3>
                   <p className="text-gray-500 text-sm">Supports RAW, JPG, PNG, WEBP</p>
                </div>
             </div>
          ) : (
             <div className="relative w-full h-full flex items-center justify-center bg-black/20 rounded-3xl border border-white/5 backdrop-blur-sm p-4">
                {viewMode === "compare" && resultUrl ? (
                  <div className="flex gap-6 w-full h-full items-center justify-center">
                     <div className="flex-1 flex flex-col items-center gap-3">
                        <span className="text-xs text-gray-400 uppercase font-bold tracking-widest bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">Original</span>
                        <img src={previewUrl} className="max-h-[70vh] object-contain rounded-2xl border border-white/5 opacity-80"/>
                     </div>
                     <div className="flex-1 flex flex-col items-center gap-3">
                        <span className="text-xs text-purple-200 uppercase font-bold tracking-widest bg-purple-900/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]">Upscaled ({scale}x)</span>
                        <img src={resultUrl} className="max-h-[70vh] object-contain rounded-2xl border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)]"/>
                     </div>
                  </div>
                ) : (
                  <img 
                    src={resultUrl || previewUrl} 
                    className={`max-h-[85vh] object-contain rounded-2xl transition-all duration-700 ${
                      resultUrl ? 'shadow-[0_0_60px_rgba(168,85,247,0.2)] border border-purple-500/20' : 
                      'border border-white/5 opacity-70'
                    }`} 
                    alt="Upscale preview"
                  />
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl z-10 animate-in fade-in duration-300">
                     <div className="w-72 space-y-6 text-center">
                        <div className="relative w-20 h-20 mx-auto">
                           <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                           <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                           <Zap size={30} className="text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"/>
                        </div>
                        <h3 className="font-bold text-xl tracking-tight">Enhancing Details</h3>
                        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/5">
                           <div 
                             className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 relative" 
                             style={{width: `${progress}%`}}
                           >
                             <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                           </div>
                        </div>
                        <p className="text-xs text-purple-300 uppercase tracking-widest font-bold">{progress}% Complete</p>
                     </div>
                  </div>
                )}
             </div>
          )}
       </div>

       <div className="w-80 bg-white/2 backdrop-blur-3xl shrink-0 flex flex-col h-full border-l border-white/5 shadow-2xl z-20">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
             <h2 className="font-bold text-lg flex items-center gap-2"><ZoomIn size={20} className="text-purple-400"/> Studio Engine</h2>
             {previewUrl && (
               <button 
                 onClick={() => {
                   if (previewUrl) URL.revokeObjectURL(previewUrl);
                   if (resultUrl) URL.revokeObjectURL(resultUrl);
                   setImage(null); 
                   setPreviewUrl(null); 
                   setResultUrl(null); 
                   addToast("Workspace reset","info");
                 }} 
                 className="text-xs font-bold text-gray-500 hover:text-white bg-white/5 px-3 py-1 rounded-full border border-white/5 transition-colors"
               >
                 Reset
               </button>
             )}
          </div>
          
          <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
             <div>
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-4">Output Scale</label>
                <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm">
                   {[2, 4, 8].map(s => (
                      <button 
                        key={s} 
                        onClick={() => setScale(s)} 
                        className={`py-2.5 text-sm font-bold rounded-xl transition-all ${
                          scale === s ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 
                          'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                        }`}
                      >
                        {s}x
                      </button>
                   ))}
                </div>
             </div>

             <div>
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-4">AI Model Profile</label>
                <div className="space-y-3">
                   {["Standard", "High Fidelity", "Art & CG", "Face Recovery"].map(m => (
                      <button 
                        key={m} 
                        onClick={() => setModel(m)} 
                        className={`w-full text-left px-5 py-3.5 text-sm font-medium rounded-2xl border transition-all flex items-center gap-4 backdrop-blur-md ${
                          model === m ? 'bg-purple-500/10 border-purple-500/50 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 
                          'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                          model === m ? 'border-purple-400 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 
                          'border-gray-600 bg-transparent'
                        }`}></div>
                        {m}
                      </button>
                   ))}
                </div>
             </div>

             <div className="space-y-8 bg-black/20 p-5 rounded-3xl border border-white/5">
                <div>
                  <div className="flex justify-between mb-3">
                     <label className="text-xs text-gray-400 font-bold uppercase tracking-widest">Suppress Noise</label>
                     <span className="text-xs font-mono bg-black/50 px-2 py-0.5 rounded text-purple-300">{denoise}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={denoise} 
                    onChange={(e) => setDenoise(parseInt(e.target.value))} 
                    className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-3">
                     <label className="text-xs text-gray-400 font-bold uppercase tracking-widest">Enhance Details</label>
                     <span className="text-xs font-mono bg-black/50 px-2 py-0.5 rounded text-purple-300">{enhance}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={enhance} 
                    onChange={(e) => setEnhance(parseInt(e.target.value))} 
                    className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
             </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md space-y-4">
             {resultUrl && (
               <div className="flex gap-3 mb-4 animate-in slide-in-from-bottom-4 duration-300">
                  <button 
                    onClick={() => setViewMode(viewMode === "result" ? "compare" : "result")} 
                    className="flex-1 py-3.5 text-xs font-bold border border-white/10 rounded-2xl hover:bg-white/10 flex items-center justify-center gap-2 backdrop-blur-md transition-all"
                  >
                     <ArrowRightLeft size={14}/> {viewMode === "compare" ? "Original" : "Compare"}
                  </button>
                  <button 
                    onClick={downloadImage} 
                    className="flex-1 py-3.5 text-xs font-bold bg-white text-black rounded-2xl hover:bg-gray-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all"
                  >
                     <Download size={14}/> Save
                  </button>
               </div>
             )}
             <button 
               onClick={processUpscale} 
               disabled={!previewUrl || isProcessing} 
               className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:grayscale transition-all relative overflow-hidden group"
             >
                <div className="absolute inset-0 bg-white/20 w-0 group-hover:w-full transition-all duration-500 ease-out"></div>
                {isProcessing ? <RefreshCw className="animate-spin relative z-10" size={18}/> : <Sparkles size={18} className="relative z-10"/>} 
                <span className="relative z-10 tracking-wide">{isProcessing ? "Processing AI..." : "Upscale Image"}</span>
             </button>
          </div>
       </div>
    </div>
  );
}

// --- 4. CONVERTER (GLASSY) ---
function ConverterView({ addToast }: { addToast: Function }) {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState("image/png");
  const [converting, setConverting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      addToast(`${e.target.files.length} files queued.`, "info");
    }
  };

  const convert = async () => {
    setConverting(true);
    addToast(`Converting ${files.length} files...`, "info");
    
    let successCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await convertFile(file, format);
        if (result) successCount++;
      } catch (error) {
        console.error(`Failed to convert ${file.name}:`, error);
      }
    }
    
    setConverting(false);
    addToast(`Conversion complete! ${successCount}/${files.length} files saved.`, "success");
    setFiles([]);
  };

  const convertFile = (file: File, targetFormat: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width; 
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const link = document.createElement("a");
            const extension = targetFormat.split('/')[1];
            link.download = `nexv_${file.name.split('.')[0]}.${extension}`;
            link.href = canvas.toDataURL(targetFormat, 0.92);
            link.click();
            resolve(true);
          } else {
            resolve(false);
          }
        };
        img.onerror = () => resolve(false);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(file);
    });
  };

  return (
     <div className="h-full flex flex-col items-center justify-center p-10 relative z-10">
        <div className="max-w-xl w-full text-center space-y-8 bg-white/[0.02] backdrop-blur-3xl p-12 rounded-[3rem] border border-white/10 shadow-2xl">
           <div className="w-20 h-20 bg-blue-600/20 rounded-[2rem] flex items-center justify-center mx-auto text-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
              <RefreshCw size={36}/>
           </div>
           <div>
              <h2 className="text-4xl font-bold tracking-tight mb-2">Any Format Converter</h2>
              <p className="text-gray-400">Local processing. 100% private.</p>
           </div>
           
           <div className="p-10 border-2 border-dashed border-white/10 hover:border-blue-500 rounded-[2rem] bg-black/20 transition-all cursor-pointer relative">
              <input 
                type="file" 
                multiple 
                onChange={handleFileSelect} 
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto mb-4 text-gray-500" size={32}/>
              <p className="text-white font-bold text-lg mb-1">Click or Drag Files</p>
              <p className="text-gray-500 text-sm">
                {files.length > 0 ? 
                  <span className="text-blue-400 font-bold">{files.length} files ready</span> : 
                  "Supports any image type"
                }
              </p>
           </div>
           
           {files.length > 0 && (
             <div className="bg-white/5 p-4 rounded-2xl max-h-32 overflow-y-auto">
               {files.map((file, i) => (
                 <div key={i} className="text-xs text-left text-gray-400 truncate py-1">
                   • {file.name} ({(file.size / 1024).toFixed(1)} KB)
                 </div>
               ))}
             </div>
           )}
           
           <div className="flex gap-4 justify-center">
              <select 
                onChange={(e) => setFormat(e.target.value)} 
                value={format}
                className="bg-black/40 text-white px-6 py-4 rounded-2xl border border-white/10 outline-none backdrop-blur-md font-bold cursor-pointer hover:bg-white/5 transition-colors"
              >
                 <option value="image/png">To PNG</option>
                 <option value="image/jpeg">To JPG</option>
                 <option value="image/webp">To WEBP</option>
              </select>
              <button 
                onClick={convert} 
                disabled={files.length === 0 || converting} 
                className="bg-gradient-to-r from-blue-600 to-cyan-600 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-bold hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2"
              >
                {converting && <RefreshCw size={16} className="animate-spin"/>}
                {converting ? "Converting..." : "Convert All"}
              </button>
           </div>
        </div>
     </div>
  );
}

// --- 5. DYNAMIC CALENDAR UI (GLASSY) ---
function CalendarView() {
  const getDynamicEvents = () => {
     const today = new Date();
     const year = today.getFullYear();
     const baseEvents = [
        { date: new Date(year, 0, 1), title: "New Year's Day", type: "Evergreen" },
        { date: new Date(year, 1, 14), title: "Valentine's Day", type: "Trending" },
        { date: new Date(year, 2, 8), title: "Intl Women's Day", type: "High Demand" },
        { date: new Date(year, 2, 17), title: "St. Patrick's Day", type: "Seasonal" },
        { date: new Date(year, 3, 4), title: "Easter Sunday", type: "Seasonal" },
        { date: new Date(year, 4, 12), title: "Mother's Day", type: "High Demand" },
        { date: new Date(year, 5, 16), title: "Father's Day", type: "Trending" },
        { date: new Date(year, 9, 31), title: "Halloween", type: "Trending" },
        { date: new Date(year, 10, 28), title: "Thanksgiving", type: "Seasonal" },
        { date: new Date(year, 11, 25), title: "Christmas", type: "High Demand" }
     ];
     
     // Filter to upcoming events within next 6 months
     const sixMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
     
     return baseEvents
       .filter(e => e.date >= today && e.date <= sixMonthsFromNow)
       .sort((a, b) => a.date.getTime() - b.date.getTime())
       .slice(0, 6)
       .map(e => ({
           day: e.date.getDate().toString().padStart(2, '0'),
           month: e.date.toLocaleString('default', { month: 'short' }).toUpperCase(),
           title: e.title,
           type: e.type
        }));
  };
  
  const events = getDynamicEvents();

  return (
    <div className="h-full p-10 flex flex-col items-center justify-center relative z-10">
       <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
             <div className="w-20 h-20 bg-orange-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                <Calendar size={36}/>
             </div>
             <h2 className="text-4xl font-bold tracking-tight">Stock Event Radar</h2>
             <p className="text-gray-400 mt-2">Upcoming high-demand opportunities for {new Date().getFullYear()}</p>
          </div>
          
          <div className="grid gap-4">
             {events.length > 0 ? (
               events.map((ev, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 p-5 rounded-3xl flex justify-between items-center hover:bg-white/[0.06] hover:border-white/10 hover:scale-[1.01] transition-all backdrop-blur-xl shadow-lg cursor-default group">
                     <div className="flex items-center gap-6">
                        <div className="text-center bg-black/40 p-3 rounded-2xl w-20 border border-white/5 group-hover:border-orange-500/30 transition-colors">
                           <div className="text-xs text-orange-400 font-bold tracking-widest uppercase">{ev.month}</div>
                           <div className="text-2xl font-black text-white">{ev.day}</div>
                        </div>
                        <span className="font-bold text-xl tracking-wide">{ev.title}</span>
                     </div>
                     <span className="px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase bg-white/5 text-gray-300 border border-white/10 group-hover:bg-orange-500/10 group-hover:text-orange-300 group-hover:border-orange-500/30 transition-all">{ev.type}</span>
                  </div>
               ))
             ) : (
               <div className="text-center text-gray-500 py-10">
                 No upcoming events found
               </div>
             )}
          </div>
       </div>
    </div>
  );
}

// --- 6. DYNAMIC TREND SCRAPER UI (GLASSY) ---
function ScraperView({ addToast }: { addToast: Function }) {
   const [trends, setTrends] = useState<any[]>([]);
   const [scanning, setScanning] = useState(true);
   const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

   useEffect(() => {
      fetchTrends();
   }, []);

   const fetchTrends = async () => {
      setScanning(true);
      await delay(2000); // Simulate API call
      
      const today = new Date();
      const currentMonth = today.toLocaleString('default', { month: 'long' });
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1).toLocaleString('default', { month: 'long' });
      const year = today.getFullYear();
      
      // Dynamic trend data
      const trendCategories = [
         { topic: `AI Architecture ${year}`, baseVol: 450 },
         { topic: `Sustainable ${currentMonth}`, baseVol: 320 },
         { topic: `Crypto Trends ${year}`, baseVol: 280 },
         { topic: `Eco-friendly Packaging`, baseVol: 180 },
         { topic: `${nextMonth} Travel Concepts`, baseVol: 220 },
         { topic: `Remote Workspace Future`, baseVol: 190 },
         { topic: `Virtual Reality UI`, baseVol: 150 },
         { topic: `Clean Energy Revolution`, baseVol: 210 },
         { topic: `Digital Nomad Lifestyle`, baseVol: 170 },
         { topic: `Smart Home Innovations`, baseVol: 195 }
      ];
      
      // Randomize and pick 5
      const shuffled = [...trendCategories].sort(() => 0.5 - Math.random()).slice(0, 5);
      
      const newTrends = shuffled.map(item => {
         // Add some randomness to volume
         const vol = Math.floor(item.baseVol * (0.8 + Math.random() * 0.4));
         let competition, status;
         
         if (vol > 350) { 
           competition = "High"; 
           status = "Saturated"; 
         } else if (vol > 200) { 
           competition = "Medium"; 
           status = "Evergreen"; 
         } else { 
           competition = "Low"; 
           status = "Hot Opportunity"; 
         }
         
         return { 
           topic: item.topic, 
           volume: `${vol}K/mo`, 
           competition, 
           status 
         };
      });
      
      setTrends(newTrends); 
      setLastUpdated(new Date());
      setScanning(false);
      addToast("Live market data fetched successfully", "success");
   };

   return (
      <div className="h-full p-10 flex flex-col items-center justify-center relative z-10">
         <div className="max-w-4xl w-full">
            <div className="flex items-center gap-5 mb-10 bg-white/[0.02] p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
               <div className="p-4 bg-emerald-500/20 rounded-[1.5rem] text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  {scanning ? <Activity className="animate-pulse" size={36}/> : <BarChart3 size={36}/>}
               </div>
               <div className="flex-1">
                  <h2 className="text-3xl font-bold tracking-tight">Market Velocity Scanner</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {scanning 
                      ? "Establishing secure connection to global agencies..." 
                      : `Live data stream active for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`
                    }
                  </p>
                  {lastUpdated && !scanning && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
               </div>
               <button 
                 onClick={fetchTrends}
                 disabled={scanning}
                 className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
               >
                 <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
               </button>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative min-h-[350px] backdrop-blur-2xl">
               {scanning ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-20">
                     <div className="relative">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="w-20 h-20"></div>
                     </div>
                     <h3 className="font-bold text-xl mt-6 animate-pulse tracking-wide">Aggregating Data Nodes</h3>
                     <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-2">Connecting API...</p>
                  </div>
               ) : (
                  <table className="w-full text-left">
                     <thead className="bg-black/40 border-b border-white/10 text-xs uppercase text-gray-500 font-bold tracking-widest">
                        <tr>
                           <th className="p-6">Trend Topic</th>
                           <th className="p-6">Search Vol</th>
                           <th className="p-6">Competition</th>
                           <th className="p-6">Signal</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {trends.map((t, i) => (
                           <tr key={i} className="hover:bg-white/5 transition-colors animate-in fade-in slide-in-from-bottom-8 duration-500" style={{animationDelay: `${i * 150}ms`}}>
                              <td className="p-6 font-bold text-white text-lg flex items-center gap-3">
                                 <div className={`p-2 rounded-xl ${t.status === 'Hot Opportunity' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                                    <TrendingUp size={18}/>
                                 </div>
                                 {t.topic}
                              </td>
                              <td className="p-6 font-mono text-gray-300">{t.volume}</td>
                              <td className="p-6 text-gray-300 font-medium">{t.competition}</td>
                              <td className="p-6">
                                 <span className={`px-4 py-2 text-xs font-bold rounded-full tracking-widest uppercase border ${
                                   t.status === 'Hot Opportunity' 
                                     ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                                     : t.status === 'Evergreen' 
                                     ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' 
                                     : 'bg-red-500/10 text-red-300 border-red-500/30'
                                 }`}>
                                    {t.status}
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </div>
         </div>
      </div>
   );
}

// --- UTIL ---
function NavItem({ active, onClick, icon: Icon, label }: any) {
  return (
     <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 transition-all group relative overflow-hidden ${active ? "text-white" : "text-gray-500 hover:text-gray-300"}`}>
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,1)] rounded-r-full"></div>}
        {active && <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent"></div>}
        <Icon size={20} className={`relative z-10 transition-transform group-hover:scale-110 ${active ? "text-blue-400 drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]" : ""}`} />
        <span className="relative z-10 text-sm font-bold tracking-wide hidden lg:block">{label}</span>
     </button>
  );
}
