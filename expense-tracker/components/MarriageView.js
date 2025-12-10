"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FaHeart, FaExclamationTriangle, FaTrash, FaCog, FaCalendarAlt, FaBullseye } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MarriageView({ user }) {
    const [savings, setSavings] = useState([]);
    const [connection, setConnection] = useState(null);
    const [newSaving, setNewSaving] = useState({ amount: '', note: '' });

    // INVITE STATE
    const [inviteEmail, setInviteEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // GOAL SETTINGS STATE
    const [showSettings, setShowSettings] = useState(false);
    const [targets, setTargets] = useState({ total: 100000000, monthly: 5000000 });

    // Auto-fetch on mount
    useEffect(() => {
        fetchMarriageData();
    }, [user]);

    async function fetchMarriageData() {
        // 1. Get Connection
        const { data: conn } = await supabase.from('connections')
            .select('*')
            .or(`sender_email.eq.${user.email},receiver_email.eq.${user.email}`);

        if (conn && conn.length > 0) {
            setConnection(conn[0]);
            // Load saved targets from DB, or fallback to defaults
            setTargets({
                total: conn[0].target_amount || 100000000,
                monthly: conn[0].monthly_goal || 5000000
            });
        } else {
            setConnection(null);
        }

        // 2. Get Savings
        const { data: save } = await supabase.from('marriage_savings').select('*').order('date', { ascending: false });
        if (save) setSavings(save);
    }

    // --- ACTIONS ---

    async function handleUpdateTargets() {
        if (!connection) return;

        // Update the shared connection table
        const { error } = await supabase.from('connections').update({
            target_amount: parseFloat(targets.total),
            monthly_goal: parseFloat(targets.monthly)
        }).eq('id', connection.id);

        if (error) alert(error.message);
        else {
            alert("✅ Joint goals updated!");
            setShowSettings(false);
            fetchMarriageData();
        }
    }

    async function handleInvite() {
        if (!inviteEmail) return alert("Please enter an email.");
        if (inviteEmail === user.email) return alert("You cannot invite yourself.");
        setLoading(true);

        // 1. VALIDATION
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', inviteEmail).single();
        if (!profile) {
            alert("❌ User not found! Ask them to sign up first.");
            setLoading(false);
            return;
        }

        // 2. Send Invite
        const { error } = await supabase.from('connections').insert({
            sender_email: user.email, receiver_email: inviteEmail, status: 'pending'
        });

        if (error) alert(error.message);
        else { alert("Invite sent!"); fetchMarriageData(); }
        setLoading(false);
    }

    async function handleAddSaving() {
        if (!newSaving.amount) return alert("Enter an amount");
        await supabase.from('marriage_savings').insert({
            date: new Date().toISOString(),
            amount: parseFloat(newSaving.amount),
            notes: newSaving.note,
            user_id: user.id,
            saver_email: user.email
        });
        setNewSaving({ amount: '', note: '' });
        fetchMarriageData();
    }

    async function handleDelete(id) {
        if (!confirm("Delete this entry?")) return;
        await supabase.from('marriage_savings').delete().eq('id', id);
        fetchMarriageData();
    }

    async function handleAccept() {
        await supabase.from('connections').update({ status: 'accepted' }).eq('id', connection.id);
        fetchMarriageData();
    }

    async function handleUnconnect() {
        if (!confirm("Disconnect partner?")) return;
        await supabase.from('connections').delete().eq('id', connection.id);
        fetchMarriageData();
    }

    // --- RENDER LOGIC ---

    // SCENARIO 1: NO CONNECTION
    if (!connection) return (
        <div className="max-w-2xl mx-auto mt-10 text-center space-y-6">
            <FaHeart className="text-6xl text-rose-300 mx-auto" />
            <h2 className="text-3xl font-bold text-slate-800">Marriage Savings Goal</h2>
            <p className="text-slate-500">Link with your partner to start tracking.</p>
            <div className="bg-white p-6 rounded-xl shadow-sm border max-w-md mx-auto flex gap-2">
                <input placeholder="Partner Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="border p-2 rounded-lg w-full" />
                <button onClick={handleInvite} disabled={loading} className="bg-rose-500 text-white px-6 rounded-lg font-bold">{loading ? "..." : "Invite"}</button>
            </div>
        </div>
    );

    // SCENARIO 2: PENDING
    if (connection.status === 'pending') {
        const isSender = connection.sender_email === user.email;
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-yellow-50 border border-yellow-200 rounded-2xl text-center">
                <h3 className="text-xl font-bold text-yellow-900 mb-2">Invitation Pending</h3>
                <p className="text-yellow-800 mb-6">{isSender ? `Waiting for ${connection.receiver_email}...` : `${connection.sender_email} invited you!`}</p>
                {!isSender && <button onClick={handleAccept} className="bg-yellow-500 text-white w-full py-3 rounded-xl font-bold">Accept Invite</button>}
                <button onClick={handleUnconnect} className="text-sm text-yellow-700 underline mt-4">{isSender ? "Cancel" : "Decline"}</button>
            </div>
        );
    }

    // SCENARIO 3: DASHBOARD
    const current = savings.reduce((acc, s) => acc + s.amount, 0);
    const remaining = Math.max(0, targets.total - current);
    const progress = Math.min((current / targets.total) * 100, 100);

    // Estimation Calculation
    const monthsLeft = targets.monthly > 0 ? Math.ceil(remaining / targets.monthly) : 0;
    const estimatedDate = new Date();
    estimatedDate.setMonth(estimatedDate.getMonth() + monthsLeft);

    const chartData = savings.reduce((acc, curr) => {
        const month = curr.date.slice(0, 7);
        const person = curr.saver_email === user.email ? 'Me' : 'Partner';
        const existing = acc.find(i => i.month === month);
        if (existing) existing[person] = (existing[person] || 0) + curr.amount;
        else acc.push({ month, [person]: curr.amount });
        return acc;
    }, []).sort((a, b) => a.month.localeCompare(b.month));

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">

            {/* HEADER */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><FaHeart className="text-rose-500" /> Joint Savings</h2>
                    <p className="text-slate-500">Shared with {connection.receiver_email === user.email ? connection.sender_email : connection.receiver_email}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(!showSettings)} className="text-sm flex items-center gap-2 bg-white border px-3 py-1 rounded-full text-slate-600 hover:bg-slate-50 shadow-sm">
                        <FaCog /> Edit Goals
                    </button>
                    <button onClick={handleUnconnect} className="text-xs text-rose-400 border border-rose-200 px-3 py-1 rounded-full hover:bg-rose-50">Unlink</button>
                </div>
            </div>

            {/* GOAL SETTINGS PANEL (Collapsible) */}
            {showSettings && (
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-lg animate-in slide-in-from-top-2">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">🎯 Goal Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Total Target Amount</label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-2.5 text-slate-400">Rp</span>
                                <input type="number" value={targets.total} onChange={(e) => setTargets({ ...targets, total: e.target.value })} className="w-full border p-2 pl-10 rounded-lg font-mono" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Monthly Savings Target</label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-2.5 text-slate-400">Rp</span>
                                <input type="number" value={targets.monthly} onChange={(e) => setTargets({ ...targets, monthly: e.target.value })} className="w-full border p-2 pl-10 rounded-lg font-mono" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleUpdateTargets} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800">Save Changes</button>
                    </div>
                </div>
            )}

            {/* BIG PROGRESS CARD */}
            <div className="pro-card p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                    <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-semibold">Total Saved</p>
                    <h3 className="text-5xl font-bold tracking-tight mb-2">Rp {current.toLocaleString()}</h3>

                    <div className="w-full bg-slate-700/50 h-3 rounded-full overflow-hidden backdrop-blur-sm border border-slate-600 mb-2">
                        <div className="bg-emerald-400 h-full transition-all duration-1000 relative" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>0%</span>
                        <span>Goal: Rp {targets.total.toLocaleString()}</span>
                    </div>
                </div>

                {/* ESTIMATION BOX */}
                <div className="bg-white/10 p-5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <h4 className="text-emerald-400 font-bold flex items-center gap-2 mb-3"><FaBullseye /> Projection</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                            <span className="text-slate-300 text-sm">Target/Month</span>
                            <span className="font-mono">Rp {targets.monthly.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                            <span className="text-slate-300 text-sm">Remaining</span>
                            <span className="font-mono text-rose-300">Rp {remaining.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-slate-300 text-sm flex items-center gap-2"><FaCalendarAlt /> Time Left</span>
                            <span className="font-bold text-xl text-emerald-300">{monthsLeft} Months</span>
                        </div>
                        <p className="text-xs text-slate-500 text-right">Est. Finish: {estimatedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ADD SAVINGS */}
                <div className="pro-card p-6 lg:col-span-1 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-slate-700">Deposit Money</h3>
                    <div className="space-y-4">
                        <input type="number" placeholder="Amount" value={newSaving.amount} onChange={e => setNewSaving({ ...newSaving, amount: e.target.value })} className="w-full border rounded-lg p-2.5" />
                        <input type="text" placeholder="Note (Optional)" value={newSaving.note} onChange={e => setNewSaving({ ...newSaving, note: e.target.value })} className="w-full border rounded-lg p-2.5" />
                        <button onClick={handleAddSaving} className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-rose-200">Add to Pot</button>
                    </div>
                </div>

                {/* CHART */}
                <div className="pro-card p-6 lg:col-span-2 min-h-[350px]">
                    <h3 className="font-bold text-lg mb-4 text-slate-700">History</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                            <Legend />
                            <Bar dataKey="Me" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Partner" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* DETAILED LIST */}
            <div className="pro-card p-6">
                <h3 className="font-bold text-lg mb-4 text-slate-700">Transaction Log</h3>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold">
                        <tr><th className="p-3">Date</th><th className="p-3">User</th><th className="p-3">Note</th><th className="p-3 text-right">Amount</th><th className="p-3"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {savings.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 transition">
                                <td className="p-3 text-slate-500">{new Date(s.date).toLocaleDateString()}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${s.saver_email === user.email ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>{s.saver_email === user.email ? 'Me' : 'Partner'}</span></td>
                                <td className="p-3 text-slate-600">{s.notes || '-'}</td>
                                <td className="p-3 text-right font-mono font-medium">Rp {s.amount.toLocaleString()}</td>
                                <td className="p-3 text-right">{s.saver_email === user.email && <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-rose-500"><FaTrash /></button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}