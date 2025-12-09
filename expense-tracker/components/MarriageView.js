"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FaHeart, FaExclamationTriangle } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MarriageView({ user }) {
    const [savings, setSavings] = useState([]);
    const [connection, setConnection] = useState(null);
    const [newSaving, setNewSaving] = useState({ amount: '', note: '' });
    const [inviteEmail, setInviteEmail] = useState('');

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

    async function handleAddSaving() {
        if (!newSaving.amount) return;
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

    async function handleInvite() {
        await supabase.from('connections').insert({ sender_email: user.email, receiver_email: inviteEmail });
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

    // --- LOGIC: RENDER BASED ON STATUS ---

    // 1. No Connection
    if (!connection) {
        return (
            <div className="max-w-2xl mx-auto mt-10 text-center space-y-6">
                <FaHeart className="text-5xl text-rose-300 mx-auto" />
                <h2 className="text-2xl font-bold">Marriage Savings Goal</h2>
                <p className="text-slate-500">Link with your partner to start tracking a shared goal.</p>
                <div className="flex gap-2 max-w-sm mx-auto">
                    <input
                        placeholder="Partner's Email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="border p-2 rounded w-full"
                    />
                    <button onClick={handleInvite} className="bg-rose-500 text-white px-4 rounded font-bold">Invite</button>
                </div>
            </div>
        );
    }

    // 2. Pending
    if (connection.status === 'pending') {
        const isSender = connection.sender_email === user.email;
        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <h3 className="font-bold text-yellow-800 mb-2">Invite Pending</h3>
                <p className="text-yellow-700 mb-4">
                    {isSender ? `Waiting for ${connection.receiver_email} to accept.` : `${connection.sender_email} invited you!`}
                </p>
                {!isSender && <button onClick={handleAccept} className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold">Accept Invite</button>}
                {isSender && <button onClick={handleUnconnect} className="text-sm text-yellow-600 underline mt-2">Cancel Invite</button>}
            </div>
        );
    }

    // 3. Accepted (Dashboard)
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
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><FaHeart className="text-rose-500" /> Joint Savings</h2>
                <p className="text-slate-500">Shared goal with {connection?.receiver_email === user.email ? connection?.sender_email : connection?.receiver_email}</p>
            </div>

            {/* Progress Card */}
            <div className="pro-card p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <div className="flex justify-between items-end mb-4">
                    <div><p className="text-slate-400 text-sm mb-1">Total Saved</p><h3 className="text-4xl font-bold">Rp {current.toLocaleString()}</h3></div>
                    <div className="text-right"><p className="text-slate-400 text-sm mb-1">Target</p><p className="text-xl font-medium">Rp {target.toLocaleString()}</p></div>
                </div>
                <div className="w-full bg-slate-700 h-4 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="pro-card p-6 lg:col-span-1 h-fit">
                    <h3 className="font-bold text-lg mb-4">Deposit Money</h3>
                    <div className="space-y-4">
                        <input type="number" placeholder="Amount" value={newSaving.amount} onChange={e => setNewSaving({ ...newSaving, amount: e.target.value })} className="w-full border rounded-lg p-2.5" />
                        <input type="text" placeholder="Note (Optional)" value={newSaving.note} onChange={e => setNewSaving({ ...newSaving, note: e.target.value })} className="w-full border rounded-lg p-2.5" />
                        <button onClick={handleAddSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold transition">Add to Pot</button>
                    </div>
                </div>

                <div className="pro-card p-6 lg:col-span-2 min-h-[300px]">
                    <h3 className="font-bold text-lg mb-4">Contribution History</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                            <Legend />
                            <Bar dataKey="Me" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Partner" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* DANGER ZONE */}
            <div className="border-t pt-6 mt-10">
                <button onClick={handleUnconnect} className="flex items-center gap-2 text-rose-500 hover:text-rose-700 text-sm font-bold">
                    <FaExclamationTriangle /> Disconnect & Unlink Partner
                </button>
            </div>
        </div>
    );
}