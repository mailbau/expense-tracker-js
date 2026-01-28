"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
    FaArrowUp, FaArrowDown, FaWallet, FaPlus, FaTrash, FaChartBar, FaList, FaBullseye, FaCog
} from 'react-icons/fa';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function ExpensesView({ user }) {
    const [activeTab, setActiveTab] = useState('monthly'); // 'monthly', 'yearly', 'budget'

    // SHARED STATE
    const [year, setYear] = useState(new Date().getFullYear());

    // MONTHLY STATE
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [expenses, setExpenses] = useState([]);
    const [newItem, setNewItem] = useState({
        date: new Date().toISOString().split('T')[0], item: '', amount: '', category: 'Food', type: 'Expense'
    });

    // BUDGET STATE
    const [budgets, setBudgets] = useState([]);
    const [budgetForm, setBudgetForm] = useState({ category: 'Food', amount: '' });

    // YEARLY STATE
    const [yearlyStats, setYearlyStats] = useState({ income: 0, expense: 0, saved: 0, rate: 0 });
    const [yearlyChartData, setYearlyChartData] = useState([]);

    // --- EFFECT: FETCH DATA ---
    useEffect(() => {
        if (activeTab === 'yearly') {
            fetchYearlyData();
        } else {
            // Monthly and Budget views both need monthly data
            fetchMonthlyData();
            if (activeTab === 'budget') fetchBudgets();
        }
    }, [user, year, month, activeTab]);

    // --- DATA FETCHING ---
    async function fetchMonthlyData() {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

        const { data } = await supabase.from('expenses').select('*')
            .eq('user_id', user.id)
            .gte('expense_date', startDate)
            .lt('expense_date', endDate)
            .order('expense_date', { ascending: false });

        if (data) setExpenses(data);
    }

    async function fetchBudgets() {
        const { data } = await supabase.from('budget_limits').select('*').eq('user_id', user.id);
        if (data) setBudgets(data);
    }

    async function fetchYearlyData() {
        const startDate = `${year}-01-01`;
        const endDate = `${year + 1}-01-01`;
        const { data } = await supabase.from('expenses').select('*').eq('user_id', user.id)
            .gte('expense_date', startDate).lt('expense_date', endDate);

        if (data) {
            const inc = data.filter(e => e.type === 'Income').reduce((sum, e) => sum + e.amount, 0);
            const exp = data.filter(e => e.type === 'Expense').reduce((sum, e) => sum + e.amount, 0);
            const saved = inc - exp;
            const rate = inc > 0 ? ((saved / inc) * 100) : 0;
            setYearlyStats({ income: inc, expense: exp, saved, rate });

            const months = Array.from({ length: 12 }, (_, i) => ({
                month: format(new Date(year, i, 1), 'MMM'),
                Income: 0, Expense: 0
            }));
            data.forEach(item => {
                const idx = new Date(item.expense_date).getMonth();
                if (item.type === 'Income') months[idx].Income += item.amount;
                else months[idx].Expense += item.amount;
            });
            setYearlyChartData(months);
        }
    }

    // --- ACTIONS ---
    async function handleAdd() {
        if (!newItem.item || !newItem.amount) return alert("Fill all fields");
        const { error } = await supabase.from('expenses').insert({
            user_id: user.id, expense_date: newItem.date, item: newItem.item,
            amount: parseFloat(newItem.amount), category: newItem.category, type: newItem.type
        });
        if (error) alert(error.message);
        else {
            setNewItem({ ...newItem, item: '', amount: '' });
            fetchMonthlyData();
        }
    }

    async function handleDelete(id) {
        if (!confirm("Delete this?")) return;
        await supabase.from('expenses').delete().eq('id', id);
        fetchMonthlyData();
    }

    async function handleSaveBudget() {
        if (!budgetForm.amount) return alert("Enter limit amount");

        // Check if exists
        const existing = budgets.find(b => b.category === budgetForm.category);

        let error;
        if (existing) {
            // Update
            const res = await supabase.from('budget_limits')
                .update({ limit_amount: parseFloat(budgetForm.amount) })
                .eq('id', existing.id);
            error = res.error;
        } else {
            // Insert
            const res = await supabase.from('budget_limits').insert({
                user_id: user.id, category: budgetForm.category, limit_amount: parseFloat(budgetForm.amount)
            });
            error = res.error;
        }

        if (error) alert(error.message);
        else {
            alert(`Limit for ${budgetForm.category} updated!`);
            fetchBudgets();
        }
    }

    // Monthly Calculations
    const monthlyInc = expenses.filter(e => e.type === 'Income').reduce((acc, c) => acc + c.amount, 0);
    const monthlyExp = expenses.filter(e => e.type === 'Expense').reduce((acc, c) => acc + c.amount, 0);

    // Categories List
    const EXPENSE_CATS = ['Food', 'Transport', 'Bills', 'Shopping', 'Fun', 'Other'];

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Financial Overview</h2>
                    <p className="text-slate-500">
                        {activeTab === 'yearly' ? `Recap for Year ${year}` : `Log for ${format(new Date(year, month - 1), 'MMMM yyyy')}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white border p-2 rounded-lg font-bold text-slate-700 shadow-sm outline-none">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex bg-slate-200 p-1 rounded-lg w-fit overflow-x-auto">
                <TabButton active={activeTab === 'monthly'} onClick={() => setActiveTab('monthly')} icon={<FaList />} label="Monthly Log" />
                <TabButton active={activeTab === 'budget'} onClick={() => setActiveTab('budget')} icon={<FaBullseye />} label="Budget Targets" />
                <TabButton active={activeTab === 'yearly'} onClick={() => setActiveTab('yearly')} icon={<FaChartBar />} label="Yearly Recap" />
            </div>

            {/* VIEW 1: MONTHLY LOG */}
            {activeTab === 'monthly' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <MonthSelector month={month} setMonth={setMonth} />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="Income" value={monthlyInc} color="text-emerald-600" icon={<FaArrowUp />} />
                        <StatCard title="Expenses" value={monthlyExp} color="text-rose-500" icon={<FaArrowDown />} />
                        <StatCard title="Balance" value={monthlyInc - monthlyExp} color="text-slate-800" icon={<FaWallet />} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ADD FORM */}
                        <div className="pro-card p-6 lg:col-span-1 h-fit">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FaPlus className="text-blue-500" /> Add Transaction</h3>
                            <div className="space-y-3">
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                    {['Expense', 'Income'].map(type => (
                                        <button key={type} onClick={() => setNewItem({ ...newItem, type, category: type === 'Expense' ? 'Food' : 'Salary' })} className={`flex-1 py-1.5 text-sm rounded-md font-medium transition ${newItem.type === type ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{type}</button>
                                    ))}
                                </div>
                                <input type="date" value={newItem.date} onChange={e => setNewItem({ ...newItem, date: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" />
                                <input placeholder="Item name..." value={newItem.item} onChange={e => setNewItem({ ...newItem, item: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" />
                                <input type="number" placeholder="Amount (Rp)" value={newItem.amount} onChange={e => setNewItem({ ...newItem, amount: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" />
                                <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm">
                                    {newItem.type === 'Expense' ? EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>) : ['Salary', 'Bonus', 'Gift', 'Freelance', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={handleAdd} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition">Save Transaction</button>
                            </div>
                        </div>

                        {/* LIST */}
                        <div className="pro-card p-6 lg:col-span-2 flex flex-col h-[500px]">
                            <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg">History</h3></div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
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

            {/* VIEW 2: BUDGET TARGETS */}
            {activeTab === 'budget' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <MonthSelector month={month} setMonth={setMonth} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* SETTINGS */}
                        <div className="pro-card p-6 h-fit">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FaCog /> Set Limits</h3>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                                <select value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })} className="w-full border rounded-lg p-2.5">
                                    {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <label className="text-xs font-bold text-slate-500 uppercase">Max Limit</label>
                                <input type="number" placeholder="e.g. 3000000" value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} className="w-full border rounded-lg p-2.5" />
                                <button onClick={handleSaveBudget} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold">Set Limit</button>
                            </div>
                        </div>

                        {/* VISUALIZATION */}
                        <div className="pro-card p-6 lg:col-span-2">
                            <h3 className="font-bold text-lg mb-6">Budget Progress ({format(new Date(year, month - 1), 'MMMM')})</h3>
                            <div className="space-y-6">
                                {EXPENSE_CATS.map(cat => {
                                    const spent = expenses.filter(e => e.type === 'Expense' && e.category === cat).reduce((acc, c) => acc + c.amount, 0);
                                    const limitObj = budgets.find(b => b.category === cat);
                                    const limit = limitObj ? limitObj.limit_amount : 0;

                                    // Skip categories with 0 spend AND 0 limit
                                    if (spent === 0 && limit === 0) return null;

                                    const percent = limit > 0 ? (spent / limit) * 100 : 0;
                                    let colorClass = 'bg-emerald-400';
                                    if (percent > 75) colorClass = 'bg-amber-400';
                                    if (percent > 100) colorClass = 'bg-rose-500';

                                    return (
                                        <div key={cat}>
                                            <div className="flex justify-between mb-1 text-sm font-medium">
                                                <span>{cat}</span>
                                                <span className={percent > 100 ? 'text-rose-500 font-bold' : 'text-slate-600'}>
                                                    Rp {spent.toLocaleString()} <span className="text-slate-400 font-normal">/ {limit > 0 ? limit.toLocaleString() : 'No Limit'}</span>
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                                            </div>
                                            {limit === 0 && <p className="text-xs text-slate-400 mt-1">Tip: Set a limit for {cat} in the settings.</p>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 3: YEARLY RECAP */}
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

// --- HELPER COMPONENTS ---

function StatCard({ title, value, color, icon }) {
    return (
        <div className="pro-card p-5 flex items-center gap-4">
            <div className={`p-3 rounded-full bg-slate-100 ${color} text-xl`}>{icon}</div>
            <div><p className="text-slate-400 text-sm font-medium">{title}</p><p className={`text-2xl font-bold ${color}`}>Rp {value.toLocaleString()}</p></div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition whitespace-nowrap ${active ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {icon} {label}
        </button>
    );
}

function MonthSelector({ month, setMonth }) {
    return (
        <div className="flex overflow-x-auto pb-2 gap-2 md:justify-center scrollbar-hide">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <button key={m} onClick={() => setMonth(m)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${month === m ? 'bg-slate-900 text-white' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>
                    {format(new Date(2024, m - 1, 1), 'MMM')}
                </button>
            ))}
        </div>
    );
}