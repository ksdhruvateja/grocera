import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages/Home.css';

function Home() {

  // Category data
  const categoriesData = [
    {
      section: 'Indian',
      label: 'Indian Categories',
      cards: [
        { to: '/products?category=Daily Essentials', icon: '🍚', title: 'Daily Essentials', desc: 'Rice, Dal, Flour & Basic Indian Staples', badge: 'Most Popular' },
        { to: '/products?category=Fruits', icon: '🥭', title: 'Fresh Fruits', desc: 'Mangoes, Guava, Pomegranate & Seasonal Fruits', badge: 'Farm Fresh' },
        { to: '/products?category=Vegetables', icon: '🍆', title: 'Indian Vegetables', desc: 'Brinjal, Okra, Bitter Gourd & Traditional Veggies', badge: 'Garden Fresh' },
        { to: '/products?category=Exotics', icon: '🌶️', title: 'Spices & Masalas', desc: 'Authentic Spices, Masalas & Hard-to-find Items', badge: 'Premium Quality' },
        { to: '/products?category=Pooja Items', icon: '🪔', title: 'Pooja Items', desc: 'Incense, Diyas, Camphor, Chandan, Ghee, Pooja Thali & more', badge: 'Spiritual' },
        { to: '/products?category=God Idols', icon: '🛕', title: 'God Idols', desc: 'Ganesh, Lakshmi, Krishna, Shiva, Durga, Hanuman & more', badge: 'Divine' },
      ],
      seeAll: { to: '/products?category=Indian', label: 'See All Indian Products' }
    },
    {
      section: 'American',
      label: 'American Categories',
      cards: [
        { to: '/products?category=American Breakfast', icon: '🥞', title: 'Breakfast & Cereals', desc: 'Pancake mix, cereals, peanut butter, maple syrup', badge: 'Classic' },
        { to: '/products?category=American Snacks', icon: '🍪', title: 'Snacks & Sweets', desc: 'Cookies, chips, candies, chocolate bars', badge: 'Popular' },
        { to: '/products?category=American Sauces', icon: '🥫', title: 'Sauces & Canned Goods', desc: 'BBQ sauce, ketchup, canned beans, soups', badge: 'Essentials' },
      ],
      seeAll: { to: '/products?category=American', label: 'See All American Products' }
    },
    {
      section: 'Chinese',
      label: 'Chinese Categories',
      cards: [
        { to: '/products?category=Chinese Noodles', icon: '🍜', title: 'Noodles & Rice', desc: 'Rice noodles, jasmine rice, instant noodles', badge: 'Staple' },
        { to: '/products?category=Chinese Sauces', icon: '🥢', title: 'Sauces & Condiments', desc: 'Soy sauce, chili oil, hoisin, oyster sauce', badge: 'Flavorful' },
        { to: '/products?category=Chinese Snacks', icon: '🥠', title: 'Snacks & Teas', desc: 'Asian snacks, fortune cookies, Chinese teas', badge: 'Unique' },
      ],
      seeAll: { to: '/products?category=Chinese', label: 'See All Chinese Products' }
    },
    {
      section: 'Turkish',
      label: 'Turkish Categories',
      cards: [
        { to: '/products?category=Turkish Sweets', icon: '🍬', title: 'Sweets & Desserts', desc: 'Turkish delight, baklava, halva', badge: 'Traditional' },
        { to: '/products?category=Turkish Staples', icon: '🍞', title: 'Breads & Staples', desc: 'Bulgur, simit, Turkish bread, olives', badge: 'Fresh' },
        { to: '/products?category=Turkish Drinks', icon: '☕', title: 'Coffee & Drinks', desc: 'Turkish coffee, teas, ayran', badge: 'Authentic' },
      ],
      seeAll: { to: '/products?category=Turkish', label: 'See All Turkish Products' }
    },
  ];

  return (
    <div className="home-exact">
      {/* Hero Section - Exact Split Layout */}
      <section className="hero-split-exact">
        <div className="hero-left-exact">
          {/* Logo + new hero content block */}
          <div className="hero-logo-center">
            <div className="home-logo-container">
              <div className="home-logo-box">
                <img
                  src={process.env.PUBLIC_URL + '/zippyyy-logo.png'}
                  alt="Zippyyy Logo"
                  className="zippyyy-logo-img-home"
                />
              </div>
            </div>
            <h1 className="company-name-hero">
              Groceries today,
              <br />
              not someday.
            </h1>
            <p className="company-tagline-hero">
              Fresh Indian, American, Chinese &amp; Turkish staples delivered when you actually need them.
            </p>

            <div className="search-shop-section">
              <Link 
                to="/products" 
                className="shop-now-btn-exact"
              >
                <span>Browse All Products</span>
              </Link>
            </div>

            <div className="hero-feature-grid">
              <div className="hero-feature-card">
                <h3>Fresh Selection</h3>
                <p>Daily-picked fruits, vegetables and dairy curated for quality.</p>
              </div>
              <div className="hero-feature-card">
                <h3>World Pantry</h3>
                <p>Spices, snacks and staples from the brands you already love.</p>
              </div>
              <div className="hero-feature-card">
                <h3>Fast Delivery</h3>
                <p>Same‑day and next‑day delivery across NYC, Queens &amp; Long Island.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="hero-right-exact">
          <div className="delivery-person-container">
            <div className="delivery-person-image">
              <img 
                src="/heading.png" 
                alt="World-Class Groceries Market"
                className="delivery-person-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextElementSibling) {
                    e.target.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="person-placeholder" style={{display: 'none'}}>
                <div className="person-icon-large">🛒</div>
                <p className="person-text">Fresh Groceries Delivered</p>
              </div>
              
              {/* Quotation Overlay */}
              <div className="quotation-overlay">
                <div className="quotation-mark quotation-mark-left">"</div>
                <p className="quotation-text">Picked up fresh groceries and healthy products just for you</p>
                <div className="quotation-mark quotation-mark-right">"</div>
              </div>
            </div>
            
            {/* Static Badges */}
            <div className="static-location-pin">
              <span className="pin-icon">📍</span>
            </div>
            
            <div className="static-fresh-badge">
              <div className="badge-icon-container">
                <div className="check-icon">✅</div>
              </div>
              <div className="badge-text-container">
                <div className="fresh-title">100% Fresh</div>
                <div className="quality-text">Quality maintain</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Sections */}
      {categoriesData.map(cat => (
        <section className="categories-section-exact" key={cat.section}>
          <div className="categories-wrapper-exact">
            <div className="section-header-exact">
              {cat.section === 'Indian' && <span className="local-title">भारतीय श्रेणियाँ</span>}
              {cat.section === 'Chinese' && <span className="local-title">中国类别</span>}
              {cat.section === 'Turkish' && <span className="local-title">Türk Kategorileri</span>}
              <h2 className="section-title-exact">{cat.label}</h2>
              <p className="section-subtitle-exact">Explore a variety of fresh, high-quality products carefully curated to meet all your culinary needs.</p>
            </div>
            
            <div className="categories-grid-exact">
              {cat.cards.map(card => (
                <Link to={card.to} className="category-card-exact" key={card.title}>
                  <div className="card-badge-exact">{card.badge}</div>
                  <div className="card-icon-exact">{card.icon}</div>
                  <h3 className="card-title-exact">{card.title}</h3>
                  <p className="card-desc-exact">{card.desc}</p>
                  <div className="card-action-exact">
                    <span className="action-text">Shop Now</span>
                    <span className="action-arrow">→</span>
                  </div>
                </Link>
              ))}
              <Link to={cat.seeAll.to} className="category-card-exact see-all-exact">
                <div className="see-all-icon-exact">🔎</div>
                <h3 className="card-title-exact">{cat.seeAll.label}</h3>
              </Link>
            </div>
          </div>
        </section>
      ))}

      {/* Why Choose Section */}
      <section className="why-choose-exact">
        <div className="why-choose-wrapper-exact">
          <h2 className="why-title-exact">Why Choose BringIt?</h2>
          <div className="why-grid-exact">
            <div className="why-card-exact">
              <div className="why-icon-exact">⚡</div>
              <h3>Lightning Fast Delivery</h3>
              <p>Same-day express delivery across NYC, Queens & Long Island. Rush delivery available.</p>
            </div>
            
            <div className="why-card-exact">
              <div className="why-icon-exact">🌎</div>
              <h3>Global Grocery Selection</h3>
              <p>Authentic groceries from India, America, China, Turkey & more.</p>
            </div>
            
            <div className="why-card-exact">
              <div className="why-icon-exact">💳</div>
              <h3>Secure Digital Payment</h3>
              <p>Safe payments. Multiple payment options for your convenience.</p>
            </div>
            
            <div className="why-card-exact">
              <div className="why-icon-exact">🎉</div>
              <h3>Festival & Holiday Specials</h3>
              <p>Special products for Indian, American, Chinese, Turkish and global festivals.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
