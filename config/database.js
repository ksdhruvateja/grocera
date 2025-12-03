const mongoose = require('mongoose');

// Production-ready database configuration for 100k+ users
class DatabaseConfig {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  // Get optimized connection options for production
  getConnectionOptions() {
    return {
      // Connection pooling for high concurrency
      maxPoolSize: 50, // Maximum connections in pool
      minPoolSize: 5,  // Minimum connections to maintain
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      
      // Connection timeouts
      serverSelectionTimeoutMS: 5000, // How long to try selecting server
      socketTimeoutMS: 45000, // How long socket stays open
      connectTimeoutMS: 10000, // How long to try connecting
      
      // Heartbeat and monitoring
      heartbeatFrequencyMS: 10000, // Check server every 10s
      
      // Write concern for data durability
      writeConcern: {
        w: 'majority', // Wait for majority of replica set
        j: true, // Wait for journal
        wtimeout: 5000 // Timeout after 5s
      },
      
      // Read preference for performance
      readPreference: 'primaryPreferred', // Prefer primary, fallback to secondary
      
      // Buffer settings
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      
      // Additional production settings
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Authentication
      authSource: 'admin',
      
      // SSL/TLS for production
      ssl: process.env.NODE_ENV === 'production',
      sslValidate: process.env.NODE_ENV === 'production'
    };
  }

  // Get database URI based on environment
  getDatabaseURI() {
    if (process.env.NODE_ENV === 'production') {
      // MongoDB Atlas or production cluster
      return process.env.MONGODB_PRODUCTION_URI || 
             `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
    } else if (process.env.NODE_ENV === 'development') {
      // Development database
      return process.env.MONGODB_DEV_URI || 'mongodb://localhost:27017/rbs-grocery-dev';
    } else {
      // Test database
      return process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/rbs-grocery-test';
    }
  }

  // Connect to MongoDB with retry logic
  async connect() {
    const dbURI = this.getDatabaseURI();
    const options = this.getConnectionOptions();

    try {
      console.log(`🔗 Connecting to MongoDB (${process.env.NODE_ENV || 'development'})...`);
      
      await mongoose.connect(dbURI, options);
      
      this.isConnected = true;
      this.connectionRetries = 0;
      
      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🔧 Pool size: ${options.maxPoolSize} connections`);
      
      // Set up connection event listeners
      this.setupEventListeners();
      
      // Optimize for production
      await this.setupProductionOptimizations();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      await this.handleConnectionError(error);
    }
  }

  // Setup event listeners for connection monitoring
  setupEventListeners() {
    const db = mongoose.connection;

    db.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    db.on('error', (err) => {
      console.error('🔴 Mongoose connection error:', err);
    });

    db.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected');
      this.isConnected = false;
    });

    db.on('reconnected', () => {
      console.log('🔄 Mongoose reconnected');
      this.isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  // Handle connection errors with retry logic
  async handleConnectionError(error) {
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      console.log(`🔄 Retrying connection (${this.connectionRetries}/${this.maxRetries}) in ${this.retryDelay}ms...`);
      
      setTimeout(() => {
        this.connect();
      }, this.retryDelay);
    } else {
      console.error('💀 Max retry attempts reached. Exiting...');
      process.exit(1);
    }
  }

  // Production optimizations
  async setupProductionOptimizations() {
    if (process.env.NODE_ENV !== 'production') return;

    try {
      const db = mongoose.connection.db;
      
      // Enable profiler for slow queries (>100ms)
      await db.admin().command({
        profile: 2,
        slowms: 100
      });
      
      console.log('⚡ Production optimizations enabled');
    } catch (error) {
      console.warn('⚠️ Could not enable production optimizations:', error.message);
    }
  }

  // Create database indexes for performance
  async createIndexes() {
    try {
      console.log('📊 Creating database indexes...');
      
      // User model indexes
      const User = require('../models/User');
      await User.collection.createIndex({ email: 1 }, { unique: true, background: true });
      await User.collection.createIndex({ email: 1, isActive: 1 }, { background: true });
      await User.collection.createIndex({ role: 1, isActive: 1 }, { background: true });
      await User.collection.createIndex({ lastActivity: 1 }, { background: true });
      await User.collection.createIndex({ stripeCustomerId: 1 }, { sparse: true, background: true });
      
      // Text search index for users
      await User.collection.createIndex(
        { firstName: 'text', lastName: 'text', email: 'text' },
        { background: true }
      );

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.warn('⚠️ Index creation warning:', error.message);
    }
  }

  // Get connection health status
  getHealth() {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    return {
      status: states[state] || 'unknown',
      isConnected: this.isConnected,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      poolSize: mongoose.connection.getClient()?.topology?.s?.poolSize || 0
    };
  }

  // Get database statistics
  async getStats() {
    if (!this.isConnected) {
      return { error: 'Database not connected' };
    }

    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        database: db.databaseName,
        collections: stats.collections,
        dataSize: Math.round(stats.dataSize / 1024 / 1024) + 'MB',
        indexSize: Math.round(stats.indexSize / 1024 / 1024) + 'MB',
        totalSize: Math.round(stats.storageSize / 1024 / 1024) + 'MB',
        documents: stats.objects,
        avgObjSize: Math.round(stats.avgObjSize) + ' bytes'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Graceful disconnection
  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('🔚 MongoDB connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }
  }

  // Test database connection
  async testConnection() {
    try {
      await mongoose.connection.db.admin().ping();
      return { success: true, message: 'Database connection is healthy' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Singleton instance
const dbConfig = new DatabaseConfig();

module.exports = {
  DatabaseConfig,
  dbConfig,
  
  // Helper functions
  connectDB: () => dbConfig.connect(),
  disconnectDB: () => dbConfig.disconnect(),
  getDBHealth: () => dbConfig.getHealth(),
  getDBStats: () => dbConfig.getStats(),
  testDB: () => dbConfig.testConnection(),
  createIndexes: () => dbConfig.createIndexes()
};