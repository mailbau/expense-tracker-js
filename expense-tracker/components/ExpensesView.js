"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
    FaArrowUp, FaArrowDown, FaWallet, FaPlus, FaTrash, FaChartBar, FaList
} from 'react-icons/fa';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function ExpensesView({ user }) {
    const [activeTab, setActiveTab] = useState('monthly');

    // SHARED STATE
    const [year, setYear] = useState(new Date().getFullYear());

    // MONTHLY STATE
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [expenses, setExpenses] = useState([]);
    const [newItem, setNewItem] = useState({
        date: new Date().toISOString().split('T')[0],
        item: '',
        amount: '',
        category: 'Food',
        type: 'Expense'
    });

    // YEARLY STATE
    const [yearlyStats, setYearlyStats] = useState({ income: 0, expense: 0, saved: 0, rate: 0 });
    const [yearlyChartData, setYearlyChartData] = useState([]);

    // --- EFFECT: FETCH DATA ---
    useEffect(() => {
        if (activeTab === 'monthly') {
            fetchMonthlyData();
        } else {
            fetchYearlyData();
        }
    }, [user, year, month, activeTab]);

    // --- 1. FETCH MONTHLY DATA ---
    async function fetchMonthlyData() {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

        const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .gte('expense_date', startDate)
            .lt('expense_date', endDate)
            .order('expense_date', { ascending: false });

        if (data) setExpenses(data);
    }

    // --- 2. FETCH YEARLY DATA ---
    async function fetchYearlyData() {
        const startDate = `${year}-01-01`;
        const endDate = `${year + 1}-01-01`;

        const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .gte('expense_date', startDate)
            .lt('expense_date', endDate);

        if (data) {
            const inc = data.filter(e => e.type === 'Income').reduce((sum, e) => sum + e.amount, 0);
            const exp = data.filter(e => e.type === 'Expense').reduce((sum, e) => sum + e.amount, 0);
            const saved = inc - exp;
            const rate = inc > 0 ? ((saved / inc) * 100) : 0;

            setYearlyStats({ income: inc, expense: exp, saved, rate });

            const months = Array.from({ length: 12 }, (_, i) => ({
                month: format(new Date(year, i, 1), 'MMM'),
                index: i,
                Income: 0,
                Expense: 0
            }));

            data.forEach(item => {
                const itemMonthIndex = new Date(item.expense_date).getMonth();
                if (item.type === 'Income') months[itemMonthIndex].Income += item.amount;
                else months[itemMonthIndex].Expense += item.amount;
            });

            setYearlyChartData(months);
        }
    }

    // --- ACTIONS (FIXED HERE) ---
    async function handleAdd() {
        if (!newItem.item || !newItem.amount) {
            alert("Please fill in both Item Name and Amount.");
            return;
        }

        // FIX: We map 'newItem.date' to 'expense_date' manually here
        const { error } = await supabase.from('expenses').insert({
            user_id: user.id,
            expense_date: newItem.date, // <--- THIS WAS THE FIX
            item: newItem.item,
            amount: parseFloat(newItem.amount),
            category: newItem.category,
            type: newItem.type
        });

        if (error) {
            alert("Error saving: " + error.message);
        } else {
            setNewItem({ ...newItem, item: '', amount: '' });
            fetchMonthlyData();
        }
    }

    function handleExportCSV() {
        if (!expenses || expenses.length === 0) {
            alert("No transactions to export for this period.");
            return;
        }

        const headers = ['Date', 'Item', 'Amount', 'Category', 'Type'];

        const rows = expenses.map(ex => [
            ex.expense_date,
            ex.item,
            ex.amount,
            ex.category,
            ex.type,
        ]);

        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (/[",\n]/.test(str)) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const monthName = format(new Date(year, month - 1, 1), 'yyyy-MM');
        const fileName = `expenses-${monthName}.csv`;

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function handleDelete(id) {
        if (!confirm("Delete this transaction?")) return;
        await supabase.from('expenses').delete().eq('id', id);
        fetchMonthlyData();
    }

    const monthlyInc = expenses.filter(e => e.type === 'Income').reduce((acc, c) => acc + c.amount, 0);
    const monthlyExp = expenses.filter(e => e.type === 'Expense').reduce((acc, c) => acc + c.amount, 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">

            {/* HEADER & TABS */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Financial Overview</h2>
                    <p className="text-slate-500">
                        {activeTab === 'monthly' ? `Log for ${format(new Date(year, month - 1), 'MMMM yyyy')}` : `Recap for Year ${year}`}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white border p-2 rounded-lg font-bold text-slate-700 shadow-sm outline-none">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveTab('monthly')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${activeTab === 'monthly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><FaList /> Monthly Log</button>
                <button onClick={() => setActiveTab('yearly')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${activeTab === 'yearly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><FaChartBar /> Yearly Recap</button>
            </div>

            {/* MONTHLY LOG */}
            {activeTab === 'monthly' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex overflow-x-auto pb-2 gap-2 md:justify-center scrollbar-hide">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <button key={m} onClick={() => setMonth(m)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${month === m ? 'bg-slate-900 text-white' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>{format(new Date(2024, m - 1, 1), 'MMM')}</button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="Income" value={monthlyInc} color="text-emerald-600" icon={<FaArrowUp />} />
                        <StatCard title="Expenses" value={monthlyExp} color="text-rose-500" icon={<FaArrowDown />} />
                        <StatCard title="Balance" value={monthlyInc - monthlyExp} color="text-slate-800" icon={<FaWallet />} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="pro-card p-6 lg:col-span-1 h-fit">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FaPlus className="text-blue-500" /> Add Transaction</h3>
                            <div className="space-y-3">
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                    {['Expense', 'Income'].map(type => (
                                        <button key={type} onClick={() => setNewItem({ ...newItem, type })} className={`flex-1 py-1.5 text-sm rounded-md font-medium transition ${newItem.type === type ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{type}</button>
                                    ))}
                                </div>
                                <input type="date" value={newItem.date} onChange={e => setNewItem({ ...newItem, date: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" />
                                <input placeholder="Item name..." value={newItem.item} onChange={e => setNewItem({ ...newItem, item: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" />
                                <input type="number" placeholder="Amount (Rp)" value={newItem.amount} onChange={e => setNewItem({ ...newItem, amount: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" />
                                <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm">
                                    {newItem.type === 'Expense' ? ['Food', 'Transport', 'Bills', 'Shopping', 'Fun', 'Other'].map(c => <option key={c} value={c}>{c}</option>) : ['Salary', 'Bonus', 'Gift', 'Freelance', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={handleAdd} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition">Save Transaction</button>
                            </div>
                        </div>

                        <div className="pro-card p-6 lg:col-span-2 flex flex-col h-[500px]">
                            <div className="border-b pb-2 mb-4 flex items-center justify-between gap-3">
                                <h3 className="font-bold text-lg">History</h3>
                                <button
                                    onClick={handleExportCSV}
                                    className="inline-flex items-center gap-2 text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Export CSV
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                {expenses.length === 0 ? <p className="text-center text-slate-400 mt-10">No transactions found.</p> : null}
                                {expenses.map(ex => (
                                    <div key={ex.id} className="group flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${ex.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>{ex.type === 'Income' ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}</div>
                                            <div><p className="font-medium text-slate-800">{ex.item}</p><p className="text-xs text-slate-400">{ex.expense_date} • {ex.category}</p></div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`font-mono font-medium ${ex.type === 'Income' ? 'text-emerald-600' : 'text-slate-900'}`}>{ex.type === 'Income' ? '+' : '-'} Rp {ex.amount.toLocaleString()}</span>
                                            <button onClick={() => handleDelete(ex.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"><FaTrash /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* YEARLY RECAP */}
            {activeTab === 'yearly' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="Total Income" value={yearlyStats.income} color="text-emerald-600" icon={<FaArrowUp />} />
                        <StatCard title="Total Spent" value={yearlyStats.expense} color="text-rose-500" icon={<FaArrowDown />} />
                        <StatCard title="Net Saved" value={yearlyStats.saved} color="text-blue-600" icon={<FaWallet />} />
                        <div className="pro-card p-5 flex flex-col justify-center items-center">
                            <p className="text-slate-400 text-sm font-medium">Savings Rate</p>
                            <p className="text-3xl font-bold text-slate-800">{yearlyStats.rate.toFixed(1)}%</p>
                        </div>
                    </div>
                    <div className="pro-card p-6 h-[400px]">
                        <h3 className="font-bold text-lg mb-6">Income vs Expenses ({year})</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, color, icon }) {
    return (
        <div className="pro-card p-5 flex items-center gap-4">
            <div className={`p-3 rounded-full bg-slate-100 ${color} text-xl`}>{icon}</div>
            <div><p className="text-slate-400 text-sm font-medium">{title}</p><p className={`text-2xl font-bold ${color}`}>Rp {value.toLocaleString()}</p></div>
        </div>
    );
}