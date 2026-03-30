import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Layout, Plus, Pencil, Trash2, Home, 
    Bed, Utensils, Sofa, Bath, Laptop, Car
} from 'lucide-react';
import { apiService } from '../../shared/services/api.service';

interface Room {
    id: string;
    name: string;
    type: string;
    icon: string;
    deviceCount: number;
}

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                // For demo, we'll derive room data from devices if rooms API is not fully ready
                const devices = await apiService.getDevices();
                const roomsMap = new Map<string, Room>();
                
                devices.forEach(d => {
                    const roomId = d.room_id || 'unassigned';
                    const roomName = d.location || 'Unassigned';
                    
                    if (!roomsMap.has(roomId)) {
                        roomsMap.set(roomId, {
                            id: roomId,
                            name: roomName,
                            type: 'living_room', // Default
                            icon: 'sofa',
                            deviceCount: 0
                        });
                    }
                    roomsMap.get(roomId)!.deviceCount++;
                });

                setRooms(Array.from(roomsMap.values()));
            } catch (error) {
                console.error('Failed to fetch rooms:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'bed': return Bed;
            case 'utensils': return Utensils;
            case 'sofa': return Sofa;
            case 'bath': return Bath;
            case 'laptop': return Laptop;
            case 'car': return Car;
            default: return Home;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Room Architecture</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spatial Configuration Interface</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-nexus-primary text-white rounded-2xl shadow-premium hover:shadow-hover transition-all text-[10px] font-black uppercase">
                    <Plus size={14} /> Design New Room
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {rooms.map((room, idx) => {
                    const Icon = getIcon(room.icon);
                    return (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="nexus-card group hover:border-nexus-primary transition-all p-6"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-nexus-primary/5 transition-colors">
                                    <Icon className="text-slate-400 group-hover:text-nexus-primary transition-colors" size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                        <Pencil size={14} />
                                    </button>
                                    <button className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{room.name}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 rounded-full">
                                    {room.deviceCount} Active Nodes
                                </span>
                                <div className="h-4 w-px bg-slate-200" />
                                <span className="text-[10px] font-black text-nexus-success uppercase tracking-widest">
                                    Status Nominal
                                </span>
                            </div>

                            <div className="mt-8 grid grid-cols-3 gap-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-nexus-primary/20 w-1/3" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
