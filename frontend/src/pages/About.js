import React from 'react';
import '../styles/pages/About.css';

export default function About() {
  return (
    <div className="about-page-container" style={{padding: '2.5rem 1.5rem', maxWidth: 900, margin: '0 auto'}}>
      <h1 className="about-title" style={{textAlign: 'center', marginBottom: '2rem', color: '#1e90ff'}}>Why Choose BringIt?</h1>
      <div style={{fontSize: '1.15rem', color: '#222', lineHeight: 1.7}}>
        <p><b>BringIt</b> is your one-stop shop for world-class groceries, delivering the freshest products from Indian, American, Chinese, Turkish, and global brands right to your doorstep. We pride ourselves on our <b>fast turnaround</b>. Most orders are delivered within <b>2 to 24 hours</b> across NYC, Queens, and Long Island.</p>
        <ul style={{margin: '1.5rem 0 1.5rem 1.5rem', padding: 0, color: '#1e90ff'}}>
          <li><b>Super-Fast Delivery:</b> Get your groceries in as little as 2 hours, guaranteed within 24 hours.</li>
          <li><b>Freshness First:</b> We source daily to ensure you receive only the freshest produce and products.</li>
          <li><b>Global Variety:</b> Shop authentic groceries from India, America, China, Turkey, and more—all in one place.</li>
          <li><b>Festival & Holiday Specials:</b> Unique selections for Diwali, Thanksgiving, Lunar New Year, Eid, and other global celebrations.</li>
          <li><b>Secure Payments:</b> Multiple digital payment options, including OTC & EBT cards.</li>
          <li><b>Trusted by Families:</b> Thousands of happy customers rely on Zippyyyfor quality, speed, and service.</li>
        </ul>
        <p style={{color:'#444'}}>Experience the difference with BringIt. Where convenience, freshness, and global flavors meet. <b>Why settle for less? Choose Zippyyyfor your next grocery delivery!</b></p>
      </div>
    </div>
  );
}
