"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Upload, CheckCircle, XCircle, Sparkles, FileText, 
  ScanEye, Download, Settings, LayoutGrid, 
  Image as ImageIcon, Calendar, Scissors, Zap, Layers,
  RefreshCw, ChevronRight, Sliders, Box, ShieldCheck,
  Wand2, Search, ArrowRight, Save
} from "lucide-react";

// --- GLOBAL CONFIG ---
const REMOVE_BG_API_KEY = "yMT4aQLjH2pkmrQ7jU5FjquV"; 

// --- TYPES ---
type SettingsState = {
  titleMin: number; titleMax: number;
  keywordMin: number; keywordMax: number;
  descMin: number; descMax: number;
  platform: string;
  resolution: "4K" | "8K"; // New Feature
};

type AnalysisResult = {
  meta: { title: string; description: string; keywords: { tag: string }[]; category: number };
  technical: { quality_score: number; notes: string };
  prompts: { midjourney: string; upscale_prompt: string };
};

type FileItem = {
  id: string; file: File; preview: string; status: "idle" | "processing" | "done" | "error";
  result: AnalysisResult | null;
};

// --- MAIN APP ---
export default function NexVmetaPro() {
  const [activeView, setActiveView] = useState("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  
  // Default Settings
  const [settings, setSettings] = useState<SettingsState>({
    titleMin: 5, titleMax: 50,
    keywordMin: 10, keywordMax: 49,
    descMin: 20, descMax: 200,
    platform: "Adobe Stock",
    resolution: "8K"
  });

  return (
    <div className="h-screen bg-[#05050a] text-white font-sans flex overflow-hidden">
      
      {/* 1. SIDEBAR */}
      <aside className="w-20 lg:w-64 bg-[#0a0a12] border-r border-gray-800 flex flex-col z-20">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">N</div>
           <span className="font-bold text-xl tracking-tight hidden lg:block">NexV<span className="text-blue-500">meta</span></span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-1">
          <NavItem active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} icon={LayoutGrid} label="Batch Workspace" />
          
          <div className="px-6 py-2 mt-4 text-[10px] uppercase text-gray-500 font-bold hidden lg:block tracking-widest">Real Tools</div>
          <NavItem active={activeView === "converter"} onClick={() => setActiveView("converter")} icon={RefreshCw} label="Any Converter" />
          <NavItem active={activeView === "bgremover"} onClick={() => setActiveView("bgremover")} icon={Scissors} label="Pro BG Remover" />
          <NavItem active={activeView === "upscaler"} onClick={() => setActiveView("upscaler")} icon={Zap} label="4K/8K Upscaler" />
          <NavItem active={activeView === "calendar"} onClick={() => setActiveView("calendar")} icon={Calendar} label="Stock Events" />
          <NavItem active={activeView === "scraper"} onClick={() => setActiveView("scraper")} icon={ScanEye} label="Trend Analyzer" />
        </div>

        <div className="p-4 border-t border-gray-800">
          <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all">
             <Settings size={20} />
             <span className="hidden lg:block text-sm font-medium">Preferences</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN AREA */}
      <main className="flex-1 relative bg-[#020205] overflow-hidden">
        {activeView === "dashboard" && <DashboardView settings={settings} />}
        {activeView === "converter" && <ConverterView />}
        {activeView === "bgremover" && <BgRemoverView />}
        {activeView === "upscaler" && <UpscalerView settings={settings} />}
        {activeView === "calendar" && <CalendarView />}
        {activeView === "scraper" && <ScraperView />}
      </main>

      {/* 3. SETTINGS MODAL */}
      {showSettings && (
        <div className="absolute top-4 right-4 z-50 w-80 bg-[#15151e] border border-gray-700 rounded-2xl shadow-2xl p-6 animate-in fade-in slide-in-from-right-10">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2 text-lg"><Sliders size={18} className="text-blue-500"/> Config</h3>
              <button onClick={() => setShowSettings(false)}><XCircle size={18} className="text-gray-500 hover:text-white"/></button>
           </div>
           
           <div className="space-y-6">
              {/* Resolution Toggle */}
              <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-500/20">
                <label className="text-xs text-blue-300 font-bold uppercase block mb-2">Upscale Target</label>
                <div className="flex bg-black/40 rounded-lg p-1">
                   {["4K", "8K"].map(res => (
                      <button 
                        key={res}
                        onClick={() => setSettings({...settings, resolution: res as "4K"|"8K"})}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.resolution === res ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {res}
                      </button>
                   ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-2">Title Length ({settings.titleMin}-{settings.titleMax})</label>
                <div className="flex gap-2 items-center">
                   <input type="range" min="5" max="50" value={settings.titleMin} onChange={(e) => setSettings({...settings, titleMin: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                   <input type="range" min="50" max="100" value={settings.titleMax} onChange={(e) => setSettings({...settings, titleMax: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-2">Keywords ({settings.keywordMin}-{settings.keywordMax})</label>
                <div className="flex gap-2 items-center">
                   <input type="range" min="5" max="30" value={settings.keywordMin} onChange={(e) => setSettings({...settings, keywordMin: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                   <input type="range" min="30" max="50" value={settings.keywordMax} onChange={(e) => setSettings({...settings, keywordMax: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

// --- 1. DASHBOARD (BATCH) ---
function DashboardView({ settings }: { settings: SettingsState }) {
  const [queue, setQueue] = useState<FileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        status: "idle" as const,
        result: null
      }));
      setQueue(prev => [...prev, ...newFiles]);
    }
  };

  const runBatch = async () => {
    setProcessing(true);
    const pending = queue.filter(q => q.status === "idle");
    for (const item of pending) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "processing" } : q));
      try {
        const reader = new FileReader();
        reader.onload = async () => {
           const res = await fetch("/api/analyze", {
             method: "POST",
             body: JSON.stringify({ 
               image: reader.result,
               settings: settings 
             }), 
           });
           const data = await res.json();
           if(data.error) throw new Error(data.error);
           setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "done", result: data } : q));
        };
        reader.readAsDataURL(item.file);
      } catch (err) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "error" } : q));
      }
    }
    setProcessing(false);
  };

  const selectedItem = queue.find(q => q.id === selectedId);

  return (
    <div className="h-full flex">
       {/* List */}
       <div className="w-80 border-r border-gray-800 bg-[#0c0c14] flex flex-col">
          <div className="p-4">
             <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleUpload}/>
             <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border border-dashed border-gray-700 hover:border-blue-500 rounded-xl flex flex-col items-center gap-2 text-gray-500 hover:text-blue-400 transition-all bg-white/5">
                <Upload size={24}/>
                <span className="text-xs font-bold uppercase">Upload Batch</span>
             </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
             {queue.map(item => (
                <div key={item.id} onClick={() => setSelectedId(item.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border ${selectedId === item.id ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:bg-white/5'}`}>
                   <img src={item.preview} className="w-10 h-10 rounded object-cover bg-gray-800"/>
                   <div className="min-w-0">
                      <p className="text-xs truncate text-gray-300">{item.file.name}</p>
                      <span className={`text-[10px] uppercase font-bold ${item.status === 'done' ? 'text-emerald-400' : 'text-gray-500'}`}>{item.status}</span>
                   </div>
                </div>
             ))}
          </div>
          <div className="p-4 border-t border-gray-800">
             <button onClick={runBatch} disabled={processing} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
               {processing ? <RefreshCw className="animate-spin" size={16}/> : <ScanEye size={16}/>} Start Analysis
             </button>
          </div>
       </div>

       {/* Details */}
       <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {selectedItem?.result ? (
             <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex gap-6">
                   <div className="relative group">
                     <img src={selectedItem.preview} className="w-48 h-48 object-cover rounded-xl shadow-2xl border border-gray-700"/>
                     <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold border border-white/10">{settings.resolution} TARGET</div>
                   </div>
                   <div className="flex-1 space-y-4">
                      <div>
                         <label className="text-xs text-gray-500 font-bold uppercase">Optimized Title</label>
                         <div className="text-xl font-bold text-white leading-tight mt-1">{selectedItem.result.meta.title}</div>
                      </div>
                      <div>
                         <label className="text-xs text-gray-500 font-bold uppercase">Description</label>
                         <div className="text-sm text-gray-400 mt-1">{selectedItem.result.meta.description}</div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-[#15151e] border border-gray-700 rounded-xl">
                      <div className="flex justify-between mb-2">
                        <div className="text-xs text-gray-400 font-bold uppercase">Quality Score</div>
                        <div className={`text-xs font-bold ${selectedItem.result.technical.quality_score > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>{selectedItem.result.technical.quality_score}/100</div>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full mb-3">
                         <div className="h-full bg-blue-500 rounded-full" style={{width: `${selectedItem.result.technical.quality_score}%`}}></div>
                      </div>
                      <p className="text-xs text-gray-500">{selectedItem.result.technical.notes}</p>
                   </div>
                   
                   <div className="p-5 bg-purple-900/10 border border-purple-500/20 rounded-xl relative group">
                      <div className="text-xs text-purple-400 font-bold uppercase mb-2 flex items-center gap-2"><Sparkles size={12}/> {settings.resolution} Upscale Prompt</div>
                      <p className="text-[10px] font-mono text-gray-300 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        {selectedItem.result.prompts.upscale_prompt}
                      </p>
                      <button 
                        onClick={() => navigator.clipboard.writeText(selectedItem.result!.prompts.upscale_prompt)}
                        className="absolute top-2 right-2 p-1.5 bg-purple-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Save size={12}/>
                      </button>
                   </div>
                </div>

                <div>
                   <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Keywords ({selectedItem.result.meta.keywords.length})</label>
                   <div className="flex flex-wrap gap-2">
                      {selectedItem.result.meta.keywords.map((k,i) => (
                         <span key={i} className="px-3 py-1 bg-[#15151e] border border-gray-800 rounded text-xs text-gray-300 hover:border-blue-500 transition-colors cursor-pointer">{k.tag}</span>
                      ))}
                   </div>
                </div>
             </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <Box size={64} className="mb-6 opacity-20"/>
                <p>Select an image to view analysis.</p>
             </div>
          )}
       </div>
    </div>
  );
}

// --- 2. BG REMOVER (WORKING API) ---
function BgRemoverView() {
  const [image, setImage] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processBgRemoval = async () => {
    if (!image) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append("image_file", image);
    formData.append("size", "auto");

    try {
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": REMOVE_BG_API_KEY },
        body: formData,
      });

      if (!response.ok) throw new Error("API Limit Reached or Invalid Key");
      
      const blob = await response.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (error) {
      alert("Failed: Check API Key Quota.");
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 relative">
       <div className="bg-[#15151e] border border-gray-700 rounded-2xl p-8 max-w-2xl w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-pink-900/40">
             <Scissors size={32}/>
          </div>
          <h2 className="text-3xl font-bold mb-2">Pro Background Remover</h2>
          <p className="text-gray-400 mb-8 text-sm">Powered by remove.bg API (Quota Enabled)</p>

          {!resultUrl ? (
            <div className="space-y-4">
              <input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-500"/>
              <button 
                onClick={processBgRemoval} 
                disabled={!image || loading}
                className="w-full bg-white text-black py-3 rounded-lg font-bold disabled:opacity-50 hover:bg-gray-200 transition-colors"
              >
                {loading ? "Removing Background..." : "Remove Background Now"}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in">
              <img src={resultUrl} className="max-h-64 mx-auto rounded-lg border border-gray-600 bg-[url('https://media.istockphoto.com/id/1146311516/vector/checker-seamless-pattern-vector-transparent-grid-background-transparency-grid-texture.jpg?s=612x612&w=0&k=20&c=d5m6hT4fA0Q0A0o9y0_0A0')]"/>
              <div className="flex gap-2">
                <button onClick={() => { setImage(null); setResultUrl(null); }} className="flex-1 py-3 border border-gray-600 rounded-lg hover:bg-white/5">Reset</button>
                <a href={resultUrl} download="removed_bg.png" className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-400">
                   <Download size={18}/> Download PNG
                </a>
              </div>
            </div>
          )}
       </div>
    </div>
  );
}

// --- 3. UPSCALER (PROMPT GENERATOR & PREVIEW) ---
function UpscalerView({ settings }: { settings: SettingsState }) {
  const [prompt, setPrompt] = useState("");
  
  const generateUpscalePrompt = () => {
     // Simulating the prompt generation logic locally for immediate feedback
     const quality = settings.resolution === "8K" ? "8k resolution, ultra-detailed, sharp focus" : "4k resolution, highly detailed";
     setPrompt(`(Upscale Trigger) Subject in ${quality}, photorealistic texture, ray traced lighting, unreal engine 5 style, masterpiece --v 6.0 --upbeta`);
  };

  return (
     <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-[#15151e] border border-gray-700 rounded-2xl p-8 shadow-2xl">
           <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-purple-600/20 rounded-lg text-purple-400"><Zap size={24}/></div>
              <div>
                 <h2 className="text-2xl font-bold">AI Upscale Engineer</h2>
                 <p className="text-xs text-gray-400">Target: <span className="text-white font-bold">{settings.resolution}</span></p>
              </div>
           </div>

           <div className="space-y-6">
              <div className="p-4 bg-black/40 rounded-xl border border-dashed border-gray-700 text-center text-gray-500 text-sm">
                 Upload any low-res image to generate the perfect <span className="text-purple-400">MagnificAI</span> or <span className="text-purple-400">Topaz</span> prompt.
              </div>
              
              <button onClick={generateUpscalePrompt} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                 <Wand2 size={18}/> Generate {settings.resolution} Prompt
              </button>

              {prompt && (
                 <div className="bg-[#0a0a12] p-4 rounded-xl border border-purple-500/30 animate-in fade-in slide-in-from-top-2">
                    <p className="text-sm font-mono text-gray-300 mb-3">{prompt}</p>
                    <button onClick={() => navigator.clipboard.writeText(prompt)} className="text-xs flex items-center gap-1 text-purple-400 font-bold hover:text-white">
                       <Save size={12}/> Copy to Clipboard
                    </button>
                 </div>
              )}
           </div>
        </div>
     </div>
  );
}

// --- 4. REAL CONVERTER ---
function ConverterView() {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState("image/png");

  const convert = () => {
     files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
           const img = new Image();
           img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0);
              const link = document.createElement("a");
              link.download = `nexv_${file.name.split('.')[0]}.${format.split('/')[1]}`;
              link.href = canvas.toDataURL(format);
              link.click();
           };
           img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
     });
  };

  return (
     <div className="h-full flex flex-col items-center justify-center p-10">
        <div className="max-w-xl w-full text-center space-y-6">
           <h2 className="text-3xl font-bold">Any Converter</h2>
           <div className="p-10 border-2 border-dashed border-gray-700 rounded-2xl bg-[#15151e] hover:border-blue-500 transition-colors">
              <input type="file" multiple onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"/>
              <p className="text-gray-500 text-xs mt-4">{files.length} files queued</p>
           </div>
           <div className="flex gap-4 justify-center">
              <select onChange={(e) => setFormat(e.target.value)} className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700">
                 <option value="image/png">to PNG</option>
                 <option value="image/jpeg">to JPG</option>
                 <option value="image/webp">to WEBP</option>
              </select>
              <button onClick={convert} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20">Convert All</button>
           </div>
        </div>
     </div>
  );
}

// --- 5. CALENDAR & SCRAPER (Visual Tools) ---
function CalendarView() {
  const events = [
    { date: "Feb 14", title: "Valentine's Day", type: "Trending" },
    { date: "Mar 08", title: "Intl Women's Day", type: "High Demand" },
    { date: "Mar 17", title: "St. Patrick's Day", type: "Seasonal" },
    { date: "Mar 31", title: "Easter Sunday", type: "Evergreen" },
  ];
  return (
    <div className="h-full p-10 flex flex-col items-center justify-center">
       <div className="max-w-2xl w-full">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-orange-500"/> Stock Event Calendar</h2>
          <div className="grid gap-3">
             {events.map((ev, i) => (
                <div key={i} className="bg-[#15151e] border border-gray-700 p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition-colors">
                   <div className="flex items-center gap-4">
                      <div className="text-center bg-gray-800 p-2 rounded-lg w-16">
                         <div className="text-xs text-gray-500 uppercase">{ev.date.split(' ')[0]}</div>
                         <div className="text-lg font-bold text-white">{ev.date.split(' ')[1]}</div>
                      </div>
                      <span className="font-bold text-lg">{ev.title}</span>
                   </div>
                   <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-900/30 text-blue-400 border border-blue-500/30">{ev.type}</span>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
}

function ScraperView() {
   return (
      <div className="h-full flex items-center justify-center text-center p-8">
         <div className="max-w-md bg-[#15151e] p-8 rounded-2xl border border-gray-700">
            <ScanEye size={48} className="mx-auto text-blue-500 mb-4"/>
            <h2 className="text-2xl font-bold mb-2">Trend Analyzer</h2>
            <p className="text-gray-400 text-sm mb-6">Real-time scraping is restricted by browser security. This module uses Gemini AI to predict current stock market gaps.</p>
            <div className="p-3 bg-blue-900/10 text-blue-300 text-xs rounded border border-blue-500/20">
               Active in Main Dashboard > "Market Analysis"
            </div>
         </div>
      </div>
   );
}

// --- UTIL COMPONENT ---
function NavItem({ active, onClick, icon: Icon, label }: any) {
  return (
     <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-3.5 transition-all group ${active ? "bg-blue-600/10 border-r-2 border-blue-500 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
        <Icon size={20} className={`transition-transform group-hover:scale-110 ${active ? "text-blue-500" : "text-gray-500"}`} />
        <span className="text-sm font-medium hidden lg:block tracking-wide">{label}</span>
     </button>
  );
}
