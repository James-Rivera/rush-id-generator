'use client';

import { useState, useRef } from 'react';

interface BatchItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  generatedImage?: string;
}

interface BatchProcessorProps {
  onClose: () => void;
  selectedSize: '2x2' | 'passport';
  selectedStyle: 'white-bg' | 'formal' | 'custom';
  selectedBgColor: 'white' | 'black' | 'gray' | 'gradient' | 'custom';
  customPrompt?: string;
}

export function BatchProcessor({
  onClose,
  selectedSize,
  selectedStyle,
  selectedBgColor,
  customPrompt
}: BatchProcessorProps) {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newItems: BatchItem[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));

    setBatchItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setBatchItems((prev) => {
      const item = prev.find(i => i.id === id);
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleProcessAll = async () => {
    setIsProcessing(true);
    setOverallProgress(0);

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status !== 'pending') continue;

      // Update status to processing
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: 'processing' as const } : it
        )
      );

      try {
        // Call the actual API
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('mode', selectedStyle === 'white-bg' ? 'white' : 'formal');

        const res = await fetch('/api/generate', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error('Processing failed');
        }

        const data = await res.json();
        const generatedImage = data.image || item.preview;

        // Update status to completed
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'completed' as const, generatedImage }
              : it
          )
        );

        setOverallProgress(Math.round(((i + 1) / batchItems.length) * 100));
      } catch (error) {
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'error' as const } : it
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const handleDownloadAll = () => {
    batchItems.forEach((item) => {
      if (item.status === 'completed' && item.generatedImage) {
        const link = document.createElement('a');
        link.href = item.generatedImage;
        link.download = `id-photo-${selectedSize}-${item.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const completedCount = batchItems.filter((item) => item.status === 'completed').length;
  const pendingCount = batchItems.filter((item) => item.status === 'pending').length;
  const processingCount = batchItems.filter((item) => item.status === 'processing').length;

  return (
    <div className="fixed inset-0 bg-[rgba(28,28,28,0.6)] flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-[24px] w-full max-w-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex flex-col gap-2 p-6 md:p-8 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-['Satoshi:Bold',sans-serif] text-[20px] md:text-[24px] text-black">
                Batch Process
              </h2>
              <p className="font-['Satoshi:Regular',sans-serif] text-[12px] text-gray-600 mt-1">
                Upload multiple photos to process with the same settings
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Settings Display */}
          <div className="bg-gray-50 rounded-[12px] p-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <p className="font-['Satoshi:Medium',sans-serif] text-[11px] text-gray-600">Size:</p>
              <p className="font-['Satoshi:Bold',sans-serif] text-[11px] text-black">
                {selectedSize === '2x2' ? '2×2 inches' : 'Passport'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-['Satoshi:Medium',sans-serif] text-[11px] text-gray-600">Style:</p>
              <p className="font-['Satoshi:Bold',sans-serif] text-[11px] text-black">
                {selectedStyle === 'white-bg' ? 'White BG' : selectedStyle === 'formal' ? 'Formal' : 'Custom'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto">
          {/* Upload Area */}
          {!isProcessing && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#efe418] rounded-[16px] p-8 mb-6 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="text-center">
                <div className="mb-3">
                  <div className="bg-white flex items-center p-4 relative rounded-[28px] shadow-sm size-[56px] mx-auto">
                    <div className="relative size-6">
                      <svg className="block size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="font-['Satoshi:Bold',sans-serif] text-[16px] text-black mb-2">
                  Select Multiple Photos
                </p>
                <p className="font-['Satoshi:Regular',sans-serif] text-[13px] text-gray-600">
                  Click to browse or drag and drop
                </p>
              </div>
            </div>
          )}

          {/* Progress during processing */}
          {isProcessing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="font-['Satoshi:Medium',sans-serif] text-[14px] text-black">
                  Processing {processingCount} of {batchItems.length}...
                </p>
                <p className="font-['Satoshi:Bold',sans-serif] text-[14px] text-[#dd6b4a]">
                  {overallProgress}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#efe418] to-[#f2f8ab] h-full transition-all duration-300 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Photo List */}
          {batchItems.length > 0 && (
            <div className="flex flex-col gap-3">
              {batchItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-[12px] border border-gray-200"
                >
                  <div className="flex items-center justify-center bg-gray-300 rounded-full size-10 shrink-0">
                    <p className="font-['Satoshi:Bold',sans-serif] text-[14px] text-gray-700">
                      {index + 1}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-['Satoshi:Medium',sans-serif] text-[13px] text-black truncate">
                      {item.file.name}
                    </p>
                    <p className="font-['Satoshi:Regular',sans-serif] text-[11px] text-gray-500">
                      {(item.file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {item.status === 'pending' && (
                      <div className="bg-gray-300 px-3 py-1 rounded-full">
                        <p className="font-['Satoshi:Medium',sans-serif] text-[10px] text-gray-700">
                          Pending
                        </p>
                      </div>
                    )}
                    {item.status === 'processing' && (
                      <div className="bg-[#efe418] px-3 py-1 rounded-full flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <p className="font-['Satoshi:Medium',sans-serif] text-[10px] text-black">
                          Processing
                        </p>
                      </div>
                    )}
                    {item.status === 'completed' && (
                      <div className="bg-green-500 px-3 py-1 rounded-full">
                        <p className="font-['Satoshi:Medium',sans-serif] text-[10px] text-white">
                          ✓ Done
                        </p>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <div className="bg-red-500 px-3 py-1 rounded-full">
                        <p className="font-['Satoshi:Medium',sans-serif] text-[10px] text-white">
                          Error
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  {item.status === 'pending' && !isProcessing && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {batchItems.length === 0 && (
            <div className="text-center py-8">
              <p className="font-['Satoshi:Regular',sans-serif] text-[13px] text-gray-500">
                No photos selected yet
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {batchItems.length > 0 && (
          <div className="border-t border-gray-200 p-6 md:p-8 flex flex-col gap-4">
            <div className="flex items-center justify-between text-[13px]">
              <p className="font-['Satoshi:Regular',sans-serif] text-gray-600">
                {batchItems.length} photo{batchItems.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-4">
                <p className="font-['Satoshi:Medium',sans-serif] text-green-600">
                  {completedCount} completed
                </p>
                <p className="font-['Satoshi:Medium',sans-serif] text-gray-600">
                  {pendingCount} pending
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {completedCount > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="flex-1 bg-white h-[44px] rounded-[16px] hover:bg-gray-50 transition-colors border-2 border-[rgba(71,71,71,0.2)] hover:border-[#e99b81]"
                >
                  <p className="font-['Satoshi:Bold',sans-serif] text-[14px] text-black">
                    Download All ({completedCount})
                  </p>
                </button>
              )}

              {pendingCount > 0 && (
                <button
                  onClick={handleProcessAll}
                  disabled={isProcessing}
                  className={`flex-1 bg-[#e50000] h-[44px] rounded-[16px] transition-colors ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#cc0000]'
                  }`}
                >
                  <p className="font-['Satoshi:Bold',sans-serif] text-[14px] text-white">
                    {isProcessing ? 'Processing...' : `Process ${pendingCount} Photo${pendingCount !== 1 ? 's' : ''}`}
                  </p>
                </button>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
}
