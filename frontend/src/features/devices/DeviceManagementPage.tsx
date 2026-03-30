import React, { useState, useEffect } from 'react';
import { apiService } from '../../shared/services/api.service';
import { useAuth } from '../../shared/hooks/useAuth';
import { useToast } from '../../shared/components/Toast';

export const DeviceManagementPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const [devices, setDevices] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ id: '', name: '', type: 'esp8266', location: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadDevices(); }, []);

    const loadDevices = async () => {
        setLoading(true);
        try { const data = await apiService.getDevices(); setDevices(data); } catch (err: any) { showToast(err.message || 'Không tải được thiết bị', 'error'); }
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await apiService.createDevice(form); setShowForm(false); setForm({ id: '', name: '', type: 'esp8266', location: '' }); showToast('Thêm thiết bị thành công!', 'success'); loadDevices(); } catch (err: any) { showToast(err.message, 'error'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`Xóa thiết bị ${id}?`)) return;
        try { await apiService.deleteDevice(id); showToast('Đã xóa thiết bị', 'success'); loadDevices(); } catch (err: any) { showToast(err.message, 'error'); }
    };

    const inputStyle: React.CSSProperties = { width: '100%', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none' };

    return (
        <>
            <div className="app-header">
                <div className="header-left"><span className="page-title">📡 Quản lý thiết bị</span></div>
                <div className="header-right">
                    {isAuthenticated && <button onClick={() => setShowForm(!showForm)} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>+ Thêm thiết bị</button>}
                </div>
            </div>
            <div className="app-content">
                {showForm && (
                    <div className="glass-card animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
                        <div className="card-header"><div className="card-title">Thêm thiết bị mới</div></div>
                        <div className="card-body">
                            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Device ID</label><input style={inputStyle} value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} placeholder="esp8266-004" required /></div>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Tên</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Garden Controller" required /></div>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Loại</label><select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="esp8266">ESP8266</option><option value="esp32">ESP32</option></select></div>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Vị trí</label><input style={inputStyle} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Sân vườn" /></div>
                                <div style={{ display: 'flex', alignItems: 'end', gap: 'var(--space-2)' }}>
                                    <button type="submit" style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--color-success)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Tạo</button>
                                    <button type="button" onClick={() => setShowForm(false)} style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--bg-tertiary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Hủy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {['ID', 'Tên', 'Loại', 'Vị trí', 'Trạng thái', 'Relays', 'Sensors', ''].map(h => (
                                        <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map(d => (
                                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>{d.id}</td>
                                        <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{d.name}</td>
                                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}><span style={{ padding: 'var(--space-1) var(--space-2)', background: 'rgba(99,102,241,0.15)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)' }}>{d.type}</span></td>
                                        <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>{d.location || '—'}</td>
                                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}><span className={`status-badge ${d.status}`}><span className="status-dot" />{d.status}</span></td>
                                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{d.relays?.length || 0}</td>
                                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{d.sensors?.length || 0}</td>
                                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                            {isAuthenticated && <button onClick={() => handleDelete(d.id)} style={{ padding: 'var(--space-1) var(--space-3)', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger-light)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>Xóa</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};
