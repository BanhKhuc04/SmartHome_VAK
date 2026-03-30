import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, WifiOff, Settings, Trash2, Plus, 
  Search, Filter, Laptop, Cpu, Smartphone, 
  Power, Thermometer, Droplets, Zap
} from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { useAuth } from '../../shared/hooks/useAuth';
import { useToast } from '../../shared/components/Toast';

export default function DeviceManager() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ id: '', name: '', type: 'esp8266', location: '' });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDevices();
      setDevices(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load devices', 'error');
    }
    setLoading(false);
  };

  useWebSocket((msg) => {
    if (msg.type === 'device_update' || msg.type === 'relay_state' || msg.type === 'sensor_data') {
      const payload = msg.payload as any;
      setDevices(prev => prev.map(dev => {
        if (dev.id === payload.deviceId) {
          if (msg.type === 'relay_state') {
            return {
              ...dev,
              relays: dev.relays.map((r: any) => r.id === payload.relayId ? { ...r, state: payload.state } : r)
            };
          }
          if (msg.type === 'sensor_data') {
            return {
              ...dev,
              sensors: dev.sensors.map((s: any) => s.id === payload.sensorId ? { ...s, value: payload.value } : s)
            };
          }
          return { ...dev, ...payload };
        }
        return dev;
      }));
    }
  });

  const handleToggleRelay = async (deviceId: string, relayId: string, currentState: boolean) => {
    try {
      await apiService.toggleRelay(deviceId, { relayId, state: !currentState });
      // Optimistic update
      setDevices(prev => prev.map(dev => {
        if (dev.id === deviceId) {
          return {
            ...dev,
            relays: dev.relays.map((r: any) => r.id === relayId ? { ...r, state: !currentState } : r)
          };
        }
        return dev;
      }));
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 leading-none">
            Device <span className="text-nexus-primary">Inventory</span>
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Control and monitor your {devices.length} connected Nexus nodes.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search devices..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/50 backdrop-blur-md border border-white rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-nexus-primary/20 text-sm font-medium transition-all"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-3 bg-nexus-primary text-white rounded-2xl shadow-lg hover:shadow-nexus-primary/20 transition-all flex items-center gap-2 px-6"
          >
            <Plus size={20} />
            <span className="hidden sm:inline font-black uppercase text-[10px] tracking-widest">Add Node</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 nexus-card animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredDevices.map((device) => (
              <motion.div 
                key={device.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`nexus-card p-6 flex flex-col group ${device.status === 'offline' ? 'opacity-70 grayscale-[0.5]' : ''}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-[20px] shadow-sm border border-white ${device.status === 'online' ? 'bg-nexus-primary/10 text-nexus-primary' : 'bg-slate-100 text-slate-400'}`}>
                    {device.type === 'esp32' ? <Cpu size={24} /> : <Smartphone size={24} />}
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors">
                      <Settings size={16} />
                    </button>
                    {isAuthenticated && (
                      <button className="p-2 rounded-xl text-slate-400 hover:text-nexus-danger hover:bg-nexus-danger/5 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight truncate">{device.name}</h3>
                    {device.status === 'online' ? (
                      <Wifi size={14} className="text-nexus-success" />
                    ) : (
                      <WifiOff size={14} className="text-slate-400" />
                    )}
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{device.location} • {device.id}</p>
                </div>

                {/* Sensors Row */}
                <div className="mt-6 flex gap-3 overflow-x-auto scrollbar-none pb-2">
                  {device.sensors?.map((s: any) => (
                    <div key={s.id} className="flex flex-col items-center p-2 px-3 rounded-xl bg-black/[0.02] border border-black/[0.02] min-w-[70px]">
                      {s.type === 'temperature' && <Thermometer size={12} className="text-nexus-danger" />}
                      {s.type === 'humidity' && <Droplets size={12} className="text-nexus-primary" />}
                      {s.type === 'light' && <Zap size={12} className="text-nexus-warning" />}
                      <span className="text-xs font-black mt-1">{s.value}{s.unit}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{s.name}</span>
                    </div>
                  ))}
                </div>

                {/* Relays Controls */}
                <div className="mt-4 pt-4 border-t border-black/[0.03] space-y-2">
                  {device.relays?.map((r: any) => (
                    <div key={r.id} className="flex justify-between items-center bg-white/50 p-2 px-3 rounded-2xl border border-white">
                      <div className="flex items-center gap-2">
                         <Power size={12} className={r.state ? 'text-nexus-primary' : 'text-slate-300'} />
                         <span className="text-[11px] font-bold text-slate-700">{r.name}</span>
                      </div>
                      <button 
                        disabled={device.status === 'offline'}
                        onClick={() => handleToggleRelay(device.id, r.id, r.state)}
                        className={`w-10 h-6 rounded-full p-1 transition-all flex items-center ${r.state ? 'bg-nexus-primary justify-end' : 'bg-slate-200 justify-start'}`}
                      >
                         <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>
                  ))}
                  {(!device.relays || device.relays.length === 0) && (
                    <div className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest py-2">No Controls</div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Device Modal Placeholder */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
               onClick={() => setShowAddModal(false)}
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Configure Node</h2>
                <p className="text-slate-500 font-medium mb-8">Register a new Nexus node to your smart home ecosystem.</p>
                
                <div className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Node Identity</label>
                      <input type="text" placeholder="e.g. esp8266-lounge" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-black/[0.03] outline-none focus:ring-2 focus:ring-nexus-primary/20 transition-all font-bold" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Deployment Area</label>
                      <input type="text" placeholder="e.g. Living Room" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-black/[0.03] outline-none focus:ring-2 focus:ring-nexus-primary/20 transition-all font-bold" />
                   </div>
                </div>

                <div className="flex gap-4 mt-10">
                   <button className="flex-1 py-4 rounded-2xl bg-black text-white font-black uppercase text-[10px] tracking-widest shadow-xl hover:shadow-black/20 transition-all">Provision Node</button>
                   <button onClick={() => setShowAddModal(false)} className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
