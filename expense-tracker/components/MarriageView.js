"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FaHeart, FaExclamationTriangle, FaTrash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MarriageView({ user }) {
    const [savings, setSavings] = useState([]);
    const [connection, setConnection] = useState(null);
    const [newSaving, setNewSaving] = useState({ amount: '', note: '' });
    const [inviteEmail, setInviteEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-fetch on mount
    useEffect(() => {
        fetchMarriageData();
    }, [user]);

    async function fetchMarriageData() {
        // 1. Get Connection
        const { data: conn } = await supabase.from('connections')
            .select('*')
            .or(`sender_email.eq.${user.email},receiver_email.eq.${user.email}`);

        if (conn && conn.length > 0) setConnection(conn[0]);
        else setConnection(null);

        // 2. Get Savings
        const { data: save } = await supabase.from('marriage_savings').select('*').order('date', { ascending: false });
        if (save) setSavings(save);
    }

    // --- ACTIONS ---

    async function handleInvite() {
        if (!inviteEmail) return alert("Please enter an email.");
        if (inviteEmail === user.email) return alert("You cannot invite yourself.");

        setLoading(true);

        // 1. VALIDATION: Check if user actually exists in 'profiles'
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', inviteEmail)
            .single();

        if (!profile) {
            alert("❌ User not found! Ask them to sign up for FinTrack first.");
            setLoading(false);
            return;
        }

        // 2. Send Invite
        const { error } = await supabase.from('connections').insert({
            sender_email: user.email,
            receiver_email: inviteEmail,
            status: 'pending' // Default status
        });

        if (error) alert(error.message);
        else {
            alert("Invite sent!");
            fetchMarriageData();
        }
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

    // NEW: Delete Feature
    async function handleDelete(id) {
        if (!confirm("Are you sure you want to delete this entry?")) return;
        await supabase.from('marriage_savings').delete().eq('id', id);
        fetchMarriageData();
    }

    async function handleAccept() {
        await supabase.from('connections').update({ status: 'accepted' }).eq('id', connection.id);
        fetchMarriageData();
    }

    async function handleUnconnect() {
        if (!confirm("Are you sure? This will disconnect you from your partner.")) return;
        await supabase.from('connections').delete().eq('id', connection.id);
        fetchMarriageData();
    }

    // --- RENDER LOGIC ---

    // SCENARIO 1: NO CONNECTION (Invite Form)
    if (!connection) {
        return (
            <div className="max-w-2xl mx-auto mt-10 text-center space-y-6 animate-in fade-in">
                <FaHeart className="text-6xl text-rose-300 mx-auto" />
                <h2 className="text-3xl font-bold text-slate-800">Marriage Savings Goal</h2>
                <p className="text-slate-500">Link with your partner to start tracking a shared goal.</p>

                <div className="bg-white p-6 rounded-xl shadow-sm border max-w-md mx-auto">
                    <label className="block text-left text-sm font-bold text-slate-700 mb-2">Invite Partner</label>
                    <div className="flex gap-2">
                        <input
                            placeholder="Enter their email..."
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="border p-2 rounded-lg w-full outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <button
                            onClick={handleInvite}
                            disabled={loading}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-6 rounded-lg font-bold disabled:opacity-50"
                        >
                            {loading ? "..." : "Invite"}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-left">* They must be signed up first.</p>
                </div>
            </div>
        );
    }

    // SCENARIO 2: PENDING (Waiting Room)
    if (connection.status === 'pending') {
        const isSender = connection.sender_email === user.email;
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-yellow-50 border border-yellow-200 rounded-2xl text-center">
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    ⏳
                </div>
                <h3 className="text-xl font-bold text-yellow-900 mb-2">Invitation Pending</h3>
                <p className="text-yellow-800 mb-6">
                    {isSender
                        ? `Waiting for ${connection.receiver_email} to accept your request.`
                        : `${connection.sender_email} wants to start a joint savings goal with you!`}
                </p>

                {!isSender && (
                    <button onClick={handleAccept} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-bold shadow-md transition transform hover:scale-105">
                        ✅ Accept Invite
                    </button>
                )}

                <button onClick={handleUnconnect} className="text-sm text-yellow-700 hover:text-red-600 underline mt-4 block mx-auto">
                    {isSender ? "Cancel Invite" : "Decline"}
                </button>
            </div>
        );
    }

    // SCENARIO 3: ACCEPTED (Dashboard)
    // Logic: Everything below here only runs if status === 'accepted'
    const target = connection?.target_amount || 100000000;
    const current = savings.reduce((acc, s) => acc + s.amount, 0);
    const progress = Math.min((current / target) * 100, 100);

    // Group data for Bar Chart
    const chartData = savings.reduce((acc, curr) => {
        const month = curr.date.slice(0, 7);
        const person = curr.saver_email === user.email ? 'Me' : 'Partner';
        const existing = acc.find(i => i.month === month);
        if (existing) existing[person] = (existing[person] || 0) + curr.amount;
        else acc.push({ month, [person]: curr.amount });
        return acc;
    }, []).sort((a, b) => a.month.localeCompare(b.month));

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-in slide-in-from-bottom-4">

            {/* HEADER */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <FaHeart className="text-rose-500" /> Joint Savings
                    </h2>
                    <p className="text-slate-500">Shared with {connection.receiver_email === user.email ? connection.sender_email : connection.receiver_email}</p>
                </div>
                <button onClick={handleUnconnect} className="text-xs text-rose-400 hover:text-rose-600 border border-rose-200 px-3 py-1 rounded-full">
                    Unlink Partner
                </button>
            </div>

            {/* BIG PROGRESS CARD */}
            <div className="pro-card p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-semibold">Total Saved</p>
                        <h3 className="text-5xl font-bold tracking-tight">Rp {current.toLocaleString()}</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 text-sm mb-1">Target Goal</p>
                        <p className="text-xl font-medium text-emerald-400">Rp {target.toLocaleString()}</p>
                    </div>
                </div>
                <div className="w-full bg-slate-700/50 h-6 rounded-full overflow-hidden backdrop-blur-sm border border-slate-600">
                    <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-0 h-full w-2 bg-white/20"></div>
                    </div>
                </div>
                <p className="text-right text-xs text-slate-400 mt-2 font-mono">{progress.toFixed(1)}%</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ADD FORM */}
                <div className="pro-card p-6 lg:col-span-1 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-slate-700">Deposit Money</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                            <input type="number" placeholder="0" value={newSaving.amount} onChange={e => setNewSaving({ ...newSaving, amount: e.target.value })} className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Note</label>
                            <input type="text" placeholder="e.g. Bonus" value={newSaving.note} onChange={e => setNewSaving({ ...newSaving, note: e.target.value })} className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" />
                        </div>
                        <button onClick={handleAddSaving} className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-lg font-bold transition shadow-lg shadow-rose-200">
                            Add to Pot
                        </button>
                    </div>
                </div>

                {/* CHART */}
                <div className="pro-card p-6 lg:col-span-2 min-h-[350px]">
                    <h3 className="font-bold text-lg mb-4 text-slate-700">Contribution History</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000000}M`} tick={{ fill: '#64748b' }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="Me" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                                <Bar dataKey="Partner" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* HISTORY LIST (WITH DELETE) */}
            <div className="pro-card p-6">
                <h3 className="font-bold text-lg mb-4 text-slate-700">Detailed Log</h3>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">User</th>
                                <th className="p-3">Note</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {savings.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition">
                                    <td className="p-3 text-slate-500">{new Date(s.date).toLocaleDateString()}</td>
                                    <td className="p-3 font-medium">
                                        <span className={`px-2 py-1 rounded-full text-xs ${s.saver_email === user.email ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {s.saver_email === user.email ? 'Me' : 'Partner'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600">{s.notes || '-'}</td>
                                    <td className="p-3 text-right font-mono font-medium">Rp {s.amount.toLocaleString()}</td>
                                    <td className="p-3 text-right">
                                        {/* Only show delete if I created it */}
                                        {s.saver_email === user.email && (
                                            <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-rose-500 transition">
                                                <FaTrash />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {savings.length === 0 && <p className="p-6 text-center text-slate-400">No savings yet. Start today!</p>}
                </div>
            </div>
        </div>
    );
}