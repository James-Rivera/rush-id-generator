'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import svgPaths from "../components/imports/svg-f0m95wope4";
import svgPathsUser from "../components/imports/svg-k20bu2cd5y";
import { HistoryPage } from "../components/HistoryPage";
import { BatchProcessor } from "../components/BatchProcessor";

type IDSize = '2x2' | 'passport';
type PhotoStyle = 'white-bg' | 'formal' | 'custom';
type AppState = 'upload' | 'processing' | 'completed' | 'batch';
type BackgroundColor = 'white' | 'black' | 'gray' | 'gradient' | 'custom';

// Quick Template Interface
interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  size: IDSize;
  style: PhotoStyle;
  bgColor: BackgroundColor;
}

// History Item Interface
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

// Login Modal Component
function LoginModal({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLogin();
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100]">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#faf6b6] via-[#fff8dc] to-[#f5f0c4] animate-gradient-shift"></div>
      <div className="absolute inset-0 bg-[rgba(28,28,28,0.3)]"></div>
      
      <div className="bg-[#faf6b6] w-full max-w-[400px] mx-4 md:w-[400px] rounded-[24px] shadow-2xl relative z-10 backdrop-blur-sm bg-opacity-95">
        <div className="flex flex-col size-full">
          <div className="flex flex-col gap-[24px] px-8 py-10 md:px-[40px] md:py-[48px] relative w-full">
            {/* Logo and Title */}
            <div className="flex gap-3 items-center justify-center">
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
                <p className="text-[20px] leading-[24px] mb-0">Forme</p>
                <p className="text-[10px] leading-[12px] font-['Satoshi:Light',sans-serif]">BY CJNET</p>
              </div>
            </div>

            <div className="text-center">
              <p className="font-['Satoshi:Bold',sans-serif] text-[18px] text-black mb-2">Staff Login</p>
              <p className="font-['Satoshi:Regular',sans-serif] text-[12px] text-black">Enter your credentials to continue</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-['Satoshi:Medium',sans-serif] text-[12px] text-black">Username</label>
                <div className="bg-white h-[44px] relative rounded-[12px]">
                  <div className="absolute border border-[rgba(71,71,71,0.37)] border-solid inset-0 pointer-events-none rounded-[12px]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full h-full px-4 font-['Satoshi:Regular',sans-serif] text-[14px] text-black rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#e99b81]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-['Satoshi:Medium',sans-serif] text-[12px] text-black">Password</label>
                <div className="bg-white h-[44px] relative rounded-[12px]">
                  <div className="absolute border border-[rgba(71,71,71,0.37)] border-solid inset-0 pointer-events-none rounded-[12px]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-full px-4 font-['Satoshi:Regular',sans-serif] text-[14px] text-black rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#e99b81]"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-[12px] text-[12px] font-['Satoshi:Regular',sans-serif]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`bg-[#e50000] h-[44px] relative rounded-[24px] w-full hover:bg-[#cc0000] transition-colors mt-2 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-center size-full">
                  <p className="font-['Satoshi:Bold',sans-serif] text-[14px] text-white">
                    {isLoading ? 'Logging in...' : 'Login'}
                  </p>
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error Modal Component
function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-[rgba(28,28,28,0.39)] flex items-center justify-center z-50 px-4">
      <div className="bg-[#faf6b6] relative rounded-[24px] w-full max-w-[368px]">
        <div className="flex flex-col items-center size-full">
          <div className="flex flex-col gap-[26px] items-center px-8 py-10 relative w-full">
            <div className="flex gap-[10px] items-center">
              <div className="h-8 relative w-8">
                <Image 
                  alt="" 
                  className="absolute inset-0 object-cover size-full" 
                  src="/assets/deed4258dc9a7cf045722ac0d048a69b54d393e1.png"
                  width={32}
                  height={32}
                />
              </div>
              <p className="font-['Satoshi:Bold',sans-serif] text-[16px] text-black">CJ NET</p>
            </div>
            <div className="flex flex-col gap-2 text-black w-full">
              <p className="font-['Satoshi:Bold',sans-serif] text-[16px] w-full text-center">Error</p>
              <p className="font-['Satoshi:Regular',sans-serif] text-[11px] text-center w-full">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="bg-[#dd3119] h-[30px] relative rounded-[24px] w-full hover:bg-[#c02814] transition-colors"
            >
              <div className="flex items-center justify-center size-full">
                <p className="font-['Satoshi:Bold',sans-serif] text-[10px] text-white">OK</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upload Failed Modal
function UploadFailedModal({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fixed inset-0 bg-[rgba(28,28,28,0.39)] flex items-center justify-center z-50 px-4">
      <div className="bg-[#faf6b6] flex flex-col items-start px-8 md:px-[101px] py-12 md:py-[47px] relative rounded-[24px] w-full max-w-[367px]">
        <div className="flex flex-col gap-3 items-center w-full">
          <div className="flex flex-col gap-[10px] items-center w-full">
            <div className="relative size-[31px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 31 31">
                <g clipPath="url(#clip0_28_527)">
                  <path clipRule="evenodd" d="M15.5 0.96875C7.4919 0.96875 0.96875 7.4919 0.96875 15.5C0.96875 23.5081 7.4919 30.0312 15.5 30.0312C23.5081 30.0312 30.0312 23.5081 30.0312 15.5C30.0312 7.4919 23.5081 0.96875 15.5 0.96875ZM16.7812 20.5938C16.7812 21.3013 16.2075 21.875 15.5 21.875C14.7925 21.875 14.2188 21.3013 14.2188 20.5938V15.5C14.2188 14.7925 14.7925 14.2188 15.5 14.2188C16.2075 14.2188 16.7812 14.7925 16.7812 15.5V20.5938ZM15.5 11.7188C14.7925 11.7188 14.2188 11.145 14.2188 10.4375C14.2188 9.73 14.7925 9.15625 15.5 9.15625C16.2075 9.15625 16.7812 9.73 16.7812 10.4375C16.7812 11.145 16.2075 11.7188 15.5 11.7188Z" fill="black" fillRule="evenodd" />
                </g>
                <defs>
                  <clipPath id="clip0_28_527">
                    <rect fill="white" height="31" width="31" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div className="flex flex-col gap-2 text-black w-full">
              <p className="font-['Satoshi:Bold',sans-serif] text-[16px] w-full text-center">Image Upload Failed</p>
              <p className="font-['Satoshi:Regular',sans-serif] text-[11px] text-center w-full">Please Reupload it again</p>
            </div>
          </div>
          <button
            onClick={onRetry}
            className="bg-white h-8 relative rounded-[14px] w-full hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-center size-full">
              <p className="font-['Satoshi:Regular',sans-serif] text-[11px] text-black">Upload Photo</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Loading Overlay with progress bar
function LoadingOverlay({ selectedSize }: { selectedSize: IDSize }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + 5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[rgba(28,28,28,0.6)] flex flex-col items-center justify-center z-40 px-4">
      <div className="bg-white rounded-[24px] p-8 flex flex-col items-center gap-6 max-w-md w-full">
        <div className="w-16 h-16 border-4 border-[#efe418] border-t-transparent rounded-full animate-spin" />
        <div className="text-center w-full">
          <p className="font-['Satoshi:Bold',sans-serif] text-[18px] text-black mb-2">Generating Your ID Photo...</p>
          <p className="font-['Satoshi:Regular',sans-serif] text-[14px] text-gray-600 mb-4">
            {selectedSize === '2x2' ? '2×2 inches' : 'Passport Size'}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#efe418] to-[#f2f8ab] h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-['Satoshi:Medium',sans-serif] text-[12px] text-gray-500 mt-2">{progress}%</p>
        </div>
      </div>
    </div>
  );
}

// Error Toast
function ErrorToast({ message }: { message: string }) {
  return (
    <div className="fixed bg-[#dd3119] flex h-[40px] items-center justify-center right-4 px-4 py-3 top-20 md:top-24 z-50 rounded-lg shadow-lg animate-fade-in min-w-[200px]">
      <p className="font-['Satoshi:Regular',sans-serif] text-[12px] text-white">{message}</p>
    </div>
  );
}

// Settings Page Component
function SettingsPage({ onBack }: { onBack: () => void }) {
  const [aiCredits] = useState(150);
  const [usedToday] = useState(25);

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
                <p className="text-[20px] md:text-[24px] leading-[24px] mb-0">Settings</p>
                <p className="text-[10px] md:text-[12px] leading-[12px] font-['Satoshi:Light',sans-serif]">Staff Dashboard</p>
              </div>
            </div>
            
            <div className="w-[80px]"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="max-w-[800px] mx-auto">
          <div className="flex flex-col gap-6">
            {/* AI Credits Card */}
            <div className="bg-gradient-to-br from-[#faf6b6] to-[#f2f8ab] rounded-[24px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-['Satoshi:Bold',sans-serif] text-[20px] text-black mb-2">AI Credits</p>
                  <p className="font-['Satoshi:Regular',sans-serif] text-[12px] text-gray-700">Available for ID generation</p>
                </div>
                <div className="bg-white rounded-full px-6 py-3 shadow-sm">
                  <p className="font-['Satoshi:Bold',sans-serif] text-[28px] text-[#dd6b4a]">{aiCredits}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-white rounded-full overflow-hidden mb-3">
                <div 
                  className="absolute top-0 left-0 h-full bg-[#dd6b4a] transition-all"
                  style={{ width: `${((aiCredits - usedToday) / aiCredits) * 100}%` }}
                />
              </div>

              <div className="flex justify-between">
                <p className="font-['Satoshi:Regular',sans-serif] text-[12px] text-gray-700">Used today: {usedToday}</p>
                <p className="font-['Satoshi:Bold',sans-serif] text-[12px] text-black">Remaining: {aiCredits - usedToday}</p>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm">
              <p className="font-['Satoshi:Bold',sans-serif] text-[18px] text-black mb-6">Today's Usage</p>
              
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <p className="font-['Satoshi:Regular',sans-serif] text-[14px] text-gray-700">2×2 ID Photos</p>
                  <p className="font-['Satoshi:Bold',sans-serif] text-[16px] text-black">15</p>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <p className="font-['Satoshi:Regular',sans-serif] text-[14px] text-gray-700">Passport Photos</p>
                  <p className="font-['Satoshi:Bold',sans-serif] text-[16px] text-black">8</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="font-['Satoshi:Regular',sans-serif] text-[14px] text-gray-700">Custom Generations</p>
                  <p className="font-['Satoshi:Bold',sans-serif] text-[16px] text-black">2</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm">
              <p className="font-['Satoshi:Bold',sans-serif] text-[18px] text-black mb-6">Quick Actions</p>
              
              <div className="flex flex-col gap-4">
                <button className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-[16px] px-6 py-4 hover:border-[#e99b81] hover:bg-white transition-all">
                  <p className="font-['Satoshi:Medium',sans-serif] text-[14px] text-black">Purchase More Credits</p>
                  <span className="text-[20px] text-gray-400">→</span>
                </button>

                <button className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-[16px] px-6 py-4 hover:border-[#e99b81] hover:bg-white transition-all">
                  <p className="font-['Satoshi:Medium',sans-serif] text-[14px] text-black">Usage History</p>
                  <span className="text-[20px] text-gray-400">→</span>
                </button>

                <button className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-[16px] px-6 py-4 hover:border-[#e99b81] hover:bg-white transition-all">
                  <p className="font-['Satoshi:Medium',sans-serif] text-[14px] text-black">Account Preferences</p>
                  <span className="text-[20px] text-gray-400">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // State management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<IDSize>('2x2');
  const [selectedStyle, setSelectedStyle] = useState<PhotoStyle>('white-bg');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedBgColor, setSelectedBgColor] = useState<BackgroundColor>('white');
  const [appState, setAppState] = useState<AppState>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadError, setShowUploadError] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBatchProcessor, setShowBatchProcessor] = useState(false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showUserDropdown) {
        const target = e.target as HTMLElement;
        if (!target.closest('.user-dropdown-container')) {
          setShowUserDropdown(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserDropdown]);

  // File upload handlers
  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG or PNG)');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setGeneratedImage(null);
      setAppState('upload');
    };
    reader.onerror = () => {
      setShowUploadError(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSelectPhotoClick = () => {
    fileInputRef.current?.click();
  };

  // Quick Templates
  const quickTemplates: QuickTemplate[] = [
    {
      id: 'govt-id',
      name: 'Government ID',
      description: '2×2, White BG',
      icon: '🏛️',
      size: '2x2',
      style: 'white-bg',
      bgColor: 'white',
    },
    {
      id: 'passport',
      name: 'Passport',
      description: 'Passport, White BG',
      icon: '✈️',
      size: 'passport',
      style: 'white-bg',
      bgColor: 'white',
    },
    {
      id: 'school-id',
      name: 'School ID',
      description: '2×2, Formal',
      icon: '🎓',
      size: '2x2',
      style: 'formal',
      bgColor: 'white',
    },
    {
      id: 'work-id',
      name: 'Work Permit',
      description: 'Passport, Formal',
      icon: '💼',
      size: 'passport',
      style: 'formal',
      bgColor: 'white',
    },
  ];

  const handleTemplateSelect = (template: QuickTemplate) => {
    setSelectedSize(template.size);
    setSelectedStyle(template.style);
    setSelectedBgColor(template.bgColor);
  };

  // Generate ID photo - Connected to API
  const handleGenerate = async () => {
    if (!uploadedImage || !uploadedFile) {
      setError('Please upload a photo first');
      return;
    }

    if (selectedStyle === 'custom' && !customPrompt.trim()) {
      setError('Please enter a custom prompt');
      return;
    }

    setIsLoading(true);
    setAppState('processing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('mode', selectedStyle === 'white-bg' ? 'white' : 'formal');

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate ID photo');
      }

      const data = await res.json();
      setGeneratedImage(data.image);
      setAppState('completed');

      // Save to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        originalImage: uploadedImage,
        generatedImage: data.image,
        size: selectedSize,
        style: selectedStyle,
        bgColor: selectedBgColor,
        customPrompt: selectedStyle === 'custom' ? customPrompt : undefined,
        timestamp: Date.now(),
      };

      const existingHistory = localStorage.getItem('idPhotoHistory');
      const history: HistoryItem[] = existingHistory ? JSON.parse(existingHistory) : [];
      history.unshift(newHistoryItem);
      localStorage.setItem('idPhotoHistory', JSON.stringify(history));
    } catch (err: any) {
      setErrorToast(err.message || 'Get 404 Error, Please try again');
      setTimeout(() => setErrorToast(null), 3000);
      setAppState('upload');
    } finally {
      setIsLoading(false);
    }
  };

  // Download functionality
  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `id-photo-${selectedSize}-${selectedStyle}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Start over
  const handleStartOver = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setGeneratedImage(null);
    setAppState('upload');
    setSelectedSize('2x2');
    setSelectedStyle('white-bg');
    setCustomPrompt('');
    setSelectedBgColor('white');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // View history item
  const handleViewHistoryItem = (item: HistoryItem) => {
    setUploadedImage(item.originalImage);
    setGeneratedImage(item.generatedImage);
    setSelectedSize(item.size);
    setSelectedStyle(item.style);
    setSelectedBgColor(item.bgColor);
    setCustomPrompt(item.customPrompt || '');
    setAppState('completed');
    setShowHistory(false);
  };

  // Show login modal if not logged in
  if (!isLoggedIn) {
    return <LoginModal onLogin={() => setIsLoggedIn(true)} />;
  }

  // Show settings page
  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  // Show history page
  if (showHistory) {
    return <HistoryPage onBack={() => setShowHistory(false)} onViewItem={handleViewHistoryItem} />;
  }

  return (
    <div className="bg-[#f9f9f9] min-h-screen w-full overflow-x-hidden">
      {/* Header - Responsive with 8px base spacing */}
      <div className="bg-[#f4ffe4] w-full border-b border-[#e5e7eb]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 md:gap-8">
            {/* Logo */}
            <div className="flex gap-4 md:gap-8 items-center shrink-0">
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
                <p className="text-[20px] md:text-[24px] leading-[24px] mb-0">Forme</p>
                <p className="text-[10px] md:text-[12px] leading-[12px] font-['Satoshi:Light',sans-serif]">BY CJNET</p>
              </div>
            </div>

            {/* Nav Links - Hidden on mobile */}
            <div className="hidden lg:flex font-['Satoshi:Regular',sans-serif] gap-8 items-center text-[14px] md:text-[16px] text-black">
              <p className="cursor-pointer hover:opacity-70 transition-opacity">Home</p>
              <p className="cursor-pointer hover:opacity-70 transition-opacity">Features</p>
              <p className="cursor-pointer hover:opacity-70 transition-opacity">Pricing</p>
            </div>

            {/* User Button */}
            <div className="relative user-dropdown-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserDropdown(!showUserDropdown);
                }}
                className="bg-[#faf6b6] flex items-center h-9 px-4 py-2 rounded-[16px] hover:bg-[#f5f19a] transition-colors"
              >
                <div className="flex gap-3 items-center">
                  <div className="relative size-5 md:size-6">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                      <path d={svgPathsUser.pfc0e500} fill="black" />
                    </svg>
                  </div>
                  <p className="font-['Satoshi:Medium',sans-serif] text-[10px] md:text-[12px] text-black hidden sm:block">Staff User</p>
                </div>
              </button>

              {/* Dropdown */}
              {showUserDropdown && (
                <div className="absolute bg-[#faf6b6] rounded-[16px] top-full mt-2 right-0 w-[140px] shadow-lg z-50 overflow-hidden">
                  <div className="flex gap-3 items-center px-5 py-2 border-b border-[rgba(0,0,0,0.1)]">
                    <div className="relative size-6">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d={svgPathsUser.pfc0e500} fill="black" />
                      </svg>
                    </div>
                    <p className="font-['Satoshi:Medium',sans-serif] text-[12px] text-black">Staff User</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowSettings(true);
                    }}
                    className="bg-[#faf6b6] flex items-center h-8 px-5 py-2 w-full hover:bg-[#f5f19a] transition-colors border-b border-[rgba(0,0,0,0.1)]"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="relative size-[14px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                          <path d="M7 0.583496C3.22017 0.583496 0.583328 3.22034 0.583328 7.00016C0.583328 10.78 3.22017 13.4168 7 13.4168C10.7798 13.4168 13.4167 10.78 13.4167 7.00016C13.4167 3.22034 10.7798 0.583496 7 0.583496ZM7 2.91683C8.12867 2.91683 9.04167 3.82984 9.04167 4.9585C9.04167 6.08717 8.12867 7.00016 7 7.00016C5.87133 7.00016 4.95833 6.08717 4.95833 4.9585C4.95833 3.82984 5.87133 2.91683 7 2.91683ZM7 11.6668C5.54167 11.6668 4.249 10.9562 3.5 9.85433C3.52067 8.72017 5.83333 8.10516 7 8.10516C8.16083 8.10516 10.4793 8.72017 10.5 9.85433C9.751 10.9562 8.45833 11.6668 7 11.6668Z" fill="black" fillOpacity="0.3" />
                        </svg>
                      </div>
                      <p className="font-['Satoshi:Regular',sans-serif] text-[10px] text-[rgba(0,0,0,0.3)]">Settings</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowHistory(true);
                    }}
                    className="bg-[#faf6b6] flex items-center h-8 px-5 py-2 w-full hover:bg-[#f5f19a] transition-colors border-b border-[rgba(0,0,0,0.1)]"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="relative size-[14px]">
                        <svg className="block size-full" fill="none" viewBox="0 0 14 14">
                          <path d="M7 1.16699C3.78 1.16699 1.16667 3.78033 1.16667 7.00033C1.16667 10.2203 3.78 12.8337 7 12.8337C10.22 12.8337 12.8333 10.2203 12.8333 7.00033C12.8333 3.78033 10.22 1.16699 7 1.16699ZM7 11.667C4.42667 11.667 2.33333 9.57366 2.33333 7.00033C2.33333 4.42699 4.42667 2.33366 7 2.33366C9.57333 2.33366 11.6667 4.42699 11.6667 7.00033C11.6667 9.57366 9.57333 11.667 7 11.667ZM7.29167 4.08366H6.70833V7.29199L9.45 8.97533L9.625 8.54449L7.29167 7.11699V4.08366Z" fill="black" fillOpacity="0.3" />
                        </svg>
                      </div>
                      <p className="font-['Satoshi:Regular',sans-serif] text-[10px] text-[rgba(0,0,0,0.3)]">History</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setIsLoggedIn(false)}
                    className="flex gap-4 items-center px-5 py-2 w-full hover:bg-[#f5f19a] transition-colors"
                  >
                    <div className="relative size-[14px]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                        <path d="M4.66667 10.2085L3.5 9.04183L5.54167 7.00016L3.5 4.9585L4.66667 3.79183L7.875 7.00016L4.66667 10.2085ZM7.58333 12.2502V10.7918H12.25V3.20849H7.58333V1.75016H12.25C12.6417 1.75016 12.9739 1.88725 13.2469 2.16141C13.5208 2.43475 13.6577 2.76683 13.6577 3.15766V10.8418C13.6577 11.2335 13.5208 11.5656 13.2469 11.8381C12.9739 12.1115 12.6417 12.2481 12.25 12.2481L7.58333 12.2502ZM0.875 7.72933V6.27099H9.04167V7.72933H0.875Z" fill="black" fillOpacity="0.3" />
                      </svg>
                    </div>
                    <p className="font-['Satoshi:Regular',sans-serif] text-[10px] text-[rgba(0,0,0,0.3)]">Logout</p>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-12">
        {/* Hero Text */}
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-['Satoshi:Bold',sans-serif] text-[24px] md:text-[32px] lg:text-[36px] text-black mb-2 md:mb-4">
              Create Your Perfect ID Photo
            </h1>
            <p className="font-['Satoshi:Light',sans-serif] text-[13px] md:text-[14px] lg:text-[15px] text-black max-w-2xl">
              Upload a photo and we'll instantly generate a print-ready ID photo with white background or formal attire.
            </p>
          </div>
          
          {/* Batch Mode Button */}
          <button
            onClick={() => setShowBatchProcessor(true)}
            className="bg-white h-[48px] px-6 rounded-[16px] hover:bg-gray-50 transition-all border-2 border-[rgba(71,71,71,0.2)] hover:border-[#e99b81] shrink-0"
          >
            <p className="font-['Satoshi:Bold',sans-serif] text-[14px] text-black">
              Batch Process
            </p>
          </button>
        </div>

        {/* Main Layout - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 md:gap-8">
          {/* Left Column - Upload/Preview Area */}
          <div className="w-full">
            {appState === 'upload' && (
              <div
                className="bg-white h-[400px] md:h-[500px] lg:h-[542px] rounded-[24px] w-full cursor-pointer border-2 border-[#efe418] border-dashed transition-all hover:border-[#e5d817]"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={!uploadedImage ? handleSelectPhotoClick : undefined}
              >
                <div className="flex flex-col items-center size-full">
                  {uploadedImage ? (
                    <div className="flex items-center justify-center p-5 md:p-8 size-full">
                      <Image
                        src={uploadedImage}
                        alt="Uploaded"
                        width={500}
                        height={500}
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 md:gap-6 items-center px-8 md:px-16 py-12 md:py-24 size-full justify-center">
                      <div className="bg-white flex items-center p-4 relative rounded-[28px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] size-[48px] md:size-[56px] transition-transform hover:scale-110">
                        <div className="relative size-6">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                            <path d={svgPaths.p37c6ce80} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </div>
                      </div>
                      <div className="font-['Satoshi:Bold',sans-serif] text-black text-center">
                        <p className="text-[18px] md:text-[24px] mb-2">Drag and drop your photo here</p>
                        <p className="font-['Satoshi:Regular',sans-serif] text-[13px] md:text-[15px]">or click to browse from your computer</p>
                      </div>
                      <div className="bg-[#f2f8ab] flex h-12 md:h-14 items-center justify-center px-8 md:px-10 rounded-[16px] hover:bg-[#eef59f] hover:scale-105 transition-all">
                        <p className="font-['Satoshi:Medium',sans-serif] text-[14px] md:text-[15px] text-black">Select Photo</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Completed State - Before/After */}
            {appState === 'completed' && (
              <div className="bg-white flex flex-col items-start p-6 md:p-10 lg:p-12 rounded-[24px] w-full border-2 border-[#efe418] border-dashed">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
                  {/* Before */}
                  <div className="flex flex-col h-[300px] md:h-[400px] lg:h-[444px] relative w-full">
                    {uploadedImage && (
                      <Image 
                        alt="Before" 
                        fill
                        className="object-cover rounded-lg" 
                        src={uploadedImage}
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                    <div className="bg-[#e99b81] flex h-6 items-center justify-center px-6 relative rounded-[16px] w-auto max-w-[105px] z-10 m-2">
                      <p className="font-['Satoshi:Medium',sans-serif] text-[10px] text-black">Before</p>
                    </div>
                  </div>

                  {/* After */}
                  <div className="flex flex-col h-[300px] md:h-[400px] lg:h-[444px] relative w-full">
                    {generatedImage && (
                      <Image 
                        alt="After" 
                        fill
                        className="object-cover rounded-lg" 
                        src={generatedImage}
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                    <div className="bg-[#efe418] flex h-6 items-center justify-center px-6 relative rounded-[16px] w-auto max-w-[105px] z-10 m-2">
                      <p className="font-['Satoshi:Medium',sans-serif] text-[10px] text-black">After</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Right Column - Settings */}
          <div className="bg-white rounded-[24px] w-full p-6 md:p-8">
            {appState === 'upload' && (
              <div className="flex flex-col gap-5 md:gap-6 w-full">
                {/* Quick Templates - Collapsible */}
                {uploadedImage && (
                  <div className="flex flex-col w-full pb-4 border-b border-gray-100">
                    <button
                      onClick={() => setShowQuickTemplates(!showQuickTemplates)}
                      className="flex items-center justify-between w-full hover:opacity-70 transition-opacity"
                    >
                      <div className="font-['Satoshi:Bold',sans-serif] text-black text-left">
                        <p className="text-[14px] mb-1">Quick Templates</p>
                        <p className="font-['Satoshi:Light',sans-serif] text-[10px]">One-click setup for common ID types</p>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-black transition-transform flex-shrink-0 ${showQuickTemplates ? 'rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showQuickTemplates && (
                      <div className="grid grid-cols-2 gap-3 w-full mt-3">
                        {quickTemplates.map((template) => {
                          const isSelected = selectedSize === template.size && selectedStyle === template.style && selectedBgColor === template.bgColor;
                          return (
                            <button
                              key={template.id}
                              onClick={() => handleTemplateSelect(template)}
                              className={`h-[56px] rounded-lg relative w-full transition-all border-2 ${
                                isSelected
                                  ? 'border-[#dd6b4a] bg-[#fff5f2] shadow-sm' 
                                  : 'border-[rgba(71,71,71,0.2)] bg-white'
                              } cursor-pointer hover:border-[#e99b81] hover:shadow-md`}
                            >
                              <div className="flex flex-col items-center justify-center size-full px-2">
                                <p className={`font-['Satoshi:Bold',sans-serif] text-[12px] ${isSelected ? 'text-[#dd6b4a]' : 'text-black'} text-center leading-tight`}>
                                  {template.name}
                                </p>
                                <p className={`font-['Satoshi:Regular',sans-serif] text-[10px] ${isSelected ? 'text-[#dd6b4a]' : 'text-[rgba(0,0,0,0.43)]'} text-center`}>
                                  {template.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Size Selection */}
                <div className="flex flex-col gap-3 w-full">
                  <div className="font-['Satoshi:Bold',sans-serif] text-black w-full">
                    <p className="text-[14px] mb-1">Choose Photo Size</p>
                    <p className="font-['Satoshi:Light',sans-serif] text-[10px]">Select the ID Size you need</p>
                  </div>
                  
                  <div className="flex flex-col gap-4 w-full">
                    <button
                      onClick={() => setSelectedSize('2x2')}
                      disabled={!uploadedImage}
                      className={`h-16 md:h-[65px] rounded-lg relative w-full transition-all border-2 ${
                        selectedSize === '2x2' 
                          ? 'border-[#dd6b4a] bg-[#fff5f2] shadow-sm' 
                          : 'border-[rgba(71,71,71,0.2)] bg-white'
                      } ${!uploadedImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#e99b81] hover:shadow-md'}`}
                    >
                      <div className="flex items-center justify-center size-full px-4">
                        <p className={`font-['Satoshi:Bold',sans-serif] text-[14px] ${selectedSize === '2x2' ? 'text-[#dd6b4a]' : 'text-[rgba(0,0,0,0.43)]'} text-center`}>
                          <span className="block">2×2</span>
                          <span className="font-['Satoshi:Regular',sans-serif] text-[12px] block">2 inches × 2 inches</span>
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedSize('passport')}
                      disabled={!uploadedImage}
                      className={`h-16 md:h-[65px] rounded-lg relative w-full transition-all border-2 ${
                        selectedSize === 'passport' 
                          ? 'border-[#dd6b4a] bg-[#fff5f2] shadow-sm' 
                          : 'border-[rgba(71,71,71,0.2)] bg-white'
                      } ${!uploadedImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#e99b81] hover:shadow-md'}`}
                    >
                      <div className="flex items-center justify-center size-full px-4">
                        <p className={`font-['Satoshi:Bold',sans-serif] text-[14px] ${selectedSize === 'passport' ? 'text-[#dd6b4a]' : 'text-[rgba(0,0,0,0.43)]'} text-center`}>
                          <span className="block">Passport</span>
                          <span className="font-['Satoshi:Regular',sans-serif] text-[12px] block">1.38 cm × 1.78 cm</span>
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Photo Style */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between w-full">
                    <p className="font-['Satoshi:Bold',sans-serif] text-[14px] text-black">Photo Style</p>
                    <button
                      onClick={() => setSelectedStyle(selectedStyle === 'custom' ? 'white-bg' : 'custom')}
                      className={`${selectedStyle === 'custom' ? 'bg-[#dd6b4a]' : 'bg-[rgba(233,155,129,0.37)]'} flex h-6 items-center justify-center px-6 rounded-[16px] hover:bg-[#e99b81] hover:scale-105 transition-all`}
                    >
                      <p className={`font-['Satoshi:Medium',sans-serif] text-[10px] ${selectedStyle === 'custom' ? 'text-white' : 'text-[rgba(0,0,0,0.52)]'}`}>{selectedStyle === 'custom' ? '✕ Exit Custom' : 'Custom'}</p>
                    </button>
                  </div>

                  {selectedStyle === 'custom' ? (
                    <div className="bg-white h-[175px] relative w-full rounded-lg border-2 border-[#efe418] border-dashed">
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Please type a custom prompt"
                        disabled={!uploadedImage}
                        className="w-full h-full px-4 py-4 font-['Satoshi:Regular',sans-serif] text-[14px] text-black resize-none focus:outline-none disabled:opacity-40 rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 w-full">
                      <button
                        onClick={() => setSelectedStyle('white-bg')}
                        disabled={!uploadedImage}
                        className={`h-16 md:h-[65px] rounded-lg relative w-full transition-all border-2 ${
                          selectedStyle === 'white-bg' 
                            ? 'border-[#dd6b4a] bg-[#fff5f2] shadow-sm' 
                            : 'border-[rgba(71,71,71,0.2)] bg-white'
                        } ${!uploadedImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#e99b81] hover:shadow-md'}`}
                      >
                        <div className="flex items-center justify-center size-full px-4">
                          <p className={`font-['Satoshi:Bold',sans-serif] text-[14px] ${selectedStyle === 'white-bg' ? 'text-[#dd6b4a]' : 'text-[rgba(0,0,0,0.43)]'} text-center`}>
                            <span className="block">White Background</span>
                            <span className="font-['Satoshi:Regular',sans-serif] text-[12px] block">Remove Background, add white</span>
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => setSelectedStyle('formal')}
                        disabled={!uploadedImage}
                        className={`h-16 md:h-[65px] rounded-lg relative w-full transition-all border-2 ${
                          selectedStyle === 'formal' 
                            ? 'border-[#dd6b4a] bg-[#fff5f2] shadow-sm' 
                            : 'border-[rgba(71,71,71,0.2)] bg-white'
                        } ${!uploadedImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#e99b81] hover:shadow-md'}`}
                      >
                        <div className="flex items-center justify-center size-full px-4">
                          <p className={`font-['Satoshi:Bold',sans-serif] text-[14px] ${selectedStyle === 'formal' ? 'text-[#dd6b4a]' : 'text-[rgba(0,0,0,0.43)]'} text-center`}>
                            <span className="block">Formal</span>
                            <span className="font-['Satoshi:Regular',sans-serif] text-[12px] block">Add professional clothing</span>
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={!uploadedImage || isLoading}
                  className={`bg-[#e50000] h-11 md:h-12 relative rounded-[24px] w-full transition-all ${
                    !uploadedImage || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#cc0000] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-center size-full">
                    <p className="font-['Satoshi:Bold',sans-serif] text-[14px] md:text-[16px] text-white">
                      Generate ID Photo
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Completed State Settings */}
            {appState === 'completed' && (
              <div className="flex flex-col gap-6 md:gap-8 w-full">
                {/* Background Color Selection */}
                <div className="flex flex-col gap-2 w-full">
                  <p className="font-['Satoshi:Bold',sans-serif] text-[14px] md:text-[16px] text-black">Select Background Color</p>
                  <div className="flex gap-4 items-center flex-wrap">
                    {/* White */}
                    <button
                      onClick={() => setSelectedBgColor('white')}
                      className={`relative size-[35px] rounded-full ${selectedBgColor === 'white' ? 'ring-2 ring-[#e99b81]' : ''}`}
                    >
                      <Image 
                        alt="White" 
                        className="block max-w-none size-full rounded-full" 
                        src="/assets/0aecd60e73c207381f9d2aaecba3a4173a4e71a4.png"
                        width={35}
                        height={35}
                      />
                    </button>

                    {/* Black */}
                    <button
                      onClick={() => setSelectedBgColor('black')}
                      className={`relative size-[35px] ${selectedBgColor === 'black' ? 'ring-2 ring-[#e99b81]' : ''} rounded-full`}
                    >
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 35 35">
                        <circle cx="17.5" cy="17.5" fill="black" r="17.5" />
                        <circle cx="17.5" cy="17.5" r="17" stroke="#595959" strokeOpacity="0.41" />
                      </svg>
                    </button>

                    {/* Gray */}
                    <button
                      onClick={() => setSelectedBgColor('gray')}
                      className={`relative size-[35px] ${selectedBgColor === 'gray' ? 'ring-2 ring-[#e99b81]' : ''} rounded-full`}
                    >
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 35 35">
                        <circle cx="17.5" cy="17.5" fill="#D3D3D3" r="17.5" />
                        <circle cx="17.5" cy="17.5" r="17" stroke="#595959" strokeOpacity="0.41" />
                      </svg>
                    </button>

                    {/* Rainbow Gradient */}
                    <button
                      onClick={() => setSelectedBgColor('gradient')}
                      className={`relative size-[35px] ${selectedBgColor === 'gradient' ? 'ring-2 ring-[#e99b81]' : ''} rounded-full overflow-hidden`}
                    >
                      <div className="w-full h-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500" />
                    </button>

                    {/* Custom */}
                    <button
                      onClick={() => setSelectedBgColor('custom')}
                      className={`relative size-[35px] ${selectedBgColor === 'custom' ? 'ring-2 ring-[#e99b81]' : ''} rounded-full`}
                    >
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 35 35">
                        <rect fill="white" height="35" rx="17.5" width="35" />
                        <rect height="34" rx="17" stroke="#BBBBBB" strokeOpacity="0.41" width="34" x="0.5" y="0.5" />
                        <path d="M17.5 11.667C15.8333 11.667 14.4792 12.4378 13.4375 13.9795C12.3958 15.5211 11.875 17.5003 11.875 19.917H13.125C13.125 17.8753 13.5625 16.2086 14.4375 14.917C15.3125 13.6253 16.3542 12.9795 17.5625 12.917V16.667L21.25 12.917L17.5 9.167V11.667ZM17.5 23.3337C19.1667 23.3337 20.5208 22.5628 21.5625 21.0212C22.6042 19.4795 23.125 17.5003 23.125 15.0837H21.875C21.875 17.1253 21.4375 18.792 20.5625 20.0837C19.6875 21.3753 18.6458 22.0211 17.4375 22.0837V18.3337L13.75 22.0837L17.5 25.8337V23.3337Z" fill="#2F2F2F" />
                      </svg>
                    </button>
            </div>
          </div>

                {/* Links */}
                <div className="flex flex-col gap-3 w-full">
                  <button className="flex gap-3 items-center hover:opacity-70">
                    <div className="relative size-6">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" fill="#2F2F2F" />
                      </svg>
                    </div>
                    <p className="font-['Satoshi:Regular',sans-serif] text-[14px] md:text-[16px] text-[#2f2f2f]">Refine</p>
                  </button>

                  <button className="flex gap-3 items-center hover:opacity-70">
                    <div className="relative size-6">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" fill="#2F2F2F" />
                      </svg>
                    </div>
                    <p className="font-['Satoshi:Regular',sans-serif] text-[14px] md:text-[16px] text-[#2f2f2f]">Customize</p>
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-4 w-full">
                  <button
                    onClick={handleDownload}
                    className="bg-[#e50000] h-11 md:h-12 relative rounded-[24px] w-full hover:bg-[#cc0000] transition-colors"
                  >
                    <div className="flex items-center justify-center size-full">
                      <p className="font-['Satoshi:Bold',sans-serif] text-[14px] md:text-[16px] text-white">Download ID</p>
                    </div>
                  </button>

          <button
                    onClick={handleStartOver}
                    className="bg-white h-11 md:h-12 relative rounded-[24px] w-full hover:bg-gray-50 transition-colors border border-[#595959]"
          >
                    <div className="flex items-center justify-center size-full">
                      <p className="font-['Satoshi:Bold',sans-serif] text-[14px] md:text-[16px] text-black">Start over</p>
                    </div>
          </button>
                </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Footer - Responsive */}
      <div className="bg-white border-t border-[rgba(0,0,0,0.36)] mt-12 md:mt-16">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <div className="text-center text-[#595959]">
            <p className="font-['Satoshi:Bold',sans-serif] text-[12px] md:text-[14px] mb-2">Powered by Avera Technologies</p>
            <p className="font-['Satoshi:Medium',sans-serif] text-[11px] md:text-[14px]">Professional ID Photo Generator • Trusted quality since 2000</p>
          </div>
        </div>
      </div>

      {/* Modals and Overlays */}
      {error && (
        <ErrorModal
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {showUploadError && (
        <UploadFailedModal
          onRetry={() => {
            setShowUploadError(false);
            handleSelectPhotoClick();
          }}
        />
      )}

      {isLoading && <LoadingOverlay selectedSize={selectedSize} />}

      {errorToast && <ErrorToast message={errorToast} />}

      {/* Batch Processor Modal */}
      {showBatchProcessor && (
        <BatchProcessor
          onClose={() => setShowBatchProcessor(false)}
          selectedSize={selectedSize}
          selectedStyle={selectedStyle}
          selectedBgColor={selectedBgColor}
          customPrompt={customPrompt}
        />
      )}
    </div>
  );
}
