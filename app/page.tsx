"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, CheckCircle, Copy, Sparkles, FileText, ScanEye, Zap, AlertCircle } from "lucide-react";

// --- Components ---

// 1. Typewriter Effect Component
const Typewriter = ({ text, speed = 10, delay = 0 }: { text: string; speed?: number; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    setDisplayedText(""); // Reset on text change
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

// 2. Score Bar Component
const ScoreBar = ({ label, score }: { label: string; score: number }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs font-medium tracking-wide">
      <span className="text-gray-400 uppercase">{label}</span>
      <span className="text-white font-mono">{score}%</span>
    </div>
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        className={`h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
          score > 80 ? 'bg-linear-to-r from-emerald-500 to-green-400' : 
          score > 50 ? 'bg-linear-to-r from-yellow-500 to-orange-400' : 
          'bg-linear-to-r from-red-500 to-rose-400'
        }`} 
      />
    </div>
  </div>
);

// --- Main Page Component ---

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("prompts");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null); // Reset result
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
      
      // Artificial delay for the scanning animation effect
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 2000); 
    } catch (error) {
      alert("Analysis failed. Try again.");
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-white font-sans selection:bg-blue-500/30 flex flex-col items-center py-10 px-4">
      
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-10 text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase mb-2">
          <Zap size={12} fill="currentColor" /> AI Powered V2.0
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-linear-to-b from-white to-gray-400">NexV</span>
          <span className="text-blue-500">meta</span>
        </h1>
        <p className="text-gray-500 text-sm md:text-base">Upload an image to extract prompts, metadata & quality score.</p>
      </motion.header>

      {/* Main Container */}
      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Image & Upload */}
        <motion.div 
          layout
          className="bg-[#0f0f16] border border-gray-800 rounded-3xl p-2 shadow-2xl relative overflow-hidden"
        >
          <div className="relative rounded-2xl overflow-hidden bg-black/50 min-h-75 flex items-center justify-center border border-gray-800/50 group">
            
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]"></div>

            {!image ? (
              <label className="relative z-10 flex flex-col items-center gap-4 cursor-pointer p-8 w-full h-full transition-transform duration-300 hover:scale-[1.02]">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                  <Upload className="text-white" size={28} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">Upload Image</h3>
                  <p className="text-sm text-gray-400">Drag & drop or click to browse</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            ) : (
              <>
                <img src={image} alt="Preview" className="w-full h-auto object-cover opacity-90" />
                
                {/* Scanning Animation Overlay */}
                {loading && (
                  <motion.div 
                    initial={{ top: "0%" }}
                    animate={{ top: "100%" }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute left-0 w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] z-20"
                  />
                )}
                {loading && <div className="absolute inset-0 bg-blue-500/10 z-10" />}

                {/* Remove Button */}
                {!loading && (
                  <button 
                    onClick={() => { setImage(null); setResult(null); }} 
                    className="absolute top-3 right-3 bg-black/50 hover:bg-red-500/80 backdrop-blur-md p-2 rounded-full text-white transition-all border border-white/10"
                  >
                    <AlertCircle size={18} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Action Button */}
          {image && !loading && !result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
              <button
                onClick={analyzeImage}
                className="w-full bg-white text-black hover:bg-blue-50 py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <Sparkles size={18} className="text-blue-600" /> Start Analysis
              </button>
            </motion.div>
          )}

          {loading && (
             <div className="p-6 text-center">
               <div className="flex items-center justify-center gap-2 text-blue-400 font-mono text-sm animate-pulse">
                 <ScanEye size={16} /> SCANNING IMAGE DATA...
               </div>
             </div>
          )}
        </motion.div>

        {/* Right Column: Results Dashboard */}
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
                {/* Tabs */}
                <div className="flex bg-[#0a0a12] border-b border-gray-800 p-1">
                  {[
                    { id: "prompts", label: "Prompts", icon: ImageIcon },
                    { id: "metadata", label: "Metadata", icon: FileText },
                    { id: "review", label: "Quality", icon: ScanEye },
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

                {/* Content Area */}
                <div className="p-6 flex-1 bg-linear-to-b from-[#0f0f16] to-[#0a0a0f]">
                  
                  {/* TAB 1: Prompts */}
                  {activeTab === "prompts" && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                      className="space-y-4"
                    >
                      {Object.entries(result.prompts).map(([key, val]: any, index) => (
                        <div key={key} className="group relative">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{key}</span>
                            <div className="h-px flex-1 bg-gray-800"></div>
                          </div>
                          <div className="bg-black/40 p-4 rounded-xl border border-gray-800 group-hover:border-blue-500/30 transition-colors relative">
                            <p className="text-gray-300 text-sm font-mono leading-relaxed wrap-break-word whitespace-pre-wrap">
                              <Typewriter text={val} speed={5} delay={index * 500} />
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

                  {/* TAB 2: Metadata */}
                  {activeTab === "metadata" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                      <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Generated Title</h3>
                        <div className="text-xl md:text-2xl font-semibold text-white leading-tight">
                          <Typewriter text={result.metadata.title} speed={20} />
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Smart Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.metadata.keywords.map((tag: string, i: number) => (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              key={i} 
                              className="px-3 py-1.5 bg-[#1a1a24] text-gray-300 text-xs font-medium rounded-lg border border-gray-800 hover:border-blue-500/50 hover:text-blue-400 cursor-default transition-colors"
                            >
                              #{tag}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: Review */}
                  {activeTab === "review" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className="flex items-center justify-between bg-linear-to-r from-emerald-900/20 to-transparent p-6 rounded-2xl border border-emerald-500/20">
                        <div>
                          <div className="text-5xl font-bold text-white tracking-tighter">
                            {result.review.totalScore}<span className="text-2xl text-gray-500 font-normal">/100</span>
                          </div>
                          <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider mt-1 block">AI Quality Score</span>
                        </div>
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                          <div className="relative w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/50 text-emerald-400">
                            <CheckCircle size={32} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5">
                        <ScoreBar label="Resolution Clarity" score={result.review.resolutionScore} />
                        <ScoreBar label="Noise & Artifacts" score={result.review.noiseScore} />
                        <ScoreBar label="Composition" score={result.review.compositionScore} />
                        <ScoreBar label="Commercial Value" score={result.review.commercialScore} />
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <p className="text-gray-400 text-sm italic border-l-2 border-blue-500 pl-4 py-1">
                          "<Typewriter text={result.review.feedback} speed={15} delay={1000} />"
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              // Empty State Placeholder
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-800 rounded-3xl bg-white/5 opacity-50">
                 <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-600">
                    <ScanEye size={32} />
                 </div>
                 <h3 className="text-gray-300 font-medium">Awaiting Input</h3>
                 <p className="text-sm text-gray-500 mt-2 max-w-xs">Upload an image on the left to see the AI magic happen here.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}