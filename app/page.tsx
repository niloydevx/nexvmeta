"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, CheckCircle, XCircle, Copy, Sparkles, FileText, ScanEye, Zap, AlertCircle, Download, ShieldCheck, Microscope } from "lucide-react";

// --- Components ---

const Typewriter = ({ text, speed = 5, delay = 0 }: { text: string; speed?: number; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    setDisplayedText(""); 
    let i = 0;
    const startTimeout = setTimeout(() => {
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayedText((prev) => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(timer);
        }
      }, speed);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [text, speed, delay]);

  return <span>{displayedText}</span>;
};

const ScoreBar = ({ label, score }: { label: string; score: number }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs font-medium tracking-wide">
      <span className="text-gray-400 uppercase">{label}</span>
      <span className={`${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'} font-mono`}>
        {score}%
      </span>
    </div>
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        className={`h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
          score >= 85 ? 'bg-linear-to-r from-emerald-500 to-green-400' : 
          score >= 60 ? 'bg-linear-to-r from-yellow-500 to-orange-400' : 
          'bg-linear-to-r from-red-500 to-rose-400'
        }`} 
      />
    </div>
  </div>
);

const ChecklistItem = ({ label, passed }: { label: string; passed: boolean }) => (
  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
    <span className="text-sm text-gray-300">{label}</span>
    {passed ? (
      <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold uppercase">
        <CheckCircle size={14} /> Pass
      </div>
    ) : (
      <div className="flex items-center gap-1 text-red-400 text-xs font-bold uppercase">
        <XCircle size={14} /> Fail
      </div>
    )}
  </div>
);

// --- Main Page Component ---

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("metadata"); 
  const [imageName, setImageName] = useState("image_001.jpg"); 

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null); 
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 1500); 
    } catch (error) {
      alert("Analysis failed. Try again.");
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadCSV = () => {
    if (!result) return;
    const headers = ["Filename", "Title", "Keywords", "Category", "Releases"];
    const title = `"${result.metadata.title.replace(/"/g, '""')}"`; 
    const keywords = `"${result.metadata.keywords.map((k: any) => k.tag).join(", ")}"`;
    const category = result.metadata.category || 7;
    const row = [imageName, title, keywords, category, ""];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), row.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `adobe_stock_${imageName.split('.')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-white font-sans selection:bg-blue-500/30 flex flex-col items-center py-10 px-4">
      
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-10 text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider uppercase mb-2">
          <ShieldCheck size={12} /> Adobe Stock 2026 Compliant
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-linear-to-b from-white to-gray-400">NexV</span>
          <span className="text-blue-500">meta</span>
        </h1>
        <p className="text-gray-500 text-sm md:text-base">Forensic Analysis & 8K Prompt Generator.</p>
      </motion.header>

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Column */}
        <motion.div 
          layout
          className="bg-[#0f0f16] border border-gray-800 rounded-3xl p-2 shadow-2xl relative overflow-hidden"
        >
          <div className="relative rounded-2xl overflow-hidden bg-black/50 min-h-75 flex items-center justify-center border border-gray-800/50 group">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]"></div>

            {!image ? (
              <label className="relative z-10 flex flex-col items-center gap-4 cursor-pointer p-8 w-full h-full transition-transform duration-300 hover:scale-[1.02]">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                  <Upload className="text-white" size={28} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">Upload Design</h3>
                  <p className="text-sm text-gray-400">JPG/PNG (Forensic Scan Mode)</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            ) : (
              <>
                <img src={image} alt="Preview" className="w-full h-auto object-cover opacity-90" />
                
                {loading && (
                  <motion.div 
                    initial={{ top: "0%" }}
                    animate={{ top: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute left-0 w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] z-20"
                  />
                )}
                
                {!loading && (
                  <button 
                    onClick={() => { setImage(null); setResult(null); }} 
                    className="absolute top-3 right-3 bg-black/50 hover:bg-red-500/80 backdrop-blur-md p-2 rounded-full text-white transition-all border border-white/10"
                  >
                    <XCircle size={18} />
                  </button>
                )}
              </>
            )}
          </div>

          {image && !loading && !result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
              <button
                onClick={analyzeImage}
                className="w-full bg-white text-black hover:bg-blue-50 py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <Microscope size={18} className="text-blue-600" /> Start Forensic Scan
              </button>
            </motion.div>
          )}

          {loading && (
             <div className="p-6 text-center">
               <div className="flex items-center justify-center gap-2 text-blue-400 font-mono text-sm animate-pulse">
                 <ScanEye size={16} /> SCANNING PIXEL DATA...
               </div>
             </div>
          )}
        </motion.div>

        {/* Right Column */}
        <div className="min-h-100">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="bg-[#0f0f16] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full"
              >
                <div className="flex bg-[#0a0a12] border-b border-gray-800 p-1">
                  {[
                    { id: "metadata", label: "Metadata", icon: FileText },
                    { id: "review", label: "Forensic", icon: Microscope },
                    { id: "prompts", label: "8K Prompts", icon: ImageIcon },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all relative overflow-hidden ${
                        activeTab === tab.id 
                          ? "bg-[#1a1a24] text-white shadow-lg" 
                          : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 h-0.5 w-8 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-6 flex-1 bg-linear-to-b from-[#0f0f16] to-[#0a0a0f]">
                  
                  {/* TAB 1: Metadata */}
                  {activeTab === "metadata" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                           <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">Adobe Title</h3>
                           <span className="text-xs text-emerald-500 font-mono">{result.metadata.title.length}/70 chars</span>
                        </div>
                        <div className="p-3 bg-black/40 rounded-xl border border-gray-800 text-white font-medium">
                          <Typewriter text={result.metadata.title} speed={20} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">Scored Keywords</h3>
                            <span className="text-xs text-gray-400 font-mono">{result.metadata.keywords.length}/49 tags</span>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {result.metadata.keywords.map((item: any, i: number) => {
                             let badgeStyle = "bg-[#1a1a24] border-gray-800 text-gray-400"; 
                             if (item.score >= 90) badgeStyle = "bg-emerald-900/20 border-emerald-500/40 text-emerald-300";
                             else if (item.score >= 70) badgeStyle = "bg-blue-900/20 border-blue-500/40 text-blue-300";
                             
                             return (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                key={i} 
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-default flex items-center gap-2 ${badgeStyle}`}
                              >
                                {item.tag}
                                <span className="opacity-60 text-[10px] border-l border-white/10 pl-2">{item.score}%</span>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-800">
                          <button 
                            onClick={downloadCSV}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                          >
                            <Download size={18} /> Download CSV for Adobe
                          </button>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: Forensic Review */}
                  {activeTab === "review" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className={`flex items-center justify-between p-6 rounded-2xl border ${
                          result.review.totalScore > 80 ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-red-900/10 border-red-500/20'
                        }`}>
                        <div>
                          <div className="text-4xl font-bold text-white tracking-tighter">
                            {result.review.totalScore}<span className="text-xl text-gray-500 font-normal">/100</span>
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wider mt-1 block ${
                              result.review.totalScore > 80 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {result.review.totalScore > 80 ? 'Ready for Upload' : 'Critical Issues'}
                          </span>
                        </div>
                        <div className="relative w-14 h-14 flex items-center justify-center">
                          {result.review.totalScore > 80 ? <CheckCircle size={32} className="text-emerald-500" /> : <AlertCircle size={32} className="text-red-500" />}
                        </div>
                      </div>

                      {/* Forensic Checklist */}
                      <div className="space-y-3">
                         <h4 className="text-xs text-gray-500 uppercase font-bold tracking-widest">Forensic Checklist</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <ChecklistItem label="Focus / Sharpness" passed={result.review.forensicChecklist.isFocusSharp} />
                            <ChecklistItem label="Lighting Consistency" passed={result.review.forensicChecklist.isLightingNatural} />
                            <ChecklistItem label="No Artifacts/Noise" passed={result.review.forensicChecklist.noArtifactsDetected} />
                            <ChecklistItem label="No Chromatic Aberration" passed={result.review.forensicChecklist.noChromeAberration} />
                            <ChecklistItem label="Anatomy (Hands/Limbs)" passed={result.review.forensicChecklist.handsAndLimbsNormal} />
                            <ChecklistItem label="Text Clean/Absent" passed={result.review.forensicChecklist.textIsReadableOrAbsent} />
                         </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 pt-4">
                        <ScoreBar label="Commercial Viability" score={result.review.commercialScore} />
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <p className="text-gray-300 text-sm leading-relaxed italic border-l-2 border-blue-500 pl-4">
                          "<Typewriter text={result.review.feedback} speed={10} delay={500} />"
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: Prompts */}
                  {activeTab === "prompts" && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-xs text-blue-200 mb-4 flex gap-2">
                           <Sparkles size={16} />
                           <span>Prompts auto-enhanced for 8K, HDR & Photorealism.</span>
                        </div>
                        {Object.entries(result.prompts).map(([key, val]: any, index) => (
                          <div key={key} className="group relative">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{key}</span>
                              <div className="h-px flex-1 bg-gray-800"></div>
                            </div>
                            <div className="bg-black/40 p-4 rounded-xl border border-gray-800 group-hover:border-blue-500/30 transition-colors relative">
                              <p className="text-gray-300 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                                <Typewriter text={val} speed={3} delay={index * 200} />
                              </p>
                              <button 
                                onClick={() => copyToClipboard(val)} 
                                className="absolute top-2 right-2 bg-gray-800 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                     </motion.div>
                  )}

                </div>
              </motion.div>
            ) : (
              // Empty State
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-800 rounded-3xl bg-white/5 opacity-50">
                 <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-600">
                    <Microscope size={32} />
                 </div>
                 <h3 className="text-gray-300 font-medium">Forensic Mode Ready</h3>
                 <p className="text-sm text-gray-500 mt-2 max-w-xs">Upload to start pixel-level forensic analysis and 8K prompt generation.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}