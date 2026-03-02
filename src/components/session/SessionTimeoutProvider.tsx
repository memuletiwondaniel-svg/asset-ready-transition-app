import React from 'react';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionTimeoutWarning from './SessionTimeoutWarning';

const SessionTimeoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showWarning, remainingSeconds, extendSession, handleLogout, config } = useSessionTimeout();

  if (!user) return <>{children}</>;

  return (
    <>
      {children}
      <SessionTimeoutWarning
        open={showWarning}
        remainingSeconds={remainingSeconds}
        totalWarningSeconds={config.warning_minutes * 60}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
    </>
  );
};

export default SessionTimeoutProvider;
