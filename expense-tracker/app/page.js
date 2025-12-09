"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FaSignOutAlt } from 'react-icons/fa';

// Components
import LoginPage from '@/components/LoginPage';
import Sidebar from '@/components/Sidebar';
import ExpensesView from '@/components/ExpensesView';
import MarriageView from '@/components/MarriageView';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("expenses");

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) return <LoginPage />;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">

      <Sidebar user={session.user} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-50 p-4 flex justify-between items-center shadow-md">
        <span className="font-bold">FinTrack</span>
        <button onClick={() => supabase.auth.signOut()}><FaSignOutAlt /></button>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 h-screen overflow-y-auto">
        {activeTab === 'expenses' ? (
          <ExpensesView user={session.user} />
        ) : (
          <MarriageView user={session.user} />
        )}
      </main>
    </div>
  );
}