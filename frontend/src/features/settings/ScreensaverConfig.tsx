import React, { useRef, useState } from 'react';
import { Monitor, Image as ImageIcon, MonitorPlay, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import { useSettings, CustomImage } from '../../shared/contexts/SettingsContext';

export const ScreensaverConfig: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError(null);

        // V1 constraint: limit image count to 3
        if (settings.customScreensaverImages.length >= 3) {
            setUploadError('Maximum 3 custom images allowed in V1 storage.');
            return;
        }

        // V1 constraint: validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('Only image files are supported.');
            return;
        }

        // V1 constraint: warn/block on large images (Max 10MB for localStorage)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('Image too large. Please use an image under 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const newImage: CustomImage = {
                id: `img_${Date.now()}`,
                url: dataUrl,
                name: file.name,
                size: `${(file.size / 1024).toFixed(1)} KB`,
                type: 'image'
            };

            const updatedImages = [...settings.customScreensaverImages, newImage];
            const updatedIds = [...settings.activeCustomImageIds, newImage.id];
            
            try {
                updateSettings({ 
                    customScreensaverImages: updatedImages,
                    activeCustomImageIds: updatedIds,
                    screensaverBackground: 'custom'
                });
            } catch (err) {
                setUploadError('Storage quota exceeded. Try deleting existing images or using a smaller file.');
            }
        };
        reader.onerror = () => setUploadError('Failed to read file.');
        reader.readAsDataURL(file);
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeCustomImage = (id: string) => {
        const updatedImages = settings.customScreensaverImages.filter(img => img.id !== id);
        const updatedIds = settings.activeCustomImageIds.filter(activeId => activeId !== id);
        
        updateSettings({
            customScreensaverImages: updatedImages,
            activeCustomImageIds: updatedIds,
            screensaverBackground: updatedImages.length === 0 && settings.screensaverBackground === 'custom' ? 'default' : settings.screensaverBackground
        });
    };

    const toggleImageActive = (id: string) => {
        const isActive = settings.activeCustomImageIds.includes(id);
        const newIds = isActive 
            ? settings.activeCustomImageIds.filter(activeId => activeId !== id)
            : [...settings.activeCustomImageIds, id];
            
        updateSettings({ activeCustomImageIds: newIds });
    };

    return (
        <div className="nexus-card space-y-4" style={{ padding: '20px 24px' }}>
            <div className="flex items-center gap-2 mb-2">
                <ImageIcon size={18} style={{ color: 'var(--nexus-primary)' }} />
                <h3 className="font-black" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Dashboard Gallery</h3>
            </div>
            
            <div className="nexus-inset p-4 animate-fade-in border border-blue-500/20">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-black text-sm text-white">Gallery Images</h4>
                        <p className="text-xs text-slate-400 mt-1">Upload up to 3 images (Max 10MB each) to display on the dashboard.</p>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} disabled={settings.customScreensaverImages.length >= 3} className="btn-premium">
                        <Upload size={14} /> Upload Image
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>

                {uploadError && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs font-bold">
                        <AlertTriangle size={14} /> {uploadError}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {settings.customScreensaverImages.length === 0 ? (
                        <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-700 rounded-lg">
                            <ImageIcon size={24} className="mx-auto text-slate-600 mb-2" />
                            <div className="text-sm font-bold text-slate-500">No images uploaded</div>
                        </div>
                    ) : (
                        settings.customScreensaverImages.map(img => (
                            <div key={img.id} className={`relative group overflow-hidden rounded-lg border-2 ${settings.activeCustomImageIds.includes(img.id) ? 'border-blue-500' : 'border-slate-800'}`}>
                                <img src={img.url} alt={img.name} className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                    <div className="flex justify-between items-start">
                                        <button onClick={() => toggleImageActive(img.id)} className={`px-2 py-1 text-[10px] font-bold rounded ${settings.activeCustomImageIds.includes(img.id) ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                            {settings.activeCustomImageIds.includes(img.id) ? 'ACTIVE' : 'INACTIVE'}
                                        </button>
                                        <button onClick={() => removeCustomImage(img.id)} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"><Trash2 size={12} /></button>
                                    </div>
                                    <div className="text-[10px] font-mono text-white truncate drop-shadow-md">{img.name} ({img.size})</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {settings.customScreensaverImages.length > 1 && (
                    <label className="block mt-4">
                        <span className="font-extrabold uppercase text-[9px] tracking-[0.15em] text-slate-500">Slideshow Interval (seconds)</span>
                        <input type="number" min="5" max="300" value={settings.slideshowInterval} onChange={(e) => updateSettings({ slideshowInterval: Number(e.target.value) })} className="input-glass mt-1 max-w-[200px]" />
                    </label>
                )}
            </div>
        </div>
    );
};
