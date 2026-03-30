import React, { useState, useEffect } from 'react';
import { apiService } from '../../shared/services/api.service';
import { useAuth } from '../../shared/hooks/useAuth';
import { useToast } from '../../shared/components/Toast';

export const SchedulesPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const [schedules, setSchedules] = useState<any[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', deviceId: '', relayId: '', action: 'on', cronExpression: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [s, d] = await Promise.all([apiService.getSchedules(), apiService.getDevices()]);
        setSchedules(s); setDevices(d);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await apiService.createSchedule(form); setShowForm(false); setForm({ name: '', deviceId: '', relayId: '', action: 'on', cronExpression: '' }); showToast('Tạo lịch thành công!', 'success'); loadData(); } catch (err: any) { showToast(err.message, 'error'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Xóa lịch này?')) return;
        try { await apiService.deleteSchedule(id); showToast('Đã xóa lịch', 'success'); loadData(); } catch (err: any) { showToast(err.message, 'error'); }
    };

    const selectedDevice = devices.find(d => d.id === form.deviceId);
    const inputStyle: React.CSSProperties = { width: '100%', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none' };

    const cronPresets = [
        { label: 'Mỗi phút', value: '* * * * *' },
        { label: 'Mỗi giờ', value: '0 * * * *' },
        { label: '6:00 sáng', value: '0 6 * * *' },
        { label: '18:00 chiều', value: '0 18 * * *' },
        { label: '22:00 tối', value: '0 22 * * *' },
        { label: 'Thứ 2-6 7:00', value: '0 7 * * 1-5' },
    ];

    return (
        <>
            <div className="app-header">
                <div className="header-left"><span className="page-title">📅 Lịch hẹn giờ</span></div>
                <div className="header-right">
                    {isAuthenticated && <button onClick={() => setShowForm(!showForm)} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>+ Tạo lịch</button>}
                </div>
            </div>
            <div className="app-content">
                {showForm && (
                    <div className="glass-card animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
                        <div className="card-header"><div className="card-title">Tạo lịch hẹn giờ</div></div>
                        <div className="card-body">
                            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Tên</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Bật đèn sáng" required /></div>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Thiết bị</label><select style={inputStyle} value={form.deviceId} onChange={e => setForm({ ...form, deviceId: e.target.value, relayId: '' })} required><option value="">Chọn thiết bị</option>{devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Relay</label><select style={inputStyle} value={form.relayId} onChange={e => setForm({ ...form, relayId: e.target.value })} required><option value="">Chọn relay</option>{selectedDevice?.relays?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Hành động</label><select style={inputStyle} value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}><option value="on">Bật</option><option value="off">Tắt</option><option value="toggle">Đảo trạng thái</option></select></div>
                                <div>
                                    <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Cron Expression</label>
                                    <input style={inputStyle} value={form.cronExpression} onChange={e => setForm({ ...form, cronExpression: e.target.value })} placeholder="0 6 * * *" required />
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                                        {cronPresets.map(p => <button key={p.value} type="button" onClick={() => setForm({ ...form, cronExpression: p.value })} style={{ padding: '2px 8px', background: form.cronExpression === p.value ? 'var(--color-primary)' : 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px' }}>{p.label}</button>)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'end', gap: 'var(--space-2)' }}>
                                    <button type="submit" style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--color-success)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Tạo</button>
                                    <button type="button" onClick={() => setShowForm(false)} style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--bg-tertiary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Hủy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="devices-grid">
                    {schedules.map((s: any) => (
                        <div key={s.id} className="glass-card animate-fade-in">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">{s.name}</div>
                                    <div className="card-subtitle">{s.device_name || s.device_id} → {s.relay_id}</div>
                                </div>
                                <span style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 600, background: s.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: s.enabled ? 'var(--color-success-light)' : 'var(--color-danger-light)' }}>{s.enabled ? 'Hoạt động' : 'Tắt'}</span>
                            </div>
                            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>⏰ <code style={{ background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>{s.cron_expression}</code></div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>Hành động: <strong>{s.action === 'on' ? 'Bật' : s.action === 'off' ? 'Tắt' : 'Đảo'}</strong></div>
                                    {s.last_run && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Chạy lần cuối: {new Date(s.last_run).toLocaleString('vi-VN')}</div>}
                                </div>
                                {isAuthenticated && <button onClick={() => handleDelete(s.id)} style={{ padding: 'var(--space-2) var(--space-3)', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-light)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>🗑️ Xóa</button>}
                            </div>
                        </div>
                    ))}
                    {schedules.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Chưa có lịch hẹn giờ nào. Nhấn "+ Tạo lịch" để bắt đầu.</div>}
                </div>
            </div>
        </>
    );
};
