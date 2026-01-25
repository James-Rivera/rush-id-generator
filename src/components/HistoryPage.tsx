'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

type IDSize = '2x2' | 'passport';
type PhotoStyle = 'white-bg' | 'formal' | 'custom';
type BackgroundColor = 'white' | 'black' | 'gray' | 'gradient' | 'custom';

interface HistoryItem {
  id: string;
  originalImage: string;
  generatedImage: string;
  size: IDSize;
  style: PhotoStyle;
  bgColor: BackgroundColor;
  customPrompt?: string;
  timestamp: number;
}

interface HistoryPageProps {
  onBack: () => void;
  onViewItem: (item: HistoryItem) => void;
}

export function HistoryPage({ onBack, onViewItem }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | IDSize>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('idPhotoHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Filter and sort history
  const filteredHistory = history
    .filter(item => filter === 'all' || item.size === filter)
    .sort((a, b) => sortBy === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

  const handleDelete = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('idPhotoHistory', JSON.stringify(updatedHistory));
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen w-full">
      {/* Header */}
      <div className="bg-[#f4ffe4] w-full border-b border-[#e5e7eb]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              <span className="text-[20px]">←</span>
              <p className="font-['Satoshi:Medium',sans-serif] text-[14px] text-black">Back to App</p>
            </button>
            
            <div className="flex gap-3 items-center">
              <div className="h-8 relative w-8">
                <Image 
                  alt="Logo" 
                  className="absolute inset-0 object-cover size-full" 
                  src="/assets/deed4258dc9a7cf045722ac0d048a69b54d393e1.png"
                  width={32}
                  height={32}
                />
              </div>
              <div className="font-['Satoshi:Bold',sans-serif] text-black">
                <p className="text-[20px] md:text-[24px] leading-[24px] mb-0">History</p>
                <p className="text-[10px] md:text-[12px] leading-[12px] font-['Satoshi:Light',sans-serif]">{filteredHistory.length} Generated Photos</p>
              </div>
            </div>
            
            <div className="w-[80px]"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        {/* Filters */}
        <div className="bg-white rounded-[24px] p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Size Filter */}
            <div className="flex gap-2 items-center flex-wrap">
              <p className="font-['Satoshi:Medium',sans-serif] text-[12px] text-gray-600 mr-2">Filter:</p>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-[12px] transition-all font-['Satoshi:Medium',sans-serif] text-[12px] ${
                  filter === 'all' 
                    ? 'bg-[#dd6b4a] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('2x2')}
                className={`px-4 py-2 rounded-[12px] transition-all font-['Satoshi:Medium',sans-serif] text-[12px] ${
                  filter === '2x2' 
                    ? 'bg-[#dd6b4a] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                2×2
              </button>
              <button
                onClick={() => setFilter('passport')}
                className={`px-4 py-2 rounded-[12px] transition-all font-['Satoshi:Medium',sans-serif] text-[12px] ${
                  filter === 'passport' 
                    ? 'bg-[#dd6b4a] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Passport
              </button>
            </div>

            {/* Sort */}
            <div className="flex gap-2 items-center">
              <p className="font-['Satoshi:Medium',sans-serif] text-[12px] text-gray-600 mr-2">Sort:</p>
              <button
                onClick={() => setSortBy('newest')}
                className={`px-4 py-2 rounded-[12px] transition-all font-['Satoshi:Medium',sans-serif] text-[12px] ${
                  sortBy === 'newest' 
                    ? 'bg-[#dd6b4a] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-4 py-2 rounded-[12px] transition-all font-['Satoshi:Medium',sans-serif] text-[12px] ${
                  sortBy === 'oldest' 
                    ? 'bg-[#dd6b4a] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Oldest
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredHistory.length === 0 ? (
          <div className="bg-white rounded-[24px] p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-['Satoshi:Bold',sans-serif] text-[18px] text-black mb-2">No History Yet</p>
              <p className="font-['Satoshi:Regular',sans-serif] text-[14px] text-gray-600">
                Start generating ID photos to see them here
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredHistory.map((item) => (
              <div key={item.id} className="bg-white rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Image Preview */}
                <div className="relative aspect-square bg-gray-100">
                  <Image
                    src={item.generatedImage}
                    alt="Generated ID"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-[#efe418] px-3 py-1 rounded-[12px]">
                    <p className="font-['Satoshi:Bold',sans-serif] text-[10px] text-black">
                      {item.size === '2x2' ? '2×2' : 'Passport'}
                    </p>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-['Satoshi:Medium',sans-serif] text-[12px] text-gray-600">
                        {formatDate(item.timestamp)}
                      </p>
                      <p className="font-['Satoshi:Regular',sans-serif] text-[10px] text-gray-400">
                        {formatTime(item.timestamp)}
                      </p>
                    </div>
                    <div className="bg-gray-100 px-2 py-1 rounded-[8px]">
                      <p className="font-['Satoshi:Medium',sans-serif] text-[10px] text-gray-600">
                        {item.style === 'white-bg' ? 'White BG' : item.style === 'formal' ? 'Formal' : 'Custom'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onViewItem(item)}
                      className="flex-1 bg-[#e50000] h-9 rounded-[12px] hover:bg-[#cc0000] transition-colors"
                    >
                      <p className="font-['Satoshi:Bold',sans-serif] text-[12px] text-white">View</p>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-gray-100 h-9 px-3 rounded-[12px] hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
