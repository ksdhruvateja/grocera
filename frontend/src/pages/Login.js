import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Auth.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // ...existing code...
  
  const { login } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use the login function from AuthContext
      const result = await login(formData);

      if (result.success) {
        // Redirect based on user role
        if (result.user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-box">
          <div className="auth-header">
            <h2>Welcome Back to BringIt</h2>
            <p>Your trusted Indian grocery store in NYC, Queens & Long Island</p>
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
                  placeholder="Enter your password"
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
                  Signing In...
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <i className="btn-arrow">→</i>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              New to BringIt? 
              <Link to="/register" className="auth-link">
                Create an account
              </Link>
            </p>
            <div className="auth-benefits">
              <div className="benefit-item">
                <i className="benefit-icon">🚀</i>
                <span>Same-Day Express Delivery</span>
              </div>
              <div className="benefit-item">
                <i className="benefit-icon">🌿</i>
                <span>Fresh Indian Groceries</span>
              </div>
              <div className="benefit-item">
                <i className="benefit-icon">�️</i>
                <span>Serving NYC • Queens • Long Island</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-visual">
          <div className="visual-content">
            <h3>Premium Indian Groceries</h3>
            <p>Experience the finest selection of authentic Indian spices, fresh vegetables, and specialty items delivered to your doorstep across NYC, Queens & Long Island.</p>
            
            <div className="visual-features">
              <div className="feature">
                <div className="feature-icon">🕐</div>
                <div className="feature-text">
                  <h4>Lightning Fast</h4>
                  <p>Same-day to 1-day delivery</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">✨</div>
                <div className="feature-text">
                  <h4>Premium Quality</h4>
                  <p>Hand-picked fresh ingredients</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🇮🇳</div>
                <div className="feature-text">
                  <h4>Authentic Indian</h4>
                  <p>Traditional spices & specialties</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;