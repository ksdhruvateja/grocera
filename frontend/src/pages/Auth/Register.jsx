import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone, MapPin, Clock, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { ZIPPYYY_LOGO } from '../../assets';
import Button from '../../components/common/Button';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      addresses: [{ street: '', city: '', state: '', zipCode: '', country: 'USA' }],
      preferredDeliveryTime: 'morning',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addresses',
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        addresses: data.addresses,
        preferredDeliveryTime: data.preferredDeliveryTime,
      });

      const { token, user } = response.data;

      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success('Account created successfully!');

      // Role-based redirect after registration
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'co-admin':
          navigate('/co-admin/dashboard');
          break;
        case 'customer':
        default:
          navigate('/shop');
          break;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, text: '', color: '' };
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;

    const levels = [
      { strength: 0, text: 'Too weak', color: 'bg-red-500' },
      { strength: 1, text: 'Weak', color: 'bg-orange-500' },
      { strength: 2, text: 'Fair', color: 'bg-yellow-500' },
      { strength: 3, text: 'Good', color: 'bg-lime-500' },
      { strength: 4, text: 'Strong', color: 'bg-green-500' },
    ];

    return levels[strength];
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        {/* Logo */}
        <div className="text-center mb-8 animate-fadeIn">
          <img
            src={ZIPPYYY_LOGO}
            alt="ZIPPYYY"
            className="h-16 mx-auto mb-4 drop-shadow-lg"
          />
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400">Join ZIPPYYY for fresh groceries delivered to your door</p>
        </div>

        {/* Registration Card */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-700 animate-slideInDown">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    {...register('name', {
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                    className="input-field pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
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

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^[0-9]{10,15}$/,
                        message: 'Invalid phone number',
                      },
                    })}
                    className="input-field pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                    placeholder="1234567890"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
                )}
              </div>

              {/* Preferred Delivery Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Preferred Delivery Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    {...register('preferredDeliveryTime')}
                    className="input-field pl-10 bg-gray-700/50 border-gray-600 text-white focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="morning">Morning (8 AM - 12 PM)</option>
                    <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                    <option value="evening">Evening (5 PM - 9 PM)</option>
                    <option value="anytime">Anytime</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                    className="input-field pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">{passwordStrength.text}</span>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === password || 'Passwords do not match',
                    })}
                    className="input-field pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Addresses Section */}
            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  Delivery Addresses
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ street: '', city: '', state: '', zipCode: '', country: 'USA' })}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Address
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-300">
                        Address {index + 1}
                      </h4>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          {...register(`addresses.${index}.street`, {
                            required: 'Street address is required',
                          })}
                          className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Street Address"
                        />
                        {errors.addresses?.[index]?.street && (
                          <p className="mt-1 text-sm text-red-400">
                            {errors.addresses[index].street.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          {...register(`addresses.${index}.city`, {
                            required: 'City is required',
                          })}
                          className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                          placeholder="City"
                        />
                        {errors.addresses?.[index]?.city && (
                          <p className="mt-1 text-sm text-red-400">
                            {errors.addresses[index].city.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          {...register(`addresses.${index}.state`, {
                            required: 'State is required',
                          })}
                          className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                          placeholder="State"
                        />
                        {errors.addresses?.[index]?.state && (
                          <p className="mt-1 text-sm text-red-400">
                            {errors.addresses[index].state.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          {...register(`addresses.${index}.zipCode`, {
                            required: 'ZIP code is required',
                            pattern: {
                              value: /^\d{5}(-\d{4})?$/,
                              message: 'Invalid ZIP code',
                            },
                          })}
                          className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                          placeholder="ZIP Code"
                        />
                        {errors.addresses?.[index]?.zipCode && (
                          <p className="mt-1 text-sm text-red-400">
                            {errors.addresses[index].zipCode.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          {...register(`addresses.${index}.country`)}
                          className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Country"
                          defaultValue="USA"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                {...register('terms', {
                  required: 'You must accept the terms and conditions',
                })}
                className="w-4 h-4 mt-1 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
              />
              <label className="text-sm text-gray-300">
                I agree to the{' '}
                <Link to="/terms" className="text-primary-400 hover:text-primary-300">
                  Terms & Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary-400 hover:text-primary-300">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.terms && (
              <p className="mt-1 text-sm text-red-400">{errors.terms.message}</p>
            )}

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
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
