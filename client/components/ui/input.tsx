import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error';
}

export const Input: React.FC<InputProps> = ({
  variant = 'default',
  className,
  ...props
}) => {
  const baseStyles = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors';

  const variants = {
    default: 'border-gray-300 focus:ring-primary-500 focus:border-transparent',
    error: 'border-red-300 focus:ring-red-500 focus:border-transparent',
  };

  return (
    <input
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
};
