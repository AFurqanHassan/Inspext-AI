import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2 } from 'lucide-react';
import { processImage, type ExtractedData } from './utils/ocr';
import { exportToCSV } from './utils/csv';

const App: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setProcessing(true);
    setTotalFiles(acceptedFiles.length);
    setCompletedCount(0);
    
    const processingPromises = acceptedFiles.map(async (file) => {
      try {
        const result = await processImage(file);
        setCompletedCount(prev => prev + 1);
        return result;
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setCompletedCount(prev => prev + 1);
        return null;
      }
    });

    const results = await Promise.all(processingPromises);
    const finalResults = results.filter((r): r is ExtractedData => r !== null);

    if (finalResults.length > 0) {
      exportToCSV(finalResults);
    }

    setProcessing(false);
    setTotalFiles(0);
    setCompletedCount(0);
  }, []);

  const progressPercentage = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    disabled: processing
  });

  return (
    <div className="h-screen py-4 px-8 max-w-4xl mx-auto flex flex-col justify-center overflow-hidden">
      <header className="mb-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          <h1 className="text-5xl font-black mb-3 tracking-tight gradient-text">
            Inspext AI
          </h1>
          <p className="text-slate-400 text-lg font-light tracking-wide max-w-lg mx-auto leading-relaxed">
            High-speed parallel extraction with <span className="text-sky-400 font-medium">automated</span> CSV delivery.
          </p>
        </motion.div>
      </header>

      <div className="max-w-xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {!processing ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
            >
              <div 
                {...getRootProps()} 
                className={`glass-card p-12 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed transition-all duration-500
                  ${isDragActive ? 'border-sky-500 bg-sky-500/10 scale-[1.02]' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
              >
                <input {...getInputProps()} />
                <motion.div 
                  className="mb-8 p-10 rounded-full bg-sky-500/10 text-sky-400 shadow-[0_0_40px_rgba(14,165,233,0.2)] cursor-pointer"
                  whileHover={{ scale: 1.05, rotate: 2 }}
                >
                  <Upload className="w-24 h-24" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-3 text-white">
                  Drop Images Here
                </h3>
                <p className="text-slate-400 text-base mb-10">
                  or click to select inspection files
                </p>
                <div className="status-badge">
                  <div className="status-dot animate-pulse" />
                  Instant CSV Export Enabled
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-12 overflow-hidden relative"
            >
              <div className="flex justify-between items-end mb-6">
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-white mb-1">Processing Images</h3>
                  <p className="text-slate-400 text-sm flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    Finished {completedCount} of {totalFiles} files
                  </p>
                </div>
                <div className="text-4xl font-black text-sky-400 tabular-nums tracking-tighter">
                  {progressPercentage}<span className="text-xl text-slate-600">%</span>
                </div>
              </div>

              {/* Reddish Sky Blue Progress Bar */}
              <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                <motion.div 
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-rose-400 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                />
              </div>

              <div className="mt-8 text-center text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] opacity-50">
                AI is reading your data
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-8 text-center text-slate-700 text-xs font-medium tracking-[0.1em] uppercase">
        Engineered for <span className="text-slate-500">WASA Sheikhupura</span> • &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
