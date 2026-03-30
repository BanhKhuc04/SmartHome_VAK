import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ImageFilters {
    brightness: number;
    contrast: number;
    blur: number;
    grayscale: boolean;
}

export interface CustomImage {
    id: string;
    url: string;
    name: string;
    size: string;
    type: 'image' | 'video' | 'gif';
    filters?: ImageFilters;
}

export interface Settings {
    screensaverTimeout: number; // in seconds
    screensaverBackground: 'default' | 'space' | 'nature' | 'ocean' | 'custom';
    customScreensaverUrl: string; // Current displayed/selected URL
    customScreensaverImages: CustomImage[];
    activeCustomImageId: string; // Legacy: Single selected ID
    activeCustomImageIds: string[]; // Current: Multiple selected IDs
    slideshowInterval: number; // in seconds
    language: 'vi' | 'en';
    theme: 'dark' | 'light';
    mqttBroker: string;
    telegramToken: string;
    telegramChatId: string;
}

const defaultSettings: Settings = {
    screensaverTimeout: 30,
    screensaverBackground: 'default',
    customScreensaverUrl: '',
    customScreensaverImages: [],
    activeCustomImageId: '',
    activeCustomImageIds: [],
    slideshowInterval: 30,
    language: 'vi',
    theme: 'dark',
    mqttBroker: 'mqtt://localhost:1883',
    telegramToken: '',
    telegramChatId: '',
};

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>(() => {
        const saved = localStorage.getItem('home_smart_settings');
        if (!saved) return defaultSettings;
        
        try {
            const parsed = JSON.parse(saved);
            const migrated = { ...defaultSettings, ...parsed };
            
            // Migration: Set activeCustomImageIds if only activeCustomImageId exists
            if (migrated.activeCustomImageId && migrated.activeCustomImageIds.length === 0) {
                migrated.activeCustomImageIds = [migrated.activeCustomImageId];
            }
            
            // Migration: Ensure all images have a type
            migrated.customScreensaverImages = migrated.customScreensaverImages.map((img: any) => ({
                ...img,
                type: img.type || 'image'
            }));
            
            return migrated;
        } catch (e) {
            return defaultSettings;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('home_smart_settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Settings persistence failed (likely quota exceeded):', e);
            // We don't crash here, the state is still in memory.
            // On next reload, it might be lost or partially saved.
        }

        // Apply theme to body
        if (settings.theme === 'light') {
            document.body.classList.add('theme-light');
            document.body.classList.remove('theme-dark');
            document.documentElement.classList.remove('dark');
        } else {
            document.body.classList.add('theme-dark');
            document.body.classList.remove('theme-light');
            document.documentElement.classList.add('dark');
        }
    }, [settings]);

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
