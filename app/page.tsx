"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Upload, CheckCircle, XCircle, Sparkles, FileText, 
  ScanEye, Download, Settings, Sidebar, LayoutGrid, 
  Image as ImageIcon, Calendar, Scissors, Zap, Layers,
  RefreshCw, ChevronRight, Sliders, Box, ShieldCheck
} from "lucide-react";

// --- Types ---
type SettingsState = {
  titleMin: number; titleMax: number;
  keywordMin: number; keywordMax: number;
  descMin: number; descMax: number;
  platform: string;
};

type AnalysisResult = {
  meta: { title: string; description: string; keywords: { tag: string }[]; category: number };
  technical: { quality_score: number; notes: string };
  prompts: { midjourney: string };
};

type FileItem = {
  id: string; file: File; preview: string; status: "idle" | "processing" | "done" | "error";
  result: AnalysisResult | null;
};

// --- Main Component ---
export default function NexVmetaPro() {
  const [activeView, setActiveView] = useState("dashboard"); // dashboard, converter, calendar, etc.
  
  // Settings State
  const [settings, setSettings] = useState<SettingsState>({
    titleMin: 5, titleMax: 50,
    keywordMin: 10, keywordMax: 49,
    descMin: 20, descMax: 200,
    platform: "Adobe Stock"
  });
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="h-screen bg-[#05050a] text-white font-sans flex overflow-hidden">
      
      {/* 1. LEFT SIDEBAR: NAVIGATION */}
      <aside className="w-20 lg:w-64 bg-[#0a0a12] border-r border-gray-800 flex flex-col z-20 transition-all duration-300">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">N</div>
           <span className="font-bold text-xl tracking-tight hidden lg:block">NexV<span className="text-blue-500">meta</span></span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          <NavItem active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} icon={LayoutGrid} label="Batch Workspace" />
          
          <div className="px-6 py-2 mt-4 text-[10px] uppercase text-gray-500 font-bold hidden lg:block">Tools & Apps</div>
          <NavItem active={activeView === "converter"} onClick={() => setActiveView("converter")} icon={RefreshCw} label="Any Converter" />
          <NavItem active={activeView === "bgremover"} onClick={() => setActiveView("bgremover")} icon={Scissors} label="BG Remover" />
          <NavItem active={activeView === "upscaler"} onClick={() => setActiveView("upscaler")} icon={Zap} label="AI 4K Upscaler" />
          <NavItem active={activeView === "calendar"} onClick={() => setActiveView("calendar")} icon={Calendar} label="Event Calendar" />
          <NavItem active={activeView === "scraper"} onClick={() => setActiveView("scraper")} icon={ScanEye} label="Adobe Scraper" />
          <NavItem active={activeView === "pixel2psd"} onClick={() => setActiveView("pixel2psd")} icon={Layers} label="Pixel to PSD" />
        </div>

        <div className="p-4 border-t border-gray-800">
          <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all">
             <Settings size={20} />
             <span className="hidden lg:block text-sm font-medium">Global Settings</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA (Swappable) */}
      <main className="flex-1 relative bg-[#020205] overflow-hidden">
        
        {/* VIEW: DASHBOARD (Original Tool) */}
        {activeView === "dashboard" && (
           <DashboardView settings={settings} />
        )}

        {/* VIEW: CONVERTER (New Tool) */}
        {activeView === "converter" && (
           <ConverterView />
        )}

        {/* VIEW: PLACEHOLDERS (For the "Coming Soon" apps) */}
        {["bgremover", "upscaler", "calendar", "scraper", "pixel2psd"].includes(activeView) && (
           <PlaceholderView title={activeView} />
        )}

      </main>

      {/* 3. SETTINGS MODAL (Global) */}
      {showSettings && (
        <div className="absolute top-4 right-4 z-50 w-80 bg-[#15151e] border border-gray-700 rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-right-10">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2"><Sliders size={16}/> Analysis Config</h3>
              <button onClick={() => setShowSettings(false)}><XCircle size={18} className="text-gray-500 hover:text-white"/></button>
           </div>
           
           <div className="space-y-5">
              {/* Platform */}
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-2">Target Platform</label>
                <select 
                  value={settings.platform}
                  onChange={(e) => setSettings({...settings, platform: e.target.value})}
                  className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white"
                >
                   <option>Adobe Stock</option>
                   <option>Shutterstock</option>
                   <option>Freepik</option>
                </select>
              </div>

              {/* Title Range */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                   <span className="text-gray-400">Title Length</span>
                   <span className="text-blue-400">{settings.titleMin} - {settings.titleMax} chars</span>
                </div>
                <div className="flex gap-2 items-center">
                   <input type="range" min="3" max="20" value={settings.titleMin} onChange={(e) => setSettings({...settings, titleMin: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                   <input type="range" min="20" max="100" value={settings.titleMax} onChange={(e) => setSettings({...settings, titleMax: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                </div>
              </div>

              {/* Keyword Range */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                   <span className="text-gray-400">Keyword Count</span>
                   <span className="text-blue-400">{settings.keywordMin} - {settings.keywordMax} tags</span>
                </div>
                <div className="flex gap-2 items-center">
                   <input type="range" min="5" max="20" value={settings.keywordMin} onChange={(e) => setSettings({...settings, keywordMin: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                   <input type="range" min="20" max="50" value={settings.keywordMax} onChange={(e) => setSettings({...settings, keywordMax: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                </div>
              </div>

               {/* Desc Range */}
               <div>
                <div className="flex justify-between text-xs mb-1">
                   <span className="text-gray-400">Description</span>
                   <span className="text-blue-400">{settings.descMin} - {settings.descMax} chars</span>
                </div>
                <div className="flex gap-2 items-center">
                   <input type="range" min="10" max="50" value={settings.descMin} onChange={(e) => setSettings({...settings, descMin: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                   <input type="range" min="50" max="300" value={settings.descMax} onChange={(e) => setSettings({...settings, descMax: parseInt(e.target.value)})} className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none"/>
                </div>
              </div>

           </div>
        </div>
      )}

    </div>
  );
}

// --- SUB-VIEWS ---

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
               settings: settings // SEND THE SETTINGS
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

  const downloadCSV = () => {
    // Generate CSV based on settings logic would go here
    alert("Downloading CSV for Adobe Stock...");
  };

  const selectedItem = queue.find(q => q.id === selectedId);

  return (
    <div className="h-full flex">
       {/* Batch List */}
       <div className="w-80 border-r border-gray-800 bg-[#0c0c14] flex flex-col">
          <div className="p-4">
             <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleUpload}/>
             <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-gray-800 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-400 transition-all">
                <Upload size={24}/>
                <span className="text-xs font-bold uppercase">Add Images (Bulk)</span>
             </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2">
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
          <div className="p-4 border-t border-gray-800 flex gap-2">
             <button onClick={runBatch} disabled={processing} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
               {processing ? <RefreshCw className="animate-spin" size={16}/> : <ScanEye size={16}/>} Batch Scan
             </button>
             <button onClick={downloadCSV} className="bg-gray-800 p-3 rounded-lg hover:bg-white text-black transition-colors"><Download size={20}/></button>
          </div>
       </div>

       {/* Detail View */}
       <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {selectedItem?.result ? (
             <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex gap-6">
                   <img src={selectedItem.preview} className="w-48 h-48 object-cover rounded-xl shadow-2xl border border-gray-700"/>
                   <div className="flex-1 space-y-4">
                      <div>
                         <label className="text-xs text-gray-500 font-bold uppercase">Optimized Title ({settings.titleMin}-{settings.titleMax})</label>
                         <div className="text-xl font-bold text-white leading-tight mt-1">{selectedItem.result.meta.title}</div>
                      </div>
                      <div>
                         <label className="text-xs text-gray-500 font-bold uppercase">Description</label>
                         <div className="text-sm text-gray-400 mt-1">{selectedItem.result.meta.description}</div>
                      </div>
                   </div>
                </div>

                <div>
                   <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Keywords ({selectedItem.result.meta.keywords.length})</label>
                   <div className="flex flex-wrap gap-2">
                      {selectedItem.result.meta.keywords.map((k,i) => (
                         <span key={i} className="px-3 py-1 bg-[#15151e] border border-gray-800 rounded text-xs text-gray-300 hover:border-blue-500 transition-colors cursor-copy">{k.tag}</span>
                      ))}
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl">
                      <div className="text-xs text-emerald-400 font-bold uppercase mb-2">Technical Quality</div>
                      <div className="text-3xl font-bold text-white">{selectedItem.result.technical.quality_score}%</div>
                      <p className="text-xs text-gray-500 mt-1">{selectedItem.result.technical.notes}</p>
                   </div>
                   <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl">
                      <div className="text-xs text-purple-400 font-bold uppercase mb-2">Prompt (Midjourney)</div>
                      <p className="text-[10px] font-mono text-gray-300 leading-relaxed">{selectedItem.result.prompts.midjourney}</p>
                   </div>
                </div>
             </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <Box size={48} className="mb-4 opacity-20"/>
                <p>Select an image to view details.</p>
             </div>
          )}
       </div>
    </div>
  );
}

// --- CONVERTER TOOL (New) ---
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
               const dataUrl = canvas.toDataURL(format);
               const link = document.createElement("a");
               link.download = `converted_${file.name.split('.')[0]}.${format.split('/')[1]}`;
               link.href = dataUrl;
               link.click();
            };
            img.src = e.target?.result as string;
         };
         reader.readAsDataURL(file);
      });
      alert(`Converted ${files.length} files!`);
   };

   return (
      <div className="h-full flex flex-col items-center justify-center p-10">
         <div className="max-w-xl w-full text-center space-y-6">
            <h2 className="text-3xl font-bold">Any Converter</h2>
            <div className="p-10 border-2 border-dashed border-gray-700 rounded-2xl bg-white/5">
               <input type="file" multiple onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"/>
               <p className="text-gray-500 text-xs">{files.length} files selected</p>
            </div>
            <div className="flex gap-4 justify-center">
               <select onChange={(e) => setFormat(e.target.value)} className="bg-gray-800 text-white p-3 rounded-lg">
                  <option value="image/png">to PNG</option>
                  <option value="image/jpeg">to JPG</option>
                  <option value="image/webp">to WEBP</option>
               </select>
               <button onClick={convert} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-500">Convert All</button>
            </div>
         </div>
      </div>
   );
}

// --- PLACEHOLDER VIEW ---
function PlaceholderView({ title }: { title: string }) {
   const names: any = {
      "bgremover": "Background Remover",
      "upscaler": "AI 4K Upscaler",
      "calendar": "Stock Event Calendar",
      "scraper": "Adobe Market Scraper",
      "pixel2psd": "Pixel to PSD Converter"
   };
   
   return (
      <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 to-transparent"></div>
         <h1 className="text-5xl font-bold text-gray-800 uppercase mb-4 tracking-tighter">{title}</h1>
         <div className="z-10 bg-[#15151e] p-8 rounded-2xl border border-gray-800 shadow-2xl text-center max-w-md">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
               <Zap size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{names[title]}</h2>
            <p className="text-gray-400 mb-6">This pro tool is currently under development. Check back in v3.0 update.</p>
            <button className="w-full bg-gray-800 hover:bg-white hover:text-black py-3 rounded-lg font-bold transition-all">Notify Me</button>
         </div>
      </div>
   );
}

// --- UTILS ---
function NavItem({ active, onClick, icon: Icon, label }: any) {
   return (
      <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-3 transition-all ${active ? "bg-blue-600/10 border-r-2 border-blue-500 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
         <Icon size={20} />
         <span className="text-sm font-medium hidden lg:block">{label}</span>
      </button>
   );
}
