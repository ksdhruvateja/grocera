import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false
};

// Admin emails that should automatically redirect to admin panel
const adminEmails = [
  'admin@rbsgrocery.com',
  'rbsadmin@gmail.com',
  'manager@rbsgrocery.com',
  'boss@rbsgrocery.com',           // Add your custom email here
  'owner@rbsgrocery.com',          // Add another admin email
  // Add more admin emails as needed
];

// Admin password required for admin access
const ADMIN_PASSWORD = 'admin123';

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      // Prevent unnecessary re-renders if loading state hasn't changed
      if (state.isLoading === action.payload) return state;
      return { ...state, isLoading: action.payload };
      
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      };
      
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
      
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
      
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const isAdminUser = (userData) => {
    if (!userData) return false;
    
    // Check by role
    if (userData.role === 'admin') return true;
    
    // Check by email
    if (adminEmails.includes(userData.email?.toLowerCase())) return true;
    
    return false;
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        if (mounted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
        return;
      }

      // Check if token is a demo token (not from real API)
      if (token.startsWith('admin_token_') || token.startsWith('user_token_')) {
        // Parse demo user from token
        const storedUser = localStorage.getItem('demoUser');
        if (storedUser && mounted) {
          try {
            const user = JSON.parse(storedUser);
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: { user, token }
            });
          } catch (e) {
            localStorage.removeItem('token');
            localStorage.removeItem('demoUser');
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          localStorage.removeItem('token');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
        return;
      }

      // Real API token - try to fetch profile
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/profile');
        
        if (!mounted) return;
        
        let user = response.data.user;
        
        // Auto-assign admin role if email is in admin list
        if (adminEmails.includes(user.email?.toLowerCase()) && user.role !== 'admin') {
          user = { ...user, role: 'admin' };
        }
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token }
        });
      } catch (error) {
        if (!mounted) return;
        
        console.error('Auth initialization failed:', error);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        dispatch({ type: 'LOGOUT' });
      }
    };

    initializeAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials) => {
    try {
      // Check if user email is in admin list and validate admin password
      if (adminEmails.includes(credentials.email?.toLowerCase())) {
        // Require admin password for admin access
        if (credentials.password !== ADMIN_PASSWORD) {
          return {
            success: false,
            message: 'Invalid admin credentials. Please use the correct admin password.'
          };
        }
        
        // Create admin user object
        const adminUser = {
          id: 'admin_' + Date.now(),
          name: 'Admin User',
          email: credentials.email,
          role: 'admin'
        };
        
        // Generate a fake token for admin
        const adminToken = 'admin_token_' + Date.now();
        
        localStorage.setItem('token', adminToken);
        localStorage.setItem('demoUser', JSON.stringify(adminUser));
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: adminUser, token: adminToken }
        });
        
        return { success: true, user: adminUser };
      }
      
      // For non-admin users, try API call or create regular user
      try {
        const response = await api.post('/auth/login', credentials);
        let { token, user } = response.data;
        
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token }
        });
        
        return { success: true, user };
      } catch (apiError) {
        // If API fails, create a regular user for demo purposes
        const regularUser = {
          id: 'user_' + Date.now(),
          name: credentials.name || 'Customer',
          email: credentials.email,
          role: 'customer'
        };
        
        const userToken = 'user_token_' + Date.now();
        
        localStorage.setItem('token', userToken);
        localStorage.setItem('demoUser', JSON.stringify(regularUser));
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: regularUser, token: userToken }
        });
        
        return { success: true, user: regularUser };
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: 'Login failed. Please check your credentials.'
      };
    }
  };

  const register = async (userData) => {
    try {
      // Check if user email is in admin list and validate admin password
      if (adminEmails.includes(userData.email?.toLowerCase())) {
        // Require admin password for admin registration
        if (userData.password !== ADMIN_PASSWORD) {
          return {
            success: false,
            message: 'Invalid admin credentials. Admin accounts require the specific admin password.'
          };
        }
        
        // Create admin user object
        const adminUser = {
          id: 'admin_' + Date.now(),
          name: userData.name,
          email: userData.email,
          role: 'admin'
        };
        
        // Generate a fake token for admin
        const adminToken = 'admin_token_' + Date.now();
        
        localStorage.setItem('token', adminToken);
        localStorage.setItem('demoUser', JSON.stringify(adminUser));
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: adminUser, token: adminToken }
        });
        
        return { success: true, user: adminUser };
      }
      
      // For non-admin users, try API call or create regular user
      try {
        const response = await api.post('/auth/register', userData);
        let { token, user } = response.data;
        
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token }
        });
        
        return { success: true, user };
      } catch (apiError) {
        // If API fails, create a regular user for demo purposes
        const regularUser = {
          id: 'user_' + Date.now(),
          name: userData.name,
          email: userData.email,
          role: 'customer'
        };
        
        const userToken = 'user_token_' + Date.now();
        
        localStorage.setItem('token', userToken);
        localStorage.setItem('demoUser', JSON.stringify(regularUser));
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: regularUser, token: userToken }
        });
        
        return { success: true, user: regularUser };
      }
      
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('demoUser');
    delete api.defaults.headers.common['Authorization'];
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      let user = response.data.user;
      
      // Auto-assign admin role if email is in admin list
      if (adminEmails.includes(user.email?.toLowerCase()) && user.role !== 'admin') {
        user = { ...user, role: 'admin' };
      }
      
      dispatch({
        type: 'UPDATE_USER',
        payload: user
      });
      return { success: true, user };
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Profile update failed'
      };
    }
  };

  const value = {
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    isAdmin: state.user ? isAdminUser(state.user) : false,
    isAdminUser,
    adminEmails,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}