import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  NodeProps,
  Handle,
  Position,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Clock, Power, ShieldAlert, Cpu, Share2, Sparkles, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../shared/services/api.service';

// --- Custom Node Components with Nexus OS Styling ---

interface NexusNodeData {
  label: string;
  type?: string;
  value?: string;
  sensorId?: string;
  operator?: string;
  deviceId?: string;
  command?: string;
  active?: boolean;
  onChange?: (nodeId: string, data: any) => void;
}

const NodeWrapper = ({ children, title, icon: Icon, colorClass, id, isActive }: { children: React.ReactNode, title: string, icon: any, colorClass: string, id: string, isActive?: boolean }) => (
  <motion.div 
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className={`nexus-card p-0 overflow-hidden w-72 bg-white/80 backdrop-blur-2xl border border-black/[0.03] shadow-premium relative ${isActive ? 'ring-2 ring-nexus-primary ring-offset-4 ring-offset-[#F6F7FB]' : ''}`}
  >
    <div className={`p-4 flex items-center gap-3 border-b border-black/[0.03] bg-gradient-to-r ${colorClass} bg-opacity-5`}>
       <div className={`p-2 rounded-xl bg-white shadow-sm`}>
          <Icon className="w-4 h-4 text-slate-900" />
       </div>
       <div className="flex-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Nexus Module {id}</p>
       </div>
       {isActive && (
         <div className="w-2 h-2 rounded-full bg-nexus-primary animate-pulse shadow-[0_0_8px_#3B82F6]" />
       )}
    </div>
    <div className="p-5 space-y-4">
      {children}
    </div>
  </motion.div>
);

const TriggerNode = ({ data, id }: NodeProps) => {
  const nexusData = data as unknown as NexusNodeData;
  return (
    <NodeWrapper title={nexusData.label} icon={Clock} colorClass="from-nexus-warning/10 to-transparent" id={id}>
      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Trigger Event</label>
          <select 
            value={nexusData.type || 'time'} 
            onChange={(e) => nexusData.onChange?.(id, { ...nexusData, type: e.target.value })}
            className="w-full bg-slate-50 border border-black/[0.03] rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-nexus-primary/5 transition-all cursor-pointer"
          >
            <option value="time">Time of Day</option>
            <option value="sensor">Sensor Threshold</option>
            <option value="voice">Voice Command</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Parameter</label>
          <input 
            type="text"
            value={nexusData.value || '22:00'}
            onChange={(e) => nexusData.onChange?.(id, { ...nexusData, value: e.target.value })}
            className="w-full bg-slate-50 border border-black/[0.03] rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-nexus-primary/5 transition-all"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-4 !h-4 !bg-nexus-warning !border-4 !border-white shadow-sm hover:scale-125 transition-transform" />
    </NodeWrapper>
  );
};

const ConditionNode = ({ data, id }: NodeProps) => {
  const nexusData = data as unknown as NexusNodeData;
  return (
    <NodeWrapper title={nexusData.label} icon={Share2} colorClass="from-nexus-secondary/10 to-transparent" id={id}>
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-nexus-slate-200 !border-4 !border-white shadow-sm" />
      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Condition</label>
          <select 
            value={nexusData.sensorId || 'motion_living'}
            onChange={(e) => nexusData.onChange?.(id, { ...nexusData, sensorId: e.target.value })}
            className="w-full bg-slate-50 border border-black/[0.03] rounded-xl px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="motion_living">Motion Sensor</option>
            <option value="temp_master">Master Temperature</option>
          </select>
        </div>
        <div className="flex gap-2">
           <select 
            value={nexusData.operator || 'eq'}
            onChange={(e) => nexusData.onChange?.(id, { ...nexusData, operator: e.target.value })}
            className="flex-1 bg-slate-50 border border-black/[0.03] rounded-xl px-2 py-2 text-[10px] font-bold outline-none"
          >
            <option value="eq">Equal</option>
            <option value="gt">Greater</option>
            <option value="lt">Less</option>
          </select>
          <input 
            type="text"
            value={nexusData.value || 'true'}
            onChange={(e) => nexusData.onChange?.(id, { ...nexusData, value: e.target.value })}
            className="w-16 bg-slate-50 border border-black/[0.03] rounded-xl px-2 py-2 text-xs font-bold outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-6 absolute -right-2 top-1/2 -translate-y-1/2">
        <Handle type="source" position={Position.Right} id="true" className="!static !w-4 !h-4 !bg-nexus-success !border-4 !border-white shadow-sm translate-x-2" />
        <Handle type="source" position={Position.Right} id="false" className="!static !w-4 !h-4 !bg-nexus-danger !border-4 !border-white shadow-sm translate-x-2" />
      </div>
    </NodeWrapper>
  );
};

const ActionNode = ({ data, id }: NodeProps) => {
  const nexusData = data as unknown as NexusNodeData;
  return (
    <NodeWrapper title={nexusData.label} icon={Power} colorClass="from-nexus-primary/10 to-transparent" id={id} isActive={nexusData.active}>
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-nexus-slate-200 !border-4 !border-white shadow-sm" />
      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Target Device</label>
          <select 
            value={nexusData.deviceId || 'living_lights'}
            onChange={(e) => nexusData.onChange?.(id, { ...nexusData, deviceId: e.target.value })}
            className="w-full bg-slate-50 border border-black/[0.03] rounded-xl px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="living_lights">Living Room Lights</option>
            <option value="security_system">Security Main</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Action</label>
          <div className="flex p-1 bg-slate-50 border border-black/[0.02] rounded-xl">
            {['ON', 'OFF'].map(opt => (
              <button 
                key={opt}
                onClick={() => nexusData.onChange?.(id, { ...nexusData, command: opt })}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  (nexusData.command || 'ON') === opt ? 'bg-white shadow-sm text-nexus-primary' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </NodeWrapper>
  );
};

const nodeTypes = {
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
};

const initialNodes = [
  { id: '1', type: 'triggerNode', position: { x: 50, y: 200 }, data: { label: 'Night Arrival', type: 'time', value: '18:00' } },
  { id: '2', type: 'conditionNode', position: { x: 450, y: 150 }, data: { label: 'Home Presence', sensorId: 'motion_living', operator: 'eq', value: 'true' } },
  { id: '3', type: 'actionNode', position: { x: 850, y: 50 }, data: { label: 'Ambient Light', deviceId: 'living_lights', command: 'ON', active: true } },
  { id: '4', type: 'actionNode', position: { x: 850, y: 250 }, data: { label: 'Entry Security', deviceId: 'security_system', command: 'OFF' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 3 } },
  { id: 'e2-3', source: '2', target: '3', sourceHandle: 'true', animated: true, style: { stroke: '#22C55E', strokeWidth: 3 } },
  { id: 'e2-4', source: '2', target: '4', sourceHandle: 'false', animated: true, style: { stroke: '#EF4444', strokeWidth: 3 } },
];

export default function AutomationBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3B82F6', strokeWidth: 3 } } as Edge, eds)),
    [setEdges],
  );

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: newData } : node));
  }, [setNodes]);

  const onDeploy = useCallback(async () => {
    const triggerNode = nodes.find(n => n.type === 'triggerNode');
    const actionNodes = nodes.filter(n => n.type === 'actionNode');

    if (!triggerNode || actionNodes.length === 0) {
      alert('A valid automation must have at least one Trigger and one Action.');
      return;
    }

    const triggerData = triggerNode.data;
    const conditionNodes = nodes.filter(n => n.type === 'conditionNode');
    
    const rule = {
      id: `rule-${Date.now()}`,
      name: triggerData.label || 'New Automation',
      trigger: {
        type: triggerData.type || 'time',
        value: triggerData.value,
        sensorId: triggerData.sensorId,
        deviceId: triggerData.deviceId,
        operator: triggerData.operator
      },
      conditions: conditionNodes.map(cn => ({
        type: 'sensor',
        sensorId: cn.data.sensorId,
        deviceId: cn.data.deviceId || 'esp8266-001',
        operator: cn.data.operator,
        value: cn.data.value
      })),
      actions: actionNodes.map(an => ({
        type: 'device',
        deviceId: an.data.deviceId,
        command: { state: an.data.command === 'ON' }
      })),
      enabled: true
    };

    try {
      await apiService.saveAutomationRule(rule);
      alert('Automation deployed successfully to Nexus core! 🚀');
    } catch (err: any) {
      alert(`Deployment failed: ${err.message}`);
    }
  }, [nodes, edges]);

  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: { ...node.data, onChange: updateNodeData }
  }));

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Automation Builder</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visual Logic Engine v4.2</p>
         </div>
         <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-black/[0.03] rounded-2xl shadow-soft hover:shadow-premium transition-all text-xs font-black uppercase text-slate-600">
               <Plus size={16} /> New Node
            </button>
            <button 
              onClick={onDeploy}
              className="flex items-center gap-2 px-8 py-3 bg-nexus-primary text-white rounded-2xl shadow-lg shadow-nexus-primary/20 hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase"
            >
               <Play size={16} fill="white" /> Deploy Logic
            </button>
         </div>
      </div>

      <div className="flex-1 nexus-card p-0 overflow-hidden relative border border-black/[0.03] bg-white/50 backdrop-blur-md">
        <ReactFlow
          nodes={nodesWithCallbacks as any[]}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="nexus-flow"
        >
          <Background color="#000" variant={BackgroundVariant.Dots} gap={32} size={1} className="opacity-[0.03]" />
          <Controls className="!bg-white !border-black/[0.05] !shadow-soft !rounded-xl overflow-hidden" />
          <MiniMap 
            nodeBorderRadius={12}
            nodeStrokeWidth={3}
            maskColor="rgba(246, 247, 251, 0.7)"
            style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.03)' }}
          />
        </ReactFlow>

        <div className="absolute top-6 left-6 w-56 flex flex-col gap-3 pointer-events-none">
           <div className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-black/[0.03] rounded-3xl p-5 shadow-premium">
              <div className="flex items-center gap-2 mb-4">
                 <Sparkles className="text-nexus-primary" size={16} />
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Module Palette</h4>
              </div>
              <div className="space-y-2">
                 {[
                   { icon: Clock, label: 'Trigger', color: 'bg-nexus-warning/10 text-nexus-warning' },
                   { icon: Share2, label: 'Condition', color: 'bg-nexus-secondary/10 text-nexus-secondary' },
                   { icon: Power, label: 'Action', color: 'bg-nexus-primary/10 text-nexus-primary' },
                   { icon: ShieldAlert, label: 'Critical', color: 'bg-nexus-danger/10 text-nexus-danger' }
                 ].map(item => (
                   <div key={item.label} className={`p-3 rounded-2xl border border-black/[0.02] flex items-center gap-3 cursor-grab hover:bg-slate-50 transition-all ${item.color}`}>
                      <item.icon size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <AnimatePresence>
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50 overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-nexus-primary/20 to-nexus-secondary/20" />
             <div className="relative flex items-center gap-6">
                <div className="flex items-center gap-2 pr-6 border-r border-white/10">
                   <div className="w-2 h-2 rounded-full bg-nexus-success animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-white tracking-widest">Logic: Optimal</span>
                </div>
                <button className="text-white/60 hover:text-white transition-colors"><Trash2 size={16} /></button>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">{nodes.length} Nodes • {edges.length} Connections</span>
             </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
