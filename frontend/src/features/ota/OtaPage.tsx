import React, { useState, useEffect } from 'react';
import { apiService } from '../../shared/services/api.service';
import { useAuth } from '../../shared/hooks/useAuth';
import { useToast } from '../../shared/components/Toast';

export const OtaPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const [firmwares, setFirmwares] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ version: '', deviceType: 'esp8266', description: '' });

    useEffect(() => { loadFirmwares(); }, []);

    const loadFirmwares = async () => {
        try { const data = await apiService.getFirmwares(); setFirmwares(data); } catch (err: any) { showToast(err.message || 'Không tải được firmware', 'error'); }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await apiService.uploadFirmware(form); setShowForm(false); setForm({ version: '', deviceType: 'esp8266', description: '' }); showToast('Upload firmware thành công!', 'success'); loadFirmwares(); } catch (err: any) { showToast(err.message, 'error'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Xóa firmware này?')) return;
        try { await apiService.deleteFirmware(id); showToast('Đã xóa firmware', 'success'); loadFirmwares(); } catch (err: any) { showToast(err.message, 'error'); }
    };

    const inputStyle: React.CSSProperties = { width: '100%', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none' };

    return (
        <>
            <div className="app-header">
                <div className="header-left"><span className="page-title">🔄 OTA Updates</span></div>
                <div className="header-right">
                    {isAuthenticated && <button onClick={() => setShowForm(!showForm)} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>+ Upload Firmware</button>}
                </div>
            </div>
            <div className="app-content">
                {showForm && (
                    <div className="glass-card animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
                        <div className="card-header"><div className="card-title">Upload Firmware</div></div>
                        <div className="card-body">
                            <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Version</label><input style={inputStyle} value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="1.2.0" required /></div>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Device Type</label><select style={inputStyle} value={form.deviceType} onChange={e => setForm({ ...form, deviceType: e.target.value })}><option value="esp8266">ESP8266</option><option value="esp32">ESP32</option></select></div>
                                <div><label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Mô tả</label><input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Fix wifi reconnect..." /></div>
                                <div style={{ display: 'flex', alignItems: 'end', gap: 'var(--space-2)' }}>
                                    <button type="submit" style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--color-success)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Upload</button>
                                    <button type="button" onClick={() => setShowForm(false)} style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--bg-tertiary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Hủy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="devices-grid">
                    {firmwares.map((fw: any) => (
                        <div key={fw.id} className="glass-card animate-fade-in">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">📦 v{fw.version}</div>
                                    <div className="card-subtitle">{fw.device_type} • {fw.filename}</div>
                                </div>
                            </div>
                            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    {fw.description && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>{fw.description}</div>}
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Uploaded: {new Date(fw.created_at).toLocaleString('vi-VN')}</div>
                                    {fw.file_size > 0 && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Size: {(fw.file_size / 1024).toFixed(1)} KB</div>}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    {isAuthenticated && <button onClick={() => handleDelete(fw.id)} style={{ padding: 'var(--space-2) var(--space-3)', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-light)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>🗑️</button>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {firmwares.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Chưa có firmware nào. Nhấn "+ Upload Firmware" để bắt đầu.</div>}
                </div>
            </div>
        </>
    );
};
