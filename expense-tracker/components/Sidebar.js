import { FaWallet, FaMoneyBillWave, FaHeart, FaSignOutAlt } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

export default function Sidebar({ user, activeTab, setActiveTab }) {
    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex fixed h-full z-10">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FaWallet className="text-emerald-400" /> FinTrack
                </h1>
                <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <SidebarItem
                    active={activeTab === 'expenses'}
                    onClick={() => setActiveTab('expenses')}
                    icon={<FaMoneyBillWave />}
                    label="Expenses"
                />
                <SidebarItem
                    active={activeTab === 'marriage'}
                    onClick={() => setActiveTab('marriage')}
                    icon={<FaHeart />}
                    label="Marriage Goal"
                />
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-slate-400 hover:text-white w-full px-4 py-2 transition">
                    <FaSignOutAlt /> Log Out
                </button>
            </div>
        </aside>
    );
}

function SidebarItem({ active, icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${active ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
        >
            <span className="text-lg">{icon}</span>
            <span className="font-medium">{label}</span>
        </button>
    );
}