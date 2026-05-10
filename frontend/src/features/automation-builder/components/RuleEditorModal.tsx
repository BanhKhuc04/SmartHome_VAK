import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AutomationRule, RuleAction, RuleConditionGroup, RuleTriggerConfig, RuleTriggerType, ModuleDevice } from '../../../shared/types';
import { X, Plus, Trash2, Save, Play, AlertCircle } from 'lucide-react';

interface Props {
    rule: Partial<AutomationRule>;
    devices: ModuleDevice[];
    onSave: (rule: Partial<AutomationRule>) => Promise<void>;
    onClose: () => void;
}

export function RuleEditorModal({ rule: initialRule, devices, onSave, onClose }: Props) {
    const [rule, setRule] = useState<Partial<AutomationRule>>({
        name: '',
        description: '',
        enabled: true,
        trigger_type: 'manual',
        actions: [{ type: 'log', message: 'Rule triggered' }],
        cooldown_seconds: 300,
        ...initialRule
    });

    const [triggerConfigStr, setTriggerConfigStr] = useState(
        JSON.stringify(initialRule.trigger_config || (initialRule.trigger_type === 'manual' ? {} : { device_id: '*' }), null, 2)
    );
    const [conditionsStr, setConditionsStr] = useState(
        initialRule.conditions ? JSON.stringify(initialRule.conditions, null, 2) : ''
    );
    const [jsonError, setJsonError] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setJsonError(null);
        let parsedTrigger = {};
        let parsedConditions = null;

        try {
            if (rule.trigger_type !== 'manual') {
                parsedTrigger = JSON.parse(triggerConfigStr);
            }
        } catch (err: any) {
            setJsonError(`Invalid JSON in Trigger Configuration: ${err.message}`);
            return;
        }

        try {
            if (conditionsStr.trim()) {
                parsedConditions = JSON.parse(conditionsStr);
            }
        } catch (err: any) {
            setJsonError(`Invalid JSON in Conditions: ${err.message}`);
            return;
        }

        setIsSaving(true);
        await onSave({
            ...rule,
            trigger_config: parsedTrigger,
            conditions: parsedConditions
        });
        setIsSaving(false);
    };

    const addAction = () => {
        setRule(prev => ({
            ...prev,
            actions: [...(prev.actions || []), { type: 'log', message: 'New Action' }]
        }));
    };

    const removeAction = (idx: number) => {
        setRule(prev => ({
            ...prev,
            actions: (prev.actions || []).filter((_, i) => i !== idx)
        }));
    };

    const updateAction = (idx: number, action: RuleAction) => {
        setRule(prev => {
            const newActions = [...(prev.actions || [])];
            newActions[idx] = action;
            return { ...prev, actions: newActions };
        });
    };

    const applyTemplate = (type: string) => {
        if (type === 'temp_warn') {
            setRule({
                ...rule,
                name: 'Temperature Warning',
                trigger_type: 'telemetry',
                actions: [{ type: 'telegram', message: '⚠️ High Temp: {{temperature}}°C on {{device_id}}' }],
                cooldown_seconds: 300
            });
            setTriggerConfigStr(JSON.stringify({ device_id: '*', metric: 'temperature' }, null, 2));
            setConditionsStr(JSON.stringify({ all: [{ field: 'temperature', operator: '>=', value: 35 }] }, null, 2));
        } else if (type === 'schedule') {
            setRule({
                ...rule,
                name: 'Daily Pulse',
                trigger_type: 'schedule',
                actions: [{ type: 'device_command', device_id: devices[0]?.device_id || '', command: 'pulse' }],
                cooldown_seconds: 0
            });
            setTriggerConfigStr(JSON.stringify({ cron: '0 8 * * *' }, null, 2));
            setConditionsStr('');
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="nexus-card w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative z-[101]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="font-black text-lg text-white">{rule.id ? 'Edit Smart Rule' : 'Create Smart Rule'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
                    
                    {jsonError && (
                        <div className="nexus-inset border border-red-500/30 p-3 flex items-center gap-3 mb-4">
                            <AlertCircle size={18} className="text-red-400" />
                            <span className="text-sm text-red-200">{jsonError}</span>
                        </div>
                    )}

                    {!rule.id && (
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => applyTemplate('temp_warn')} className="btn-glass text-xs py-1 px-3">Use Temp Warning Template</button>
                            <button onClick={() => applyTemplate('schedule')} className="btn-glass text-xs py-1 px-3">Use Schedule Template</button>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Rule Name</span>
                            <input value={rule.name} onChange={e => setRule({...rule, name: e.target.value})} className="input-glass w-full" placeholder="e.g. Critical Temperature Alert" />
                        </label>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Trigger Type</span>
                                <select value={rule.trigger_type} onChange={e => setRule({...rule, trigger_type: e.target.value as RuleTriggerType})} className="input-glass w-full">
                                    <option value="telemetry">Telemetry Received</option>
                                    <option value="schedule">Cron Schedule</option>
                                    <option value="device_status">Device Status Change</option>
                                    <option value="mqtt_event">MQTT Event</option>
                                    <option value="manual">Manual Execution Only</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Cooldown (Seconds)</span>
                                <input type="number" value={rule.cooldown_seconds} onChange={e => setRule({...rule, cooldown_seconds: parseInt(e.target.value) || 0})} className="input-glass w-full" />
                            </label>
                        </div>

                        {/* Trigger Config JSON */}
                        {rule.trigger_type !== 'manual' && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Trigger Configuration (JSON)</span>
                                    <button onClick={() => {
                                        try { setTriggerConfigStr(JSON.stringify(JSON.parse(triggerConfigStr), null, 2)); setJsonError(null); } 
                                        catch (err: any) { setJsonError('Cannot format invalid JSON'); }
                                    }} className="text-[10px] text-blue-400 hover:underline">Format JSON</button>
                                </div>
                                <textarea 
                                    value={triggerConfigStr} 
                                    onChange={e => {
                                        setTriggerConfigStr(e.target.value);
                                        setJsonError(null);
                                    }}
                                    className="input-glass w-full font-mono text-xs" rows={4}
                                />
                            </div>
                        )}

                        {/* Conditions JSON */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Conditions (JSON - Optional)</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setConditionsStr('{\n  "all": []\n}')} className="text-[10px] text-blue-400 hover:underline">Empty {"{all:[]}"}</button>
                                    <button onClick={() => setConditionsStr('')} className="text-[10px] text-slate-400 hover:underline">Clear</button>
                                    <button onClick={() => {
                                        try { setConditionsStr(JSON.stringify(JSON.parse(conditionsStr), null, 2)); setJsonError(null); } 
                                        catch (err: any) { setJsonError('Cannot format invalid JSON'); }
                                    }} className="text-[10px] text-blue-400 hover:underline">Format JSON</button>
                                </div>
                            </div>
                            <textarea 
                                value={conditionsStr} 
                                onChange={e => {
                                    setConditionsStr(e.target.value);
                                    setJsonError(null);
                                }}
                                className="input-glass w-full font-mono text-xs" rows={4}
                                placeholder='{"all": [{"field": "temperature", "operator": ">=", "value": 35}]}'
                            />
                        </div>

                        {/* Actions Builder */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Actions</span>
                                <button onClick={addAction} className="btn-glass text-xs py-1 px-2 flex items-center gap-1"><Plus size={14}/> Add Action</button>
                            </div>
                            <div className="space-y-3">
                                {rule.actions?.map((action, idx) => (
                                    <div key={idx} className="nexus-inset p-3 flex items-start gap-3">
                                        <div className="flex-1 space-y-3">
                                            <select value={action.type} onChange={e => updateAction(idx, { ...action, type: e.target.value as any })} className="input-glass w-full text-sm">
                                                <option value="telegram">Send Telegram Message</option>
                                                <option value="device_command">Send Device Command</option>
                                                <option value="log">System Log</option>
                                            </select>

                                            {(action.type === 'telegram' || action.type === 'log') && (
                                                <input value={action.message || ''} onChange={e => updateAction(idx, { ...action, message: e.target.value })} className="input-glass w-full" placeholder="Message template..." />
                                            )}

                                            {action.type === 'device_command' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select value={action.device_id || ''} onChange={e => updateAction(idx, { ...action, device_id: e.target.value })} className="input-glass w-full text-sm">
                                                        <option value="">Select Device...</option>
                                                        {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.name}</option>)}
                                                    </select>
                                                    <select value={action.command || ''} onChange={e => updateAction(idx, { ...action, command: e.target.value as any })} className="input-glass w-full text-sm">
                                                        <option value="">Select Command...</option>
                                                        <option value="on">Turn ON</option>
                                                        <option value="off">Turn OFF</option>
                                                        <option value="pulse">Pulse</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => removeAction(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-black/20">
                    <button onClick={onClose} className="btn-glass px-4 py-2">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving || !rule.name} className="btn-premium px-6 py-2 flex items-center gap-2">
                        <Save size={16}/> Save Rule
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
