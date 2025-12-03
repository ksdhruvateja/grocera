import React, { useState } from 'react';
import '../styles/pages/Contact.css';

function Contact() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      // Send message to admin panel via backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          status: 'unread'
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          subject: '',
          message: '',
          inquiryType: 'general'
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-container">
      <div className="container">
        <div className="contact-header">
          <h1>📞 Contact Us</h1>
          <p>We'd love to hear from you! Get in touch with our team for any questions, feedback, or support.</p>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <h2>🏪 BringIt</h2>
            
            <div className="info-card">
              <h3>� Contact Information</h3>
              <div className="info-item">
                <span className="icon">📧</span>
                <div>
                  <strong>Email</strong>
                  <p><a href="mailto:rbsgrocery@gmail.com">rbsgrocery@gmail.com</a></p>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>🕒 Business Hours</h3>
              <div className="hours-info">
                <p><strong>We are open the entire year - No holidays!</strong></p>
                <p>Available 24/7 for online orders</p>
                <p>Delivery within 2-24 hours</p>
              </div>
            </div>

            <div className="info-card">
              <h3>🚚 Delivery Areas</h3>
              <ul className="delivery-areas">
                <li>✅ Queens, NY</li>
                <li>✅ Brooklyn, NY</li>
                <li>✅ Manhattan, NY</li>
                <li>✅ Long Island</li>
                <li>✅ Nassau County</li>
              </ul>
            </div>
          </div>

          <div className="contact-form-section">
            <h2>💬 Send us a Message</h2>
            
            {submitStatus === 'success' && (
              <div className="alert alert-success">
                ✅ Thank you! Your message has been sent successfully to our admin team. We'll get back to you soon!
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="alert alert-error">
                ❌ Sorry, there was an error sending your message. Please try again or call us directly.
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="inquiryType">Inquiry Type</label>
                <select
                  id="inquiryType"
                  name="inquiryType"
                  value={formData.inquiryType}
                  onChange={handleInputChange}
                >
                  <option value="general">General Question</option>
                  <option value="order">Order Support</option>
                  <option value="delivery">Delivery Issues</option>
                  <option value="product">Product Request</option>
                  <option value="complaint">Complaint</option>
                  <option value="compliment">Compliment</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Brief description of your inquiry"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="5"
                  placeholder="Please provide details about your inquiry..."
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    📧 Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;