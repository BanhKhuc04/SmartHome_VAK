import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Settings, Globe, Moon, Sun, 
    Monitor, Bell, Shield, Key, Mail, 
    Save, Cpu, Image as ImageIcon, Trash2, UploadCloud,
    CheckCircle2, X, Crop, ZoomIn, Zap, Sliders, Play, Timer
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';
import { useSettings, CustomImage, ImageFilters } from '../../shared/contexts/SettingsContext';

export const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { settings, updateSettings } = useSettings();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Cropping State
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [croppedImageBase64, setCroppedImageBase64] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filters, setFilters] = useState<ImageFilters>({
        brightness: 100,
        contrast: 100,
        blur: 0,
        grayscale: false
    });
    const [pendingFileName, setPendingFileName] = useState("");
    const [pendingFileSize, setPendingFileSize] = useState("");
    const [pendingFileType, setPendingFileType] = useState<'image' | 'video' | 'gif'>('image');

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPendingFileName(file.name);
            setPendingFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
            
            const isVideo = file.type.startsWith('video/');
            const isGif = file.type === 'image/gif';
            const fileType = isVideo ? 'video' : (isGif ? 'gif' : 'image');
            
            if (isVideo && file.size > 4 * 1024 * 1024) {
                alert('Warning: This video file is larger than 4MB. It may not persist across page refreshes due to browser storage limits.');
            }

            setPendingFileType(fileType);

            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (fileType === 'image') {
                    setImageToCrop(result);
                    setIsCropping(true);
                } else {
                    // Directly add video/gif to gallery for now as cropping is complex
                    const newImage: CustomImage = {
                        id: Date.now().toString(),
                        url: result,
                        name: file.name,
                        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                        type: fileType
                    };
                    const updatedImages = [...settings.customScreensaverImages, newImage];
                    const updatedActiveIds = [...settings.activeCustomImageIds, newImage.id];
                    
                    updateSettings({ 
                        customScreensaverImages: updatedImages,
                        activeCustomImageIds: updatedActiveIds,
                        customScreensaverUrl: result // Set as primary URL
                    });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return "";

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return canvas.toDataURL('image/jpeg');
    };

    const handleConfirmCrop = async () => {
        if (imageToCrop && croppedAreaPixels) {
            try {
                const base64 = await getCroppedImg(imageToCrop, croppedAreaPixels);
                setCroppedImageBase64(base64);
                setIsCropping(false);
                setIsFiltering(true);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleConfirmFilters = async () => {
        if (croppedImageBase64) {
            const newImage: CustomImage = {
                id: Date.now().toString(),
                url: croppedImageBase64,
                name: pendingFileName,
                size: pendingFileSize,
                type: 'image',
                filters: filters
            };
            
            const updatedImages = [...settings.customScreensaverImages, newImage];
            const updatedActiveIds = [...settings.activeCustomImageIds, newImage.id];
            
            updateSettings({ 
                customScreensaverImages: updatedImages,
                activeCustomImageIds: updatedActiveIds,
                customScreensaverUrl: newImage.url
            });
            
            setIsFiltering(false);
            setCroppedImageBase64(null);
            setImageToCrop(null);
            setFilters({ brightness: 100, contrast: 100, blur: 0, grayscale: false });
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSelectImage = (img: CustomImage) => {
        const isSelected = settings.activeCustomImageIds.includes(img.id);
        let updatedIds: string[];
        
        if (isSelected) {
            updatedIds = settings.activeCustomImageIds.filter(id => id !== img.id);
        } else {
            updatedIds = [...settings.activeCustomImageIds, img.id];
        }
        
        updateSettings({ 
            activeCustomImageIds: updatedIds,
            customScreensaverUrl: updatedIds.length > 0 ? (settings.customScreensaverImages.find(i => i.id === updatedIds[0])?.url || '') : ''
        });
    };

    const handleRemoveFile = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updatedImages = settings.customScreensaverImages.filter(img => img.id !== id);
        const updatedActiveIds = settings.activeCustomImageIds.filter(activeId => activeId !== id);

        updateSettings({ 
            customScreensaverImages: updatedImages,
            activeCustomImageIds: updatedActiveIds,
            customScreensaverUrl: updatedActiveIds.length > 0 ? (updatedImages.find(img => img.id === updatedActiveIds[0])?.url || '') : ''
        });
    };

    const SectionHeader = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white border border-black/[0.03] rounded-2xl shadow-soft text-nexus-primary">
                <Icon size={20} />
            </div>
            <div>
                <h3 className="text-lg font-black text-primary uppercase tracking-tight">{title}</h3>
                <p className="text-[9px] font-bold text-muted uppercase tracking-widest">{desc}</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-primary uppercase tracking-tighter">System Configuration</h2>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Global OS Parameters & Security</p>
                </div>
                <button className="flex items-center gap-2 px-8 py-3 bg-nexus-primary text-white rounded-2xl shadow-premium hover:shadow-hover transition-all text-[10px] font-black uppercase">
                    <Save size={14} /> Synchronize All
                </button>
            </div>

            {/* Profile Section */}
            <div className="nexus-card p-10">
                <SectionHeader 
                    icon={User} 
                    title="User Profile" 
                    desc="Identity & Access Management"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Architect Alias</label>
                        <div className="flex items-center gap-4 p-4 bg-slate-500/5 border border-white/5 rounded-2xl">
                             <div className="w-10 h-10 rounded-full bg-nexus-primary/10 flex items-center justify-center text-nexus-primary">
                                <Key size={18} />
                             </div>
                             <span className="text-sm font-black text-primary uppercase">ADMIN</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Secure Channel</label>
                        <div className="flex items-center gap-4 p-4 bg-slate-500/5 border border-white/5 rounded-2xl">
                             <div className="w-10 h-10 rounded-full bg-nexus-primary/10 flex items-center justify-center text-nexus-primary">
                                <Mail size={18} />
                             </div>
                             <span className="text-sm font-black text-primary">ADMIN@HOMESMART.LOCAL</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* General OS Settings */}
            <div className="nexus-card p-10">
                <SectionHeader 
                    icon={Monitor} 
                    title="OS Appearance" 
                    desc="Visual Layer & Interaction Mode"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Language</label>
                        <select 
                            className="input-glass w-full text-[11px] font-black uppercase"
                            value={settings.language} 
                            onChange={e => updateSettings({ language: e.target.value as any })}
                        >
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English (US)</option>
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Chroma Mode</label>
                        <div className="relative p-1.5 bg-slate-500/10 border border-white/5 rounded-2xl flex items-center h-14 overflow-hidden">
                            <motion.div 
                                className="absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-nexus-primary shadow-premium z-0"
                                initial={false}
                                animate={{ 
                                    x: settings.theme === 'dark' ? 0 : '100%',
                                    width: 'calc(50% - 3px)'
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                            
                            <button 
                                onClick={() => updateSettings({ theme: 'dark' })}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-3 h-full text-[10px] font-black uppercase transition-colors duration-500 ${settings.theme === 'dark' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Moon size={16} fill={settings.theme === 'dark' ? 'currentColor' : 'none'} /> Dark
                            </button>
                            
                            <button 
                                onClick={() => updateSettings({ theme: 'light' })}
                                className={`relative z-10 flex-1 flex items-center justify-center gap-3 h-full text-[10px] font-black uppercase transition-colors duration-500 ${settings.theme === 'light' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Sun size={16} fill={settings.theme === 'light' ? 'currentColor' : 'none'} /> Light
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Screensaver (SEC)</label>
                        <input 
                            type="number" 
                            className="input-glass w-full"
                            value={settings.screensaverTimeout}
                            onChange={e => updateSettings({ screensaverTimeout: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="mt-10 space-y-4">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Screensaver Environment</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {['default', 'space', 'nature', 'ocean', 'custom'].map(type => (
                            <button
                                key={type}
                                onClick={() => updateSettings({ screensaverBackground: type as any })}
                                className={`py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${settings.screensaverBackground === type ? 'bg-nexus-primary text-white border-nexus-primary shadow-lg scale-[1.02]' : 'bg-glass text-muted border-white/10 hover:bg-slate-500/5'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {settings.screensaverBackground === 'custom' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-8 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50 space-y-6"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*,video/*"
                                onChange={handleFileChange}
                            />

                            {/* Gallery Header & Interval */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Media Gallery</h4>
                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest">{settings.customScreensaverImages.length} Files • {settings.activeCustomImageIds.length} Selected</p>
                                </div>
                                
                                {settings.activeCustomImageIds.length > 1 && (
                                    <div className="flex items-center gap-3 bg-nexus-primary/10 px-4 py-2 rounded-xl border border-nexus-primary/20">
                                        <Timer size={14} className="text-nexus-primary" />
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">Interval:</span>
                                        <select 
                                            value={settings.slideshowInterval}
                                            onChange={(e) => updateSettings({ slideshowInterval: Number(e.target.value) })}
                                            className="bg-transparent text-[9px] font-black uppercase text-nexus-primary focus:outline-none cursor-pointer"
                                        >
                                            {[5, 10, 15, 30, 60, 120].map(s => (
                                                <option key={s} value={s}>{s}s</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Gallery Grid */}
                            {settings.customScreensaverImages.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {settings.customScreensaverImages.map((img) => (
                                        <motion.div
                                            key={img.id}
                                            whileHover={{ y: -4 }}
                                            onClick={() => handleSelectImage(img)}
                                            className={`relative aspect-[16/10] rounded-2xl border-2 overflow-hidden cursor-pointer group transition-all ${
                                                settings.activeCustomImageIds.includes(img.id) ? 'border-nexus-primary shadow-premium' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'
                                            }`}
                                        >
                                            {img.type === 'video' ? (
                                                <video 
                                                    src={img.url} 
                                                    muted 
                                                    loop 
                                                    autoPlay 
                                                    playsInline
                                                    onError={() => console.error('Gallery video load failed')}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <img 
                                                    src={img.url} 
                                                    alt={img.name} 
                                                    className="w-full h-full object-cover" 
                                                    style={{
                                                        filter: img.filters ? `brightness(${img.filters.brightness}%) contrast(${img.filters.contrast}%) blur(${img.filters.blur}px) ${img.filters.grayscale ? 'grayscale(100%)' : ''}` : 'none'
                                                    }}
                                                />
                                            )}
                                            
                                            {/* Selection Overlay */}
                                            <div className={`absolute inset-0 bg-nexus-primary/10 transition-opacity ${settings.activeCustomImageIds.includes(img.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
                                            
                                            {/* Selection Indicator */}
                                            <div className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                                settings.activeCustomImageIds.includes(img.id) 
                                                ? 'bg-nexus-primary text-white scale-110 shadow-lg' 
                                                : 'bg-white/40 dark:bg-black/40 backdrop-blur-sm border border-white/20 text-transparent opacity-0 group-hover:opacity-100'
                                            }`}>
                                                <CheckCircle2 size={14} />
                                            </div>

                                            {/* Type Badge */}
                                            {img.type !== 'image' && (
                                                <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-widest border border-white/10 flex items-center gap-1">
                                                    {img.type === 'video' ? <Play size={8} fill="currentColor" /> : <Zap size={8} fill="currentColor" />}
                                                    {img.type}
                                                </div>
                                            )}

                                            {/* File Info Overlay */}
                                            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                                                <div className="flex items-center justify-between gap-2 text-white">
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black uppercase truncate">{img.name}</p>
                                                        <p className="text-[8px] font-bold opacity-60 tracking-widest">{img.size}</p>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => handleRemoveFile(e, img.id)}
                                                        className="w-7 h-7 rounded-lg bg-white/20 hover:bg-nexus-danger/80 flex items-center justify-center transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* UPLOAD Area */}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center py-10 gap-4 cursor-pointer hover:bg-slate-500/5 transition-all rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-nexus-primary group"
                            >
                                <div className="w-20 h-20 rounded-3xl bg-glass shadow-soft flex items-center justify-center text-nexus-primary group-hover:scale-110 transition-transform duration-500">
                                    <UploadCloud size={40} strokeWidth={1.5} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-primary uppercase tracking-tight">Add to Gallery</p>
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Images, Videos & GIFs</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] text-center">Max: 5MB (IMG) / 15MB (Video)</p>
                                <p className="text-[8px] font-medium text-muted/40 uppercase tracking-widest text-center">MP4, GIF, PNG, JPG Supported</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Infrastructure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="nexus-card p-10">
                    <SectionHeader 
                        icon={Zap} 
                        title="MQTT Bridge" 
                        desc="Hardware Communication Bus"
                    />
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Broker URI</label>
                        <input 
                            className="input-glass w-full font-mono text-xs"
                            value="mqtt://localhost:1883" 
                            readOnly
                        />
                    </div>
                </div>
                <div className="nexus-card p-10">
                    <SectionHeader 
                        icon={Shield} 
                        title="External Alerts" 
                        desc="Telegram Bot Orchestration"
                    />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Bot Token</label>
                            <input 
                                className="input-glass w-full"
                                type="password"
                                value={settings.telegramToken} 
                                onChange={e => updateSettings({ telegramToken: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Global Chat ID</label>
                            <input 
                                className="input-glass w-full"
                                value={settings.telegramChatId} 
                                onChange={e => updateSettings({ telegramChatId: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* System Status Widget */}
            <div className="nexus-card bg-white/80 border border-white/40 p-10 flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-soft">
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-nexus-primary/10 flex items-center justify-center text-nexus-primary">
                            <Cpu size={16} />
                        </div>
                        <h4 className="text-primary text-lg font-black uppercase tracking-tight">System Status</h4>
                    </div>
                    <p className="text-muted text-[9px] font-bold uppercase tracking-[0.2em]">Build 2.0.402-STABLE • Verified Production Candidate</p>
                </div>
                <div className="relative z-10 flex gap-10 mt-6 md:mt-0">
                    <div className="text-center">
                        <p className="text-nexus-primary text-xl font-black tabular-nums tracking-tighter">99.9%</p>
                        <p className="text-muted text-[8px] font-black uppercase tracking-widest">Uptime</p>
                    </div>
                    <div className="text-center">
                        <p className="text-nexus-primary text-xl font-black tabular-nums tracking-tighter">14ms</p>
                        <p className="text-muted text-[8px] font-black uppercase tracking-widest">Latency</p>
                    </div>
                    <div className="text-center">
                        <p className="text-nexus-primary text-xl font-black tabular-nums tracking-tighter">OS X</p>
                        <p className="text-muted text-[8px] font-black uppercase tracking-widest">Kernel</p>
                    </div>
                </div>
            </div>

            {/* Global Save Action */}
            <div className="flex justify-end pt-4">
                <button className="flex items-center gap-3 px-10 py-4 bg-nexus-primary text-white rounded-2xl shadow-premium hover:shadow-hover hover:scale-[1.02] transition-all text-xs font-black uppercase tracking-widest">
                    <Save size={18} /> Save Changes
                </button>
            </div>

            {/* Filtering Modal */}
            <AnimatePresence>
                {isFiltering && croppedImageBase64 && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" 
                            onClick={() => setIsFiltering(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-nexus-primary/10 flex items-center justify-center text-nexus-primary">
                                        <Sliders size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-primary uppercase tracking-tight">Filter Tuning</h3>
                                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none mt-1">Refine visual aesthetics</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsFiltering(false)}
                                    className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Preview Panel */}
                                <div className="space-y-4">
                                    <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 shadow-inner">
                                        <img 
                                            src={croppedImageBase64} 
                                            alt="Filtered Preview" 
                                            className="w-full h-full object-cover transition-all duration-300"
                                            style={{
                                                filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) blur(${filters.blur}px) ${filters.grayscale ? 'grayscale(100%)' : ''}`
                                            }}
                                        />
                                    </div>
                                    <div className="p-4 bg-slate-500/5 rounded-2xl flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-nexus-primary animate-pulse" />
                                        <p className="text-[9px] font-black uppercase text-muted tracking-widest">Real-time Performance Preview</p>
                                    </div>
                                </div>

                                {/* Controls Panel */}
                                <div className="space-y-6">
                                    {/* Brightness */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-muted">Brightness</span>
                                            <span className="text-nexus-primary">{filters.brightness}%</span>
                                        </div>
                                        <input 
                                            type="range" min={0} max={200}
                                            value={filters.brightness}
                                            onChange={(e) => setFilters(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                                            className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-nexus-primary"
                                        />
                                    </div>

                                    {/* Contrast */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-muted">Contrast</span>
                                            <span className="text-nexus-primary">{filters.contrast}%</span>
                                        </div>
                                        <input 
                                            type="range" min={0} max={200}
                                            value={filters.contrast}
                                            onChange={(e) => setFilters(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                                            className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-nexus-primary"
                                        />
                                    </div>

                                    {/* Blur */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-muted">Gaussian Blur</span>
                                            <span className="text-nexus-primary">{filters.blur}px</span>
                                        </div>
                                        <input 
                                            type="range" min={0} max={10} step={0.5}
                                            value={filters.blur}
                                            onChange={(e) => setFilters(prev => ({ ...prev, blur: Number(e.target.value) }))}
                                            className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-nexus-primary"
                                        />
                                    </div>

                                    {/* Grayscale Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-slate-500/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${filters.grayscale ? 'bg-nexus-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-muted'}`}>
                                                <ImageIcon size={16} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Grayscale Mode</span>
                                        </div>
                                        <button 
                                            onClick={() => setFilters(prev => ({ ...prev, grayscale: !prev.grayscale }))}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${filters.grayscale ? 'bg-nexus-primary' : 'bg-slate-200 dark:bg-white/10'}`}
                                        >
                                            <motion.div 
                                                animate={{ x: filters.grayscale ? 24 : 0 }}
                                                className="w-4 h-4 bg-white rounded-full shadow-sm"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 pt-0 flex gap-4">
                                <button 
                                    onClick={() => setIsFiltering(false)}
                                    className="flex-1 py-4 px-6 rounded-2xl border border-slate-100 dark:border-white/10 text-[11px] font-black uppercase text-muted hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                >
                                    Back to Crop
                                </button>
                                <button 
                                    onClick={handleConfirmFilters}
                                    className="flex-[2] py-4 px-6 rounded-2xl bg-nexus-primary text-white text-[11px] font-black uppercase shadow-premium hover:shadow-hover transition-all flex items-center justify-center gap-2"
                                >
                                    Finish & Add to Gallery
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Cropping Modal */}
            <AnimatePresence>
                {isCropping && imageToCrop && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" 
                            onClick={() => setIsCropping(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-nexus-primary/10 flex items-center justify-center text-nexus-primary">
                                        <Crop size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-primary uppercase tracking-tight">Position & Crop</h3>
                                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none mt-1">Adjust framing for screensaver</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsCropping(false)}
                                    className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="relative h-[400px] bg-slate-100 dark:bg-black/20">
                                <Cropper
                                    image={imageToCrop}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={16 / 10}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted">
                                        <span className="flex items-center gap-2"><ZoomIn size={14} /> Zoom Level</span>
                                        <span className="text-nexus-primary">{Math.round(zoom * 100)}%</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        value={zoom}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-nexus-primary"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setIsCropping(false)}
                                        className="flex-1 py-4 px-6 rounded-2xl border border-slate-100 dark:border-white/10 text-[11px] font-black uppercase text-muted hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleConfirmCrop}
                                        className="flex-[2] py-4 px-6 rounded-2xl bg-nexus-primary text-white text-[11px] font-black uppercase shadow-premium hover:shadow-hover transition-all flex items-center justify-center gap-2"
                                    >
                                        Confirm & Add to Gallery
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
