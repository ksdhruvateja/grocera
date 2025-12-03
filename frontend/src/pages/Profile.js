import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Profile.css';

function Profile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'NY',
    zipCode: ''
  });

  useEffect(() => {
    if (user) {
      const savedProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
      setProfileData({
        firstName: user.name?.split(' ')[0] || savedProfile.firstName || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || savedProfile.lastName || '',
        email: user.email || '',
        phone: savedProfile.phone || '',
        address: savedProfile.address || '',
        city: savedProfile.city || '',
        state: 'NY',
        zipCode: savedProfile.zipCode || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Save to localStorage (in a real app, this would be saved to backend)
      localStorage.setItem('userProfile', JSON.stringify(profileData));
      
      // Update auth context if needed
      if (updateProfile) {
        await updateProfile({
          name: `${profileData.firstName} ${profileData.lastName}`,
          email: profileData.email
        });
      }

      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    const savedProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
    setProfileData({
      firstName: user.name?.split(' ')[0] || savedProfile.firstName || '',
      lastName: user.name?.split(' ').slice(1).join(' ') || savedProfile.lastName || '',
      email: user.email || '',
      phone: savedProfile.phone || '',
      address: savedProfile.address || '',
      city: savedProfile.city || '',
      state: 'NY',
      zipCode: savedProfile.zipCode || ''
    });
    setIsEditing(false);
    setMessage('');
  };

  return (
    <div className="profile-container">
      <div className="container">
        <div className="profile-header">
          <h1>👤 My Profile</h1>
          <p>Manage your personal information and delivery preferences</p>
        </div>

        <div className="profile-content">
          <div className="profile-card">
            <div className="card-header">
              <h2>Personal Information</h2>
              {!isEditing && (
                <button 
                  className="btn btn-outline"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {message && (
              <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>📍 Delivery Address</h3>
                <div className="form-group">
                  <label htmlFor="address">Street Address</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={profileData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={profileData.city}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Queens"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="state">State</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value="NY"
                      disabled
                      className="readonly"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="zipCode">ZIP Code</label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={profileData.zipCode}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="11375"
                      maxLength="5"
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        💾 Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="profile-stats">
            <h2>Account Summary</h2>
            
            <div className="stat-card">
              <div className="stat-icon">🛍️</div>
              <div className="stat-info">
                <h3>Total Orders</h3>
                <p>View your order history and track deliveries</p>
                <a href="/orders" className="stat-link">View Orders →</a>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">❤️</div>
              <div className="stat-info">
                <h3>Favorite Products</h3>
                <p>Quick access to your most purchased items</p>
                <a href="/products" className="stat-link">Shop Now →</a>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-info">
                <h3>Loyalty Status</h3>
                <p>Valued Customer</p>
                <span className="badge">Active Member</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;