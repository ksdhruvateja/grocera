import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { ZIPPYYY_LOGO } from '../../assets';
import Button from '../../components/common/Button';
import axios from 'axios';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: data.email,
      });

      setEmailSent(true);
      toast.success('Password reset instructions sent to your email!');
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || 'Failed to send reset email. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8 animate-fadeIn">
          <img
            src={ZIPPYYY_LOGO}
            alt="ZIPPYYY"
            className="h-16 mx-auto mb-4 drop-shadow-lg"
          />
          <h2 className="text-3xl font-bold text-white mb-2">
            {emailSent ? 'Check Your Email' : 'Forgot Password?'}
          </h2>
          <p className="text-gray-400">
            {emailSent
              ? "We've sent password reset instructions to your email"
              : "No worries, we'll send you reset instructions"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-700 animate-slideInDown">
          {!emailSent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    className="input-field pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Instructions'
                )}
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <p className="text-gray-300">
                  We've sent a password reset link to your email address. Please check your
                  inbox and follow the instructions to reset your password.
                </p>
                <p className="text-sm text-gray-400">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setEmailSent(false)}
                    className="text-primary-400 hover:text-primary-300 font-medium"
                  >
                    try again
                  </button>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => window.open('https://mail.google.com', '_blank')}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Open Email App
                </Button>

                <Link to="/login" className="block">
                  <Button variant="outline" size="lg" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        {!emailSent && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* Security Note */}
        <div className="mt-6 bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-semibold text-white mb-2">🔒 Security Note</h4>
          <p className="text-xs text-gray-400">
            For your security, the password reset link will expire in 1 hour. If you didn't
            request a password reset, please ignore this email or contact support if you have
            concerns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
