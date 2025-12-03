// ZIPPYYY Grocery Store - Logo Export
import logo from './zippyyylogo.png';

export const ZIPPYYY_LOGO = logo;

// Brand Colors
export const BRAND_COLORS = {
  primary: '#FF6B35',
  secondary: '#004E89',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// Currency
export const CURRENCY = {
  symbol: '$',
  code: 'USD',
  locale: 'en-US',
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
  }).format(amount);
};

// API Base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default {
  ZIPPYYY_LOGO,
  BRAND_COLORS,
  CURRENCY,
  formatCurrency,
  API_BASE_URL,
};
