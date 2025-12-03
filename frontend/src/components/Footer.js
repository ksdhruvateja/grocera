import React from 'react';
import '../styles/components/Footer.css';

function Footer() {
  return (
    <footer className="footer zippyyy-footer-glass">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section zippyyy-footer-brand">
            <img src={process.env.PUBLIC_URL + '/zippyyy-logo.png'} alt="Zippyyy Logo" className="zippyyy-logo-img" style={{height:48, width:48, marginBottom:8}} />
            <h4>Zippyyy</h4>
            <p>Delivered Today. Groceries, snacks, and more—faster than ever!</p>
            <div className="footer-contact">
              <p>🚀 Serving NYC • Queens • Long Island</p>
              <p>⏰ Same-Day to 1-Day Delivery</p>
              <p>🌟 5000+ World Groceries</p>
            </div>
          </div>
          <div className="footer-section">
            <h4>🛒 Quick Links</h4>
            <ul>
              <li><a href="/products">Browse Products</a></li>
              <li><a href="/contact">Contact Support</a></li>
              <li><a href="/register">Join Zippyyy Family</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>🌍 Featured World Categories</h4>
            <ul>
              <li><a href="/products?category=Daily+Essentials">🍚 Daily Essentials</a></li>
              <li><a href="/products?category=Fruits">🥭 Fresh Fruits</a></li>
              <li><a href="/products?category=American+Breakfast">🥞 American Breakfast</a></li>
              <li><a href="/products?category=Chinese+Noodles">🍜 Chinese Noodles</a></li>
              <li><a href="/products?category=Turkish+Sweets">🍬 Turkish Sweets</a></li>
              <li><a href="/products?category=Pooja+Items">🪔 Pooja Items</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>🚚 Delivery Areas</h4>
            <ul>
              <li>🌆 Manhattan, NYC</li>
              <li>👑 Queens, NY</li>
              <li>🏖️ Long Island, NY</li>
              <li>📍 Nassau County</li>
              <li>📍 Suffolk County</li>
              <li>+ More NY Areas</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-brand">
            <p>&copy; 2025 Zippyyy. Made with 💙 Just for you.</p>
          </div>
          <div className="footer-badges">
            <span className="quality-badge">✅ 100% Authentic</span>
            <span className="delivery-badge">⚡ Express Delivery</span>
            <span className="fresh-badge">🌱 Farm Fresh</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;