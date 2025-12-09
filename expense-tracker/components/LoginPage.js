"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FaWallet } from 'react-icons/fa';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        const email = e.target.email.value;
        const password = e.target.password.value;

        let result;
        if (isSignUp) {
            result = await supabase.auth.signUp({ email, password });
        } else {
            result = await supabase.auth.signInWithPassword({ email, password });
        }

        if (result.error) alert(result.error.message);
        else if (isSignUp) alert("Account created! You can now log in.");

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 text-center">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaWallet className="text-3xl text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">FinTrack</h1>
                <p className="text-slate-500 mb-6">{isSignUp ? "Create a new account" : "Welcome back"}</p>

                <form onSubmit={handleAuth} className="space-y-4 text-left">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input name="email" type="email" required className="w-full mt-1 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <input name="password" type="password" required className="w-full mt-1 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <button disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition disabled:opacity-50">
                        {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
                    </button>
                </form>
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-slate-500 mt-4 hover:underline">
                    {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
                </button>
            </div>
        </div>
    );
}