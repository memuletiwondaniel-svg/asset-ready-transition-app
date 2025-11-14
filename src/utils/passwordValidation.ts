export interface PasswordRequirement {
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

export const validatePassword = (password: string): PasswordRequirement[] => {
  return [
    {
      label: 'At least 8 characters',
      met: password.length >= 8
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Contains lowercase letter',
      met: /[a-z]/.test(password)
    },
    {
      label: 'Contains number',
      met: /\d/.test(password)
    },
    {
      label: 'Contains special character (@$!%*?&)',
      met: /[@$!%*?&]/.test(password)
    }
  ];
};

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { score: 0, label: '', color: '' };
  }

  const requirements = validatePassword(password);
  const metCount = requirements.filter(req => req.met).length;

  if (metCount <= 1) {
    return { score: 1, label: 'Weak', color: 'bg-destructive' };
  } else if (metCount === 2) {
    return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  } else if (metCount === 3 || metCount === 4) {
    return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  } else {
    return { score: 4, label: 'Strong', color: 'bg-green-500' };
  }
};

export const isPasswordValid = (password: string): boolean => {
  const requirements = validatePassword(password);
  return requirements.every(req => req.met);
};
