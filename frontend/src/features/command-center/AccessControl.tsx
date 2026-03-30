import { Shield, KeyRound, UserCheck, ShieldAlert, Users } from 'lucide-react';

const users = [
  { id: 'usr_01', name: 'Alex M.', role: 'Admin', expires: 'Never', status: 'Active', pulse: 'bg-emerald-400', icon: <Shield className="w-3 h-3" /> },
  { id: 'usr_02', name: 'Guest_Sam', role: 'Temp Guest', expires: '2hr 15m', status: 'Active', pulse: 'bg-cyan-400', icon: <UserCheck className="w-3 h-3" /> },
  { id: 'usr_03', name: 'Dev Team Alpha', role: 'Group (6)', expires: '48hr', status: 'Pending', pulse: 'bg-amber-400', icon: <Users className="w-3 h-3" /> },
  { id: 'usr_04', name: 'Cleaner Staff', role: 'Restricted', expires: 'None', status: 'Offline', pulse: 'bg-slate-500', icon: <ShieldAlert className="w-3 h-3" /> },
];

export default function AccessControl() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-lg text-white tracking-wide">Identity & Access Management</h2>
        <button className="text-xs font-mono text-white bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 rounded-lg border border-purple-400/50 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all flex items-center gap-2 font-bold tracking-wider uppercase">
          <KeyRound className="w-3.5 h-3.5" />
          Grant Access
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase font-mono tracking-wider text-slate-500 bg-black/40">
              <th className="py-4 px-4 font-medium">Identity / Node ID</th>
              <th className="py-4 px-4 font-medium">Clearance Level</th>
              <th className="py-4 px-4 font-medium text-right">Status / TTL</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 border border-white/10 shadow-inner">
                      <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${user.pulse} border-2 border-slate-900 shadow-[0_0_5px_currentColor]`} />
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium group-hover:text-white transition-colors tracking-wide">{user.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{user.id}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900/80 border border-white/10 text-xs text-slate-300 font-mono shadow-inner">
                    <span className="text-slate-500">{user.icon}</span>
                    {user.role}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-xs font-semibold tracking-wide ${user.status === 'Active' ? 'text-emerald-400' : user.status === 'Pending' ? 'text-amber-400' : 'text-slate-500'}`}>
                      {user.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{user.expires}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
