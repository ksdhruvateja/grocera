import React from 'react';
import { ZIPPYYY_LOGO } from '../../assets';

const Header = () => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={ZIPPYYY_LOGO} 
              alt="ZIPPYYY Grocery" 
              className="h-12 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="/" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
              Home
            </a>
            <a href="/products" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
              Products
            </a>
            <a href="/about" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
              About
            </a>
            <a href="/contact" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
              Contact
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="btn-primary">
              Login
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
