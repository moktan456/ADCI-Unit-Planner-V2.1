import React, { useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, Plus } from 'lucide-react';
import { clsx } from 'clsx';

interface FileUploadProps {
  onFileProcess: (files: File[]) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileProcess, isProcessing }) => {
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f: File) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
      );
      if (droppedFiles.length > 0) setFiles(prev => [...prev, ...droppedFiles]);
      else alert("Please upload valid Excel or CSV files");
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(
        (f: File) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    if (files.length === 0) return;
    console.log("[FileUpload] Processing files:", files.map(f => f.name));
    onFileProcess(files);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 w-full animate-fade-in">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={clsx(
          "relative group border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ease-in-out cursor-pointer overflow-hidden flex flex-col items-center justify-center min-h-[250px]",
          files.length > 0
            ? "border-primary border-opacity-50 bg-indigo-50/30"
            : "border-slate-300 hover:border-primary hover:bg-slate-50"
        )}
      >
         <input
            type="file"
            accept=".xlsx, .xls, .csv"
            multiple
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={isProcessing}
          />
          <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
            <div className="p-4 rounded-full bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-primary transition-colors">
              {files.length > 0 ? <Plus className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-700">
                {files.length > 0 ? "Add more files" : "Upload Student Reports"}
              </h3>
              <p className="text-sm text-slate-400 mt-1">Drag & drop excel files here, or click to browse</p>
            </div>
          </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between animate-slide-up">
               <div className="flex items-center gap-3 overflow-hidden">
                 <div className="p-2 bg-green-50 text-green-600 rounded">
                    <FileSpreadsheet className="w-5 h-5" />
                 </div>
                 <div className="min-w-0">
                   <div className="font-medium text-slate-800 text-sm truncate">{file.name}</div>
                   <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</div>
                 </div>
               </div>
               <button 
                onClick={() => removeFile(idx)}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                disabled={isProcessing}
               >
                 <span className="sr-only">Remove</span>
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center mt-8">
        <button
          onClick={handleProcess}
          disabled={files.length === 0 || isProcessing}
          className={clsx(
            "flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform",
            files.length === 0 || isProcessing
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-primary text-white hover:bg-indigo-700 hover:scale-105 hover:shadow-primary/30"
          )}
        >
          {isProcessing ? (
             <>Processing Analysis...</>
          ) : (
             <>
               <CheckCircle className="w-6 h-6" />
               Analyze {files.length} Report{files.length !== 1 ? 's' : ''}
             </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FileUpload;