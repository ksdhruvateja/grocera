import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  type = 'button',
  className = '',
  disabled = false,
  onClick,
  ...props 
}) => {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-300 inline-flex items-center justify-center gap-2 animate-scale-in';
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none',
    secondary: 'bg-dark-800 hover:bg-dark-700 text-white border border-dark-600 hover:border-primary-500/50 disabled:bg-dark-900 disabled:border-dark-800',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white hover:shadow-glow disabled:border-gray-600 disabled:text-gray-600',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:from-gray-600 disabled:to-gray-700',
    success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:from-gray-600 disabled:to-gray-700',
    ghost: 'text-gray-300 hover:bg-dark-800 hover:text-white disabled:text-gray-600',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };
  
  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
