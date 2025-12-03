import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // ...existing code...

  const { register } = useAuth();
  const navigate = useNavigate();

  // Admin emails for detection (not used)

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Removed unused admin email check
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Use the register function from AuthContext
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        // Check if user is admin and redirect appropriately
        if (result.user.role === 'admin') {
          sessionStorage.setItem('adminLogin', 'true');
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-box">
          <div className="auth-header">
            <h2>Join ZippyyyFamily</h2>
            <p>Start your journey with NYC, Queens & Long Island's finest Indian grocery store</p>
            <div className="auth-accent-line"></div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <i className="error-icon">⚠</i>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <div className="input-wrapper">
                <i className="input-icon">👤</i>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your first name"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <div className="input-wrapper">
                <i className="input-icon">👤</i>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your last name"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <i className="input-icon">📧</i>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <i className="input-icon">🔒</i>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a password (6+ characters)"
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <i className="input-icon">🔐</i>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-btn primary"
              disabled={loading}
            >
              {loading ? (
                <div className="loading-spinner">
                  <span className="spinner"></span>
                  Creating Account...
                </div>
              ) : (
                <>
                  <span>Create Account</span>
                  <i className="btn-arrow">→</i>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
            <div className="auth-benefits">
              <div className="benefit-item">
                <i className="benefit-icon">🎁</i>
                <span>Welcome Bonus</span>
              </div>
              <div className="benefit-item">
                <i className="benefit-icon">🚚</i>
                <span>Free First Delivery</span>
              </div>
              <div className="benefit-item">
                <i className="benefit-icon">⭐</i>
                <span>Loyalty Rewards</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-visual">
          <div className="visual-content">
            <h3>Authentic Indian Flavors</h3>
            <p>Join thousands of satisfied customers across NYC, Queens & Long Island who trust Zippyyyfor the finest Indian groceries, spices, and specialty ingredients.</p>

            <div className="visual-features">
              <div className="feature">
                <div className="feature-icon">🌶️</div>
                <div className="feature-text">
                  <h4>Premium Spices</h4>
                  <p>Directly sourced from India</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🥬</div>
                <div className="feature-text">
                  <h4>Fresh Vegetables</h4>
                  <p>Daily fresh Indian vegetables</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🍚</div>
                <div className="feature-text">
                  <h4>Specialty Items</h4>
                  <p>Hard-to-find authentic ingredients</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;