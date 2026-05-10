import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Activity, AlertTriangle, Wifi, RefreshCcw } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { SensorSummary } from '../../shared/types';

export default function SensorSnapshot() {
    const [sensors, setSensors] = useState<SensorSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSensors = async () => {
        try {
            setLoading(true);
            const data = await apiService.getSensorSummaries();
            setSensors(data);
        } catch (error) {
            console.error('Failed to load sensors:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadSensors();
    }, []);

    useWebSocket((message) => {
        if (message.type === 'telemetry_update') {
            const p = message.payload as { device_id: string; telemetry: any };
            setSensors(prev => prev.map(s => s.device_id === p.device_id ? { ...s, telemetry: p.telemetry.original } : s));
        }
    });

    const activeSensors = sensors.filter(s => s.status === 'online').length;
    const avgTemp = sensors.length > 0 
        ? sensors.reduce((acc, s) => acc + (s.telemetry?.temperature || 0), 0) / sensors.filter(s => s.telemetry?.temperature).length || 0
        : 0;
    
    const weakestRssi = sensors.length > 0
        ? Math.min(...sensors.filter(s => s.telemetry?.rssi).map(s => s.telemetry.rssi))
        : 0;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg text-white tracking-wide">Sensor Snapshot</h2>
                <button onClick={loadSensors} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                    <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading && sensors.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-slate-500 font-mono text-xs uppercase tracking-widest">Scanning...</div>
                </div>
            ) : sensors.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <Activity className="w-8 h-8 text-slate-700 mb-3" />
                    <p className="text-sm text-slate-500">No sensor telemetry yet</p>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase font-mono">Publish to homelab/device/+/telemetry</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-black/40 rounded-2xl border border-white/5 p-4 flex flex-col justify-between group hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center gap-2 text-cyan-400 mb-2">
                            <Thermometer size={16} />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Avg Temp</span>
                        </div>
                        <div className="text-2xl font-mono text-white">
                            {avgTemp > 0 ? `${avgTemp.toFixed(1)}°C` : '--'}
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-2xl border border-white/5 p-4 flex flex-col justify-between group hover:border-purple-500/30 transition-colors">
                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                            <Wifi size={16} />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Weakest Link</span>
                        </div>
                        <div className="text-2xl font-mono text-white">
                            {weakestRssi !== 0 ? `${weakestRssi} dBm` : '--'}
                        </div>
                    </div>

                    <div className="col-span-2 bg-black/40 rounded-2xl border border-white/5 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Active Pipeline</span>
                                <span className="text-[10px] font-mono text-emerald-400">{activeSensors} Online</span>
                            </div>
                            <div className="space-y-3">
                                {sensors.slice(0, 3).map(s => (
                                    <div key={s.device_id} className="flex items-center justify-between">
                                        <span className="text-xs text-slate-300 truncate mr-2">{s.name}</span>
                                        <div className="flex items-center gap-3">
                                            {s.telemetry?.temperature && (
                                                <span className="text-[10px] font-mono text-slate-400">{s.telemetry.temperature}°C</span>
                                            )}
                                            {s.telemetry?.humidity && (
                                                <span className="text-[10px] font-mono text-cyan-500/70">{s.telemetry.humidity}%</span>
                                            )}
                                            <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'online' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
