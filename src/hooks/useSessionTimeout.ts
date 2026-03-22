import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

interface SessionTimeoutConfig {
  timeout_minutes: number;
  warning_minutes: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  timeout_minutes: 30,
  warning_minutes: 5,
  enabled: true,
};

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;
const THROTTLE_MS = 30_000; // Only update last-activity every 30s

export const useSessionTimeout = () => {
  const { user, signOut } = useAuth();
  const [config, setConfig] = useState<SessionTimeoutConfig>(DEFAULT_CONFIG);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const throttleRef = useRef(0);

  // Fetch config from DB
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'session_timeout')
        .single();
      if (data?.value) {
        setConfig(data.value as unknown as SessionTimeoutConfig);
      }
    };
    fetchConfig();
  }, []);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    
    // Audit log (via edge function for IP/UA capture)
    try {
      await supabase.functions.invoke('write-audit-log', {
        body: {
          category: 'auth',
          action: 'session_timeout',
          severity: 'warning',
          description: `Session timed out after ${config.timeout_minutes} minutes of inactivity`,
          metadata: { timeout_minutes: config.timeout_minutes },
        },
      });
    } catch { /* silent */ }

    await signOut();
  }, [clearAllTimers, signOut, user, config.timeout_minutes]);

  const resetTimers = useCallback(() => {
    if (!config.enabled || !user) return;
    
    clearAllTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    const warningMs = (config.timeout_minutes - config.warning_minutes) * 60 * 1000;
    const totalMs = config.timeout_minutes * 60 * 1000;

    // Show warning dialog
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(config.warning_minutes * 60);
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningMs);

    // Force logout
    logoutTimerRef.current = setTimeout(handleLogout, totalMs);
  }, [config, user, clearAllTimers, handleLogout]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  // Track user activity
  useEffect(() => {
    if (!config.enabled || !user) return;

    const handleActivity = () => {
      const now = Date.now();
      if (now - throttleRef.current < THROTTLE_MS) return;
      throttleRef.current = now;

      // Only reset if warning isn't showing
      if (!showWarning) {
        resetTimers();
      }
    };

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimers();

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [config.enabled, user, resetTimers, clearAllTimers, showWarning]);

  return {
    showWarning,
    remainingSeconds,
    extendSession,
    handleLogout,
    config,
  };
};
