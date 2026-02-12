"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, CheckCircle, XCircle, Copy, Sparkles, FileText, 
  ScanEye, Download, ShieldCheck, Microscope, Settings, 
  Trash2, Layers, RefreshCw, ChevronRight, Menu
} from "lucide-react";

// --- Types ---
type AnalysisResult = {
  metadata: { title: string; keywords: { tag: string; score: number }[]; category: number };
  prompts: { midjourney: string; stableDiffusion: string };
  review: { 
    totalScore: number; commercialScore: number; feedback: string;
    forensicChecklist: { [key: string]: boolean } 
  };
};

type FileItem = {
  id: string;
  file: File;
  preview: string;
  status: "idle" | "processing" | "done" | "error";
  result: AnalysisResult | null;
};

// --- Components ---

const Typewriter = ({ text, speed = 10 }: { text: string; speed?: number }) => {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) setDisplay(t => t + text.charAt(i++));
      else clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <span>{display}</span>;
};

// --- Main Page ---

export default function Dashboard() {
  // State
  const [queue, setQueue] = useState<FileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [safetyLevel, setSafetyLevel] = useState("standard");
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed
  const selectedItem = queue.find(q => q.id === selectedId);
  const processedCount = queue.filter(q => q.status === "done").length;

  // --- Handlers ---

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
      if (!selectedId && newFiles.length > 0) setSelectedId(newFiles[0].id);
    }
  };

  const processQueue = async () => {
    setIsProcessingBatch(true);
    const pending = queue.filter(q => q.status === "idle");
    
    for (const item of pending) {
      // Update status to processing
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "processing" } : q));
      
      try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(item.file);
        });
        const base64 = await base64Promise;

        const res = await fetch("/api/analyze", {
          method: "POST",
          body: JSON.stringify({ image: base64, customInstructions, safetyLevel }),
        });
        
        const data = await res.json();
        if (data.error) throw new Error("API Error");

        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "done", result: data } : q));
      } catch (err) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "error" } : q));
      }
    }
    setIsProcessingBatch(false);
  };

  const exportAllCSV = () => {
    const completed = queue.filter(q => q.status === "done" && q.result);
    if (completed.length === 0) return alert("No completed files to export.");

    const headers = ["Filename", "Title", "Keywords", "Commercial Score", "Category"];
    const rows = completed.map(item => {
      const r = item.result!;
      return [
        `"${item.file.name}"`,
        `"${r.metadata.title.replace(/"/g, '""')}"`,
        `"${r.metadata.keywords.map(k => k.tag).join(", ")}"`,
        r.review.commercialScore,
        r.metadata.category
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `nexvmeta_batch_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQueue(prev => prev.filter(q => q.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="h-screen bg-[#05050a] text-white font-sans flex overflow-hidden">
      
      {/* --- SIDEBAR: Batch Manager --- */}
      <aside className="w-80 bg-[#0a0a12] border-r border-gray-800 flex flex-col z-20">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
           <div>
             <h1 className="font-bold text-xl tracking-tight">NexV<span className="text-blue-500">meta</span></h1>
             <p className="text-xs text-gray-500">Batch Workspace</p>
           </div>
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
             <Settings size={18} />
           </button>
        </div>

        {/* Upload Area */}
        <div className="p-4">
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
            className="w-full py-8 border-2 border-dashed border-gray-800 hover:border-blue-500 hover:bg-blue-500/5 rounded-xl transition-all flex flex-col items-center justify-center gap-2 group"
          >
            <div className="p-3 bg-gray-900 rounded-full group-hover:scale-110 transition-transform">
              <Upload size={20} className="text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-400">Add Images (Bulk)</span>
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
          {queue.length === 0 && (
             <div className="text-center text-gray-600 py-10 text-xs">No files in queue</div>
          )}
          {queue.map(item => (
            <div 
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all group relative ${
                selectedId === item.id ? "bg-blue-600/10 border border-blue-500/30" : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <img src={item.preview} className="w-10 h-10 rounded object-cover bg-gray-800" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-200">{item.file.name}</p>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide">
                  {item.status === "idle" && <span className="text-gray-500">Queued</span>}
                  {item.status === "processing" && <span className="text-blue-400 animate-pulse">Scanning...</span>}
                  {item.status === "done" && <span className="text-emerald-400">Complete</span>}
                  {item.status === "error" && <span className="text-red-400">Failed</span>}
                </div>
              </div>
              <button onClick={(e) => removeFile(item.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t border-gray-800 bg-[#0a0a12]">
          <div className="flex gap-2 mb-3 text-xs text-gray-500">
             <div className="flex-1 bg-gray-800 h-1 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${queue.length ? (processedCount / queue.length) * 100 : 0}%` }}></div>
             </div>
             <span>{processedCount}/{queue.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={processQueue}
              disabled={isProcessingBatch || queue.every(q => q.status === "done")}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
            >
              {isProcessingBatch ? <RefreshCw size={16} className="animate-spin" /> : <ScanEye size={16} />}
              {isProcessingBatch ? "Processing..." : "Run Batch"}
            </button>
            <button 
              onClick={exportAllCSV}
              disabled={processedCount === 0}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT: Detail View --- */}
      <main className="flex-1 bg-[#05050a] flex flex-col relative overflow-hidden">
        {selectedItem ? (
          <div className="h-full flex flex-col md:flex-row">
            
            {/* Image Preview (Left/Top) */}
            <div className="flex-1 bg-[#020205] flex items-center justify-center p-8 relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50"></div>
               <img 
                 src={selectedItem.preview} 
                 className="max-h-full max-w-full object-contain shadow-2xl rounded-lg border border-gray-800 z-10" 
               />
               <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                 <div className="bg-black/60 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-mono border border-white/10">
                   {(selectedItem.file.size / 1024 / 1024).toFixed(2)} MB
                 </div>
               </div>
            </div>

            {/* Analysis Results (Right/Bottom) */}
            <div className="w-full md:w-125 bg-[#0f0f16] border-l border-gray-800 flex flex-col h-full overflow-hidden">
              {selectedItem.status === "done" && selectedItem.result ? (
                <ResultsPanel result={selectedItem.result} />
              ) : (
                <EmptyState status={selectedItem.status} />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Layers size={48} className="mb-4 opacity-20" />
            <p>Select an image from the queue to view details.</p>
          </div>
        )}
      </main>

      {/* --- MODAL: Settings --- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#15151e] border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} className="text-blue-500"/> Power Tools</h2>
                <button onClick={() => setIsSettingsOpen(false)}><XCircle className="text-gray-400 hover:text-white" /></button>
              </div>
              <div className="p-6 space-y-6">
                
                {/* Custom Instructions */}
                <div>
                   <label className="text-sm font-semibold text-gray-300 mb-2 block">Custom AI Instructions</label>
                   <textarea 
                     value={customInstructions}
                     onChange={(e) => setCustomInstructions(e.target.value)}
                     placeholder="E.g., 'Focus on cinematic lighting', 'Always add the keyword: minimal'"
                     className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none h-24 resize-none"
                   />
                </div>

                {/* Safety Toggle */}
                <div>
                   <label className="text-sm font-semibold text-gray-300 mb-2 block">Safety Filter Level</label>
                   <div className="grid grid-cols-2 gap-2">
                     <button 
                       onClick={() => setSafetyLevel("standard")}
                       className={`p-3 rounded-lg text-sm border ${safetyLevel === "standard" ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-black/30 border-gray-700 text-gray-500"}`}
                     >
                       Standard
                     </button>
                     <button 
                       onClick={() => setSafetyLevel("strict")}
                       className={`p-3 rounded-lg text-sm border ${safetyLevel === "strict" ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" : "bg-black/30 border-gray-700 text-gray-500"}`}
                     >
                       Strict Mode
                     </button>
                   </div>
                </div>

              </div>
              <div className="p-4 bg-[#0a0a10] text-center">
                 <p className="text-xs text-gray-500">Changes apply to next batch run.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Components ---

function ResultsPanel({ result }: { result: AnalysisResult }) {
  const [tab, setTab] = useState("meta");

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-[#0a0a12]">
        {[{id:"meta", label:"Metadata", icon:FileText}, {id:"forensic", label:"Forensic", icon:Microscope}, {id:"prompts", label:"Prompts", icon:Sparkles}].map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${tab === t.id ? "text-blue-400 bg-[#15151e] border-b-2 border-blue-500" : "text-gray-500 hover:text-white"}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {tab === "meta" && (
          <div className="space-y-6">
             <div className="space-y-2">
               <h3 className="text-gray-500 text-xs font-bold uppercase">Title</h3>
               <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm leading-relaxed">{result.metadata.title}</div>
             </div>
             <div className="space-y-2">
               <div className="flex justify-between">
                 <h3 className="text-gray-500 text-xs font-bold uppercase">Keywords</h3>
                 <span className="text-xs text-gray-500">{result.metadata.keywords.length} tags</span>
               </div>
               <div className="flex flex-wrap gap-2">
                 {result.metadata.keywords.map((k, i) => (
                   <span key={i} className={`px-2 py-1 text-xs rounded border ${k.score > 80 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                     {k.tag}
                   </span>
                 ))}
               </div>
             </div>
          </div>
        )}

        {tab === "forensic" && (
          <div className="space-y-6">
             <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
               <div className={`text-3xl font-bold ${result.review.totalScore >= 80 ? "text-emerald-400" : "text-yellow-400"}`}>
                 {result.review.totalScore}
               </div>
               <div className="text-sm text-gray-400 leading-tight">
                 Overall Forensic<br/>Quality Score
               </div>
             </div>
             <div className="space-y-2">
                {Object.entries(result.review.forensicChecklist).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {val ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
                  </div>
                ))}
             </div>
             <p className="text-sm text-gray-400 italic border-l-2 border-blue-500 pl-3">"{result.review.feedback}"</p>
          </div>
        )}

        {tab === "prompts" && (
          <div className="space-y-4">
            <div className="space-y-2">
               <h3 className="text-xs text-purple-400 font-bold uppercase">Midjourney v6</h3>
               <div className="p-3 bg-purple-900/10 border border-purple-500/20 rounded-lg text-xs font-mono text-purple-200">
                 {result.prompts.midjourney}
               </div>
            </div>
            <div className="space-y-2">
               <h3 className="text-xs text-orange-400 font-bold uppercase">Stable Diffusion XL</h3>
               <div className="p-3 bg-orange-900/10 border border-orange-500/20 rounded-lg text-xs font-mono text-orange-200">
                 {result.prompts.stableDiffusion}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ status }: { status: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
       {status === "idle" && (
         <>
           <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
             <ScanEye size={24} />
           </div>
           <div>
             <h3 className="text-white font-medium">Ready to Scan</h3>
             <p className="text-gray-500 text-sm mt-1">Click "Run Batch" to start analysis.</p>
           </div>
         </>
       )}
       {status === "processing" && (
         <>
           <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
              <Microscope size={24} className="text-blue-400 relative z-10" />
           </div>
           <h3 className="text-blue-400 font-medium animate-pulse">Analyzing Pixels...</h3>
         </>
       )}
       {status === "error" && (
         <>
           <XCircle size={48} className="text-red-500 mb-2" />
           <h3 className="text-red-400 font-medium">Analysis Failed</h3>
           <p className="text-gray-600 text-sm">Please try removing and re-adding this file.</p>
         </>
       )}
    </div>
  );
}
