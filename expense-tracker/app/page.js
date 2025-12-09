"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [session, setSession] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // 1. Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchExpenses();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchExpenses();
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Data
  async function fetchExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (error) console.log('error', error);
    else setExpenses(data);
  }

  // 3. Add Expense
  async function addExpense() {
    if (!newItem || !newAmount) return;
    const user = session.user;

    const { error } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        item: newItem,
        amount: parseFloat(newAmount),
        category: 'General', // Default for now
        type: 'Expense'
      });

    if (error) {
      alert(error.message);
    } else {
      setNewItem('');
      setNewAmount('');
      fetchExpenses(); // Refresh list
    }
  }

  // 4. Login Function
  async function handleLogin(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  // --- RENDER ---
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="p-10 bg-white rounded shadow-md">
          <h1 className="text-2xl mb-5 font-bold">🔐 Login</h1>
          <input name="email" type="email" placeholder="Email" className="border p-2 w-full mb-3 rounded" />
          <input name="password" type="password" placeholder="Password" className="border p-2 w-full mb-3 rounded" />
          <button className="bg-blue-600 text-white w-full p-2 rounded">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-5">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">💰 My Expenses</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-red-500">Log Out</button>
      </div>

      {/* Input Box */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 border">
        <div className="flex gap-2 mb-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Item (e.g. Coffee)"
            className="border p-2 flex-1 rounded"
          />
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="Amount"
            className="border p-2 w-24 rounded"
          />
        </div>
        <button onClick={addExpense} className="bg-green-600 text-white w-full p-2 rounded font-bold">
          Add Expense
        </button>
      </div>

      {/* List */}
      <ul className="space-y-3">
        {expenses.map((expense) => (
          <li key={expense.id} className="flex justify-between p-3 bg-white border rounded shadow-sm">
            <span>{expense.item}</span>
            <span className="font-mono font-bold">Rp {expense.amount.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}