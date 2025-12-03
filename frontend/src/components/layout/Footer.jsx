import React from 'react';
import logo from '../../assets/zippyyylogo.png';

const products = [
  { label: 'American Groceries', href: '#' },
  { label: 'Asian Groceries', href: '#' },
  { label: 'Snacks', href: '#' },
  { label: 'Beverages', href: '#' },
];

const topics = [
  { label: 'Daily Essentials', href: '#' },
  { label: 'World Foods', href: '#' },
  { label: 'Offers', href: '#' },
  { label: 'Same-Day Delivery', href: '#' },
];

const company = [
  { label: 'About', href: '#' },
  { label: 'Contact', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Terms', href: '#' },
];

const support = [
  { label: 'Help Center', href: '#' },
  { label: 'FAQ', href: '#' },
  { label: 'Refund Policy', href: '#' },
  { label: 'Privacy Policy', href: '#' },
];

function Footer() {
  return (
    <footer className="bg-slate-950 text-gray-300 pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Left column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Zippyyy" className="h-10 w-10 rounded-md object-cover" />
              <span className="text-lg font-semibold">Zippyyy</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Zippyyy delivers world foods and essentials same-day across our cities.
              Fresh groceries, international snacks, and household items — fast, reliable,
              and easy.
            </p>
            {/* Social icons (placeholders) */}
            <div className="flex items-center gap-3 mt-6">
              {['IG', 'FB', 'YT', 'X', 'Pi', 'TT'].map((txt) => (
                <a key={txt} href="#" className="w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs text-gray-300 transition-colors" aria-label={txt}>
                  {txt}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-300 mb-4">Products</h3>
            <div className="space-y-2">
              {products.map((item) => (
                <a key={item.label} href={item.href} className="block text-sm text-gray-400 hover:text-white transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-300 mb-4">Topics</h3>
            <div className="space-y-2">
              {topics.map((item) => (
                <a key={item.label} href={item.href} className="block text-sm text-gray-400 hover:text-white transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-300 mb-4">Company</h3>
            <div className="space-y-2">
              {company.map((item) => (
                <a key={item.label} href={item.href} className="block text-sm text-gray-400 hover:text-white transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-300 mb-4">Support</h3>
            <div className="space-y-2">
              {support.map((item) => (
                <a key={item.label} href={item.href} className="block text-sm text-gray-400 hover:text-white transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
          <span>© 2025 Zippyyy. All rights reserved.</span>
          <span>Last updated: 2025-12-03 23:00 IST</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
