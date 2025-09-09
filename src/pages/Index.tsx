import React, { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import AuthPage from '@/components/AuthPage';
import LandingPage from '@/components/LandingPage';
import ApprovalReviewPage from '@/components/ApprovalReviewPage';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'landing' | 'review'>('landing');

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check for review page redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('page') === 'review') {
      setCurrentPage('review');
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // Auth state will be updated by the listener
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentPage('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!user || !session) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Show review page if that's the current page
  if (currentPage === 'review') {
    return (
      <ApprovalReviewPage 
        user={user} 
        onBack={() => setCurrentPage('landing')} 
      />
    );
  }

  // Show main landing page
  return (
    <LandingPage 
      user={user} 
      onSignOut={handleSignOut}
      onNavigateToReview={() => setCurrentPage('review')}
    />
  );
};

export default Index;