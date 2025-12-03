import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Clock, Plus, Trash2, Save, Camera, Lock } from 'lucide-react';
import { ZIPPYYY_LOGO, formatCurrency } from '../../assets';
import Button from '../../components/common/Button';
import axios from 'axios';

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, addresses, preferences, security

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      addresses: [{ street: '', city: '', state: '', zipCode: '', country: 'USA', isDefault: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addresses',
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data);
      reset({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        addresses: response.data.addresses || [
          { street: '', city: '', state: '', zipCode: '', country: 'USA', isDefault: false },
        ],
        preferredDeliveryTime: response.data.preferredDeliveryTime || 'anytime',
      });
    } catch (error) {
      toast.error('Failed to load profile');
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:5000/api/auth/profile',
        {
          name: data.name,
          phone: data.phone,
          addresses: data.addresses,
          preferredDeliveryTime: data.preferredDeliveryTime,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (data) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        'http://localhost:5000/api/auth/change-password',
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Password changed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={ZIPPYYY_LOGO} alt="ZIPPYYY" className="h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              {/* Profile Picture */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-2 hover:bg-primary-700 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{user.name}</h3>
                <p className="text-sm text-gray-400">{user.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs font-medium">
                  {user.role.toUpperCase()}
                </span>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <User className="w-5 h-5" />
                  Profile Info
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'addresses'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  Addresses
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'preferences'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  Preferences
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'security'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  Security
                </button>
              </nav>
            </div>

            {/* Stats Card */}
            <div className="mt-6 bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-300 mb-4">Account Stats</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Total Orders</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Total Spent</span>
                  <span className="text-white font-semibold">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Member Since</span>
                  <span className="text-white font-semibold">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-8">
              {/* Profile Info Tab */}
              {activeTab === 'profile' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Profile Information</h2>
                    {!isEditing && (
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    )}
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Full Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            {...register('name', { required: 'Name is required' })}
                            disabled={!isEditing}
                            className="input-field pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500 disabled:opacity-60"
                          />
                        </div>
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                        )}
                      </div>

                      {/* Email (Read-only) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="email"
                            {...register('email')}
                            disabled
                            className="input-field pl-10 bg-gray-700/30 border-gray-600 text-gray-400 cursor-not-allowed"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="tel"
                            {...register('phone', {
                              pattern: {
                                value: /^[0-9]{10,15}$/,
                                message: 'Invalid phone number',
                              },
                            })}
                            disabled={!isEditing}
                            className="input-field pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500 disabled:opacity-60"
                          />
                        </div>
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex gap-3">
                        <Button type="submit" variant="primary" disabled={loading}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Delivery Addresses</h2>
                    <Button
                      variant="primary"
                      onClick={() =>
                        append({ street: '', city: '', state: '', zipCode: '', country: 'USA', isDefault: false })
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Address
                    </Button>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-gray-700/30 rounded-lg p-6 border border-gray-600"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-medium text-white flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary-500" />
                            Address {index + 1}
                          </h4>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
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
                          </div>

                          <input
                            type="text"
                            {...register(`addresses.${index}.city`, {
                              required: 'City is required',
                            })}
                            className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                            placeholder="City"
                          />

                          <input
                            type="text"
                            {...register(`addresses.${index}.state`, {
                              required: 'State is required',
                            })}
                            className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                            placeholder="State"
                          />

                          <input
                            type="text"
                            {...register(`addresses.${index}.zipCode`, {
                              required: 'ZIP code is required',
                            })}
                            className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                            placeholder="ZIP Code"
                          />

                          <input
                            type="text"
                            {...register(`addresses.${index}.country`)}
                            className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                            placeholder="Country"
                            defaultValue="USA"
                          />

                          <div className="md:col-span-2">
                            <label className="flex items-center gap-2 text-gray-300">
                              <input
                                type="checkbox"
                                {...register(`addresses.${index}.isDefault`)}
                                className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                              />
                              Set as default address
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button type="submit" variant="primary" disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Addresses
                    </Button>
                  </form>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Delivery Preferences</h2>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                    <Button type="submit" variant="primary" disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </Button>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>

                  <form
                    onSubmit={handleSubmit(handleChangePassword)}
                    className="space-y-6 max-w-md"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        {...register('currentPassword', {
                          required: 'Current password is required',
                        })}
                        className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                        placeholder="••••••••"
                      />
                      {errors.currentPassword && (
                        <p className="mt-1 text-sm text-red-400">
                          {errors.currentPassword.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        {...register('newPassword', {
                          required: 'New password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
                          },
                        })}
                        className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                        placeholder="••••••••"
                      />
                      {errors.newPassword && (
                        <p className="mt-1 text-sm text-red-400">{errors.newPassword.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        {...register('confirmNewPassword', {
                          required: 'Please confirm your new password',
                          validate: (value) =>
                            value === watch('newPassword') || 'Passwords do not match',
                        })}
                        className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500"
                        placeholder="••••••••"
                      />
                      {errors.confirmNewPassword && (
                        <p className="mt-1 text-sm text-red-400">
                          {errors.confirmNewPassword.message}
                        </p>
                      )}
                    </div>

                    <Button type="submit" variant="primary" disabled={loading}>
                      <Lock className="w-4 h-4 mr-2" />
                      Update Password
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
