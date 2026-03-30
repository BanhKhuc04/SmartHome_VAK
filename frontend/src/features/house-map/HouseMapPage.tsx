import { motion } from 'framer-motion';
import { Thermometer, Zap, ShieldCheck, Map as MapIcon, Maximize2, Layers } from 'lucide-react';
import { useState } from 'react';

interface RoomNode {
    id: string;
    name: string;
    x: number;
    y: number;
    temp: number;
    devices: number;
    security: 'secure' | 'alert';
}

const rooms: RoomNode[] = [
    { id: 'living', name: 'Living Room', x: 200, y: 150, temp: 22.5, devices: 4, security: 'secure' },
    { id: 'kitchen', name: 'Kitchen', x: 500, y: 150, temp: 23.1, devices: 2, security: 'secure' },
    { id: 'bedroom', name: 'Master Bed', x: 200, y: 400, temp: 21.8, devices: 3, security: 'secure' },
    { id: 'bath', name: 'Bathroom', x: 500, y: 400, temp: 24.0, devices: 1, security: 'secure' },
];

export default function HouseMapPage() {
    const [selectedRoom, setSelectedRoom] = useState<RoomNode | null>(null);

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Spatial Map</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aesthetic Digital Twin v1.0</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-black/[0.03] rounded-2xl shadow-soft hover:shadow-premium transition-all text-xs font-black uppercase text-slate-600">
                        <Layers size={16} /> 2D View
                    </button>
                    <button className="flex items-center gap-2 px-8 py-3 bg-nexus-primary text-white rounded-2xl shadow-lg shadow-nexus-primary/20 hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase">
                        <Maximize2 size={16} fill="white" /> 3D Preview
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6">
                {/* Main Map Area */}
                <div className="flex-[3] nexus-card p-0 overflow-hidden relative bg-white/50 backdrop-blur-md border border-black/[0.03] flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f1f5f9_0%,_transparent_70%)] opacity-50" />
                    
                    {/* SVG Floor Plan Mockup */}
                    <div className="relative w-[800px] h-[600px] bg-white rounded-[40px] shadow-2xl border border-black/[0.05] overflow-hidden">
                         <svg width="100%" height="100%" viewBox="0 0 800 600" className="opacity-10">
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                            {/* Walls */}
                            <rect x="100" y="50" width="600" height="500" rx="10" fill="none" stroke="black" strokeWidth="4" />
                            <line x1="400" y1="50" x2="400" y2="550" stroke="black" strokeWidth="2" />
                            <line x1="100" y1="300" x2="700" y2="300" stroke="black" strokeWidth="2" />
                         </svg>

                         {/* Room Nodes */}
                         {rooms.map(room => (
                             <motion.div
                                key={room.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileHover={{ scale: 1.1, y: -5 }}
                                onClick={() => setSelectedRoom(room)}
                                style={{ left: room.x, top: room.y }}
                                className={`absolute cursor-pointer p-4 rounded-3xl backdrop-blur-3xl border border-white/50 shadow-premium transition-all ${
                                    selectedRoom?.id === room.id ? 'ring-2 ring-nexus-primary ring-offset-4' : ''
                                }`}
                             >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-slate-900 shadow-lg">
                                        <MapIcon className="text-white w-3 h-3" />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase text-slate-900 block">{room.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{room.devices} Devices</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-4">
                                    <div className="flex items-center gap-1">
                                        <Thermometer size={10} className="text-nexus-danger" />
                                        <span className="text-[10px] font-black text-slate-900">{room.temp}°C</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ShieldCheck size={10} className="text-nexus-success" />
                                        <span className="text-[10px] font-black text-nexus-success uppercase">Secure</span>
                                    </div>
                                </div>
                             </motion.div>
                         ))}
                    </div>

                    {/* Information Overlay */}
                    <div className="absolute bottom-6 left-6 flex gap-3">
                        <div className="px-4 py-2 bg-slate-900 rounded-full text-[9px] font-black uppercase text-white/50 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-nexus-success animate-pulse" />
                             Systems Nominal
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="flex-1 flex flex-col gap-6">
                    <motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="nexus-card flex-1 bg-white/80 border border-black/[0.03] relative overflow-hidden"
                    >
                        <div className="p-6 border-b border-black/[0.03]">
                            <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">Room Analytics</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            {selectedRoom ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Devices</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[1,2,3].map(i => (
                                                <div key={i} className="p-3 bg-slate-50 border border-black/[0.03] rounded-2xl flex items-center gap-3">
                                                    <Zap size={14} className="text-nexus-primary" />
                                                    <span className="text-[10px] font-black text-slate-900 uppercase">Light {i}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Environment</label>
                                        <div className="p-4 bg-gradient-to-br from-nexus-primary/5 to-transparent rounded-3xl border border-nexus-primary/10">
                                            <div className="flex justify-between items-end">
                                                <span className="text-4xl font-black text-slate-900 tracking-tighter">{selectedRoom.temp}°</span>
                                                <span className="text-[10px] font-black text-nexus-primary uppercase mb-1">Optimal</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-200 rounded-full mt-4 overflow-hidden">
                                                <div className="h-full bg-nexus-primary w-[70%]" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                                    <MapIcon size={48} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase text-slate-900">Select a room to<br/>view details</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 mt-auto">
                            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-black transition-all">
                                View Full Console
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

