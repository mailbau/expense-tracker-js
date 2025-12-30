"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FaSignOutAlt, FaWallet } from 'react-icons/fa';

// Components
import LoginPage from '@/components/LoginPage';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav'; // <--- New Import
import ExpensesView from '@/components/ExpensesView';
import MarriageView from '@/components/MarriageView';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("expenses");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) return <LoginPage />;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
      <Sidebar user={session.user} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* MOBILE TOP HEADER (Hidden on Desktop) */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-50 px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <FaWallet className="text-emerald-400 text-xl" />
          <span className="font-bold text-lg">FinTrack</span>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white">
          <FaSignOutAlt />
        </button>
      </div>

      {/* MAIN CONTENT */}
      {/* Added 'pb-24' so content isn't hidden behind the bottom nav */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 pb-24 overflow-y-auto">
        {activeTab === 'expenses' ? (
          <ExpensesView user={session.user} />
        ) : (
          <MarriageView user={session.user} />
        )}
      </main>

      {/* MOBILE BOTTOM NAV (Hidden on Desktop) */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

    </div>
  );
}