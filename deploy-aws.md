# AWS EC2 Deployment Guide - RBS Grocery Backend

Complete step-by-step guide for deploying the Node.js backend to AWS EC2 (t2.micro free tier).

---

## Prerequisites
- AWS Account with free tier eligibility
- Domain name (optional, for SSL)
- MongoDB Atlas cluster already set up
- Local repository with latest changes committed

---

## ☑️ 1. Launch EC2 Instance (Ubuntu 22.04)

### 1.1 Create EC2 Instance
```bash
# Via AWS Console:
# 1. Go to EC2 Dashboard → Launch Instance
# 2. Name: rbs-grocery-backend
# 3. AMI: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
# 4. Instance type: t2.micro (Free tier eligible)
# 5. Key pair: Create new or select existing (.pem file)
# 6. Storage: 8 GB gp3 (default)
# 7. Launch Instance
```

### 1.2 Note Your Instance Details
- **Public IPv4 Address**: `YOUR_EC2_PUBLIC_IP`
- **Private Key**: Save your `.pem` file securely (e.g., `rbs-grocery-key.pem`)

---

## ☑️ 2. Configure Security Groups

### 2.1 Edit Inbound Rules
```bash
# Via AWS Console:
# EC2 → Security Groups → Select your instance's security group → Edit inbound rules

# Add these rules:
Type            Protocol    Port Range    Source          Description
SSH             TCP         22            My IP           SSH access
HTTP            TCP         80            0.0.0.0/0       HTTP traffic
HTTPS           TCP         443           0.0.0.0/0       HTTPS traffic
Custom TCP      TCP         5000          0.0.0.0/0       Node.js API (temp, remove after nginx setup)
```

---

## ☑️ 3. SSH Setup & Initial Server Configuration

### 3.1 Connect to EC2 Instance
```bash
# Set correct permissions for your key
chmod 400 rbs-grocery-key.pem

# SSH into your instance
ssh -i rbs-grocery-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 3.2 Update System & Install Dependencies
```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version

# Install Git
sudo apt install -y git

# Install build essentials for native modules
sudo apt install -y build-essential
```

---

## ☑️ 4. Clone Repository & Install Dependencies

### 4.1 Clone Your Repository
```bash
# Navigate to home directory
cd ~

# Clone repository (replace with your repo URL)
git clone https://github.com/ksdhruvateja/grocera.git

# Navigate to project directory
cd grocera
```

### 4.2 Install Dependencies
```bash
# Clean install from package-lock.json
npm ci

# Note: No build step needed for this Express API
# If you add TypeScript later, run: npm run build
```

---

## ☑️ 5. PM2 Process Manager Setup

### 5.1 Install PM2 Globally
```bash
sudo npm install -g pm2
```

### 5.2 Create PM2 Ecosystem Configuration
```bash
# Create ecosystem.config.js in project root
nano ecosystem.config.js
```

**Copy this configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'rbs-grocery-api',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true
  }]
};
```

### 5.3 Create Logs Directory
```bash
mkdir -p logs
```

### 5.4 Start Application with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Set PM2 to start on system boot
pm2 startup systemd
# Copy and run the command PM2 outputs
```

### 5.5 Verify PM2 Status
```bash
# Check application status
pm2 status

# View logs
pm2 logs rbs-grocery-api

# Monitor resources
pm2 monit
```

---

## ☑️ 6. Environment Variables (.env Production)

### 6.1 Create Production .env File
```bash
# Create .env file in project root
nano .env
```

**Copy this template and fill in your values:**
```env
# Server Configuration
NODE_ENV=production
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/rbs-grocery?retryWrites=true&w=majority

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars-long

# Stripe (Production Keys)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY

# AWS S3 (for product images)
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=rbs-grocery-products

# Frontend URL (update with your domain)
FRONTEND_URL=https://yourdomain.com

# Redis (optional, for caching)
# REDIS_URL=redis://localhost:6379

# Email Service (optional, for notifications)
# EMAIL_SERVICE=gmail
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-password
```

### 6.2 Generate Secure JWT Secret
```bash
# Generate a random 32-byte secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6.3 Restart PM2 with New Environment
```bash
pm2 restart rbs-grocery-api --update-env
```

---

## ☑️ 7. Nginx Reverse Proxy Configuration

### 7.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 7.2 Create Nginx Configuration
```bash
# Create new site configuration
sudo nano /etc/nginx/sites-available/rbs-grocery
```

**Copy this configuration:**
```nginx
# Upstream backend
upstream rbs_grocery_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# HTTP Server (will redirect to HTTPS after SSL setup)
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain
    
    # For Certbot verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://rbs_grocery_backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://rbs_grocery_backend;
        proxy_http_version 1.1;
        
        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Health check
    location /api/health {
        proxy_pass http://rbs_grocery_backend;
        access_log off;
    }
    
    # File uploads (larger body size)
    client_max_body_size 10M;
}
```

### 7.3 Enable Site & Test Configuration
```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/rbs-grocery /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### 7.4 Verify Nginx Status
```bash
sudo systemctl status nginx
```

---

## ☑️ 8. SSL Certificate with Certbot (Let's Encrypt)

### 8.1 Install Certbot
```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificate
```bash
# Replace with your email and domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# 1. Enter email address
# 2. Agree to Terms of Service
# 3. Choose whether to redirect HTTP to HTTPS (choose 2 for redirect)
```

### 8.3 Verify SSL Certificate
```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is set up via systemd timer
sudo systemctl status certbot.timer
```

### 8.4 Updated Nginx Configuration (After SSL)
Certbot automatically updates your nginx config. Verify it looks like this:
```bash
sudo nano /etc/nginx/sites-available/rbs-grocery
```

**Should now include SSL configuration:**
```nginx
# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # ... rest of your proxy configuration ...
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## ☑️ 9. MongoDB Atlas IP Whitelist

### 9.1 Get EC2 Public IP
```bash
# From EC2 instance, run:
curl -4 icanhazip.com
```

### 9.2 Add IP to MongoDB Atlas
```bash
# Via MongoDB Atlas Console:
# 1. Go to your cluster → Network Access
# 2. Click "Add IP Address"
# 3. Enter your EC2 public IP: YOUR_EC2_PUBLIC_IP/32
# 4. Comment: "EC2 Production Server"
# 5. Click "Confirm"

# Alternative: Allow all IPs (less secure, not recommended for production)
# IP Address: 0.0.0.0/0
```

### 9.3 Test MongoDB Connection
```bash
# From EC2 instance, test connection
cd ~/grocera
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ MongoDB connected')).catch(err => console.error('❌ MongoDB error:', err));"
```

---

## ☑️ 10. AWS S3 Setup for Product Images

### 10.1 Create S3 Bucket
```bash
# Via AWS Console:
# 1. Go to S3 → Create bucket
# 2. Bucket name: rbs-grocery-products (must be globally unique)
# 3. Region: us-east-1 (or your preferred region)
# 4. Block all public access: UNCHECK (we'll use bucket policy)
# 5. Create bucket
```

### 10.2 Configure S3 Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rbs-grocery-products/*"
    }
  ]
}
```

### 10.3 Enable CORS for S3 Bucket
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 10.4 Create IAM User for S3 Access
```bash
# Via AWS Console:
# 1. Go to IAM → Users → Add user
# 2. User name: rbs-grocery-s3-user
# 3. Access type: Programmatic access
# 4. Permissions: Attach policy "AmazonS3FullAccess" (or create custom policy)
# 5. Save Access Key ID and Secret Access Key
```

### 10.5 Install AWS SDK
```bash
cd ~/grocera
npm install aws-sdk multer-s3
```

### 10.6 Update Upload Middleware for S3

**Create new file: `middleware/s3-upload.js`**
```javascript
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Configure AWS SDK
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new aws.S3();

// Multer S3 configuration
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'products/' + uniqueSuffix + path.extname(file.originalname);
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
    }
  }
});

module.exports = upload;
```

### 10.7 Update Product Routes for S3

**Patch for `routes/products.js`:**
```javascript
// Replace local upload with S3 upload
// OLD:
// const upload = require('../middleware/upload');

// NEW:
const upload = process.env.NODE_ENV === 'production' 
  ? require('../middleware/s3-upload')
  : require('../middleware/upload');

// Product image upload route remains the same
router.post('/:id/image', 
  auth, 
  authorize(['admin']), 
  upload.single('image'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      // For S3, file.location contains the public URL
      const imageUrl = req.file.location || `/uploads/${req.file.filename}`;

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { image: imageUrl },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({
        message: 'Image uploaded successfully',
        imageUrl: product.image,
        product
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  }
);
```

### 10.8 Deploy S3 Changes
```bash
# Commit changes
git add .
git commit -m "Add S3 upload support for production"
git push origin main

# Pull on EC2
cd ~/grocera
git pull origin main

# Install new dependencies
npm ci

# Restart PM2
pm2 restart rbs-grocery-api --update-env
```

---

## ☑️ 11. Seed Admin User & Verify Deployment

### 11.1 Create Admin User
```bash
cd ~/grocera
node create-admin.js
```

### 11.2 Verify API Health
```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Test login
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rbsgrocery.com","password":"admin123"}'
```

---

## ☑️ 12. Final Security & Optimization

### 12.1 Remove Direct Port 5000 Access
```bash
# Via AWS Console:
# EC2 → Security Groups → Edit inbound rules
# Remove the Custom TCP rule for port 5000 (only keep 22, 80, 443)
```

### 12.2 Set Up CloudWatch Monitoring (Optional)
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

### 12.3 Configure Log Rotation
```bash
# PM2 handles log rotation automatically
# Verify PM2 log rotation settings
pm2 install pm2-logrotate

# Configure rotation (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 12.4 Set Up Daily Backups (MongoDB Atlas)
```bash
# Via MongoDB Atlas Console:
# Cluster → Backup → Enable Continuous Backup
# Set retention period and schedule
```

---

## ☑️ 13. Useful Commands for Management

### 13.1 PM2 Commands
```bash
# View logs
pm2 logs rbs-grocery-api

# Monitor resources
pm2 monit

# Restart application
pm2 restart rbs-grocery-api

# Stop application
pm2 stop rbs-grocery-api

# View process details
pm2 show rbs-grocery-api

# Clear logs
pm2 flush
```

### 13.2 Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### 13.3 System Monitoring
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep node
```

---

## ☑️ 14. Deployment Checklist

- [ ] EC2 instance launched (Ubuntu 22.04, t2.micro)
- [ ] Security groups configured (22, 80, 443)
- [ ] Node.js 18.x installed
- [ ] Repository cloned and dependencies installed
- [ ] PM2 ecosystem configured and running
- [ ] Production `.env` file created with all credentials
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate obtained and configured
- [ ] MongoDB Atlas IP whitelist updated
- [ ] S3 bucket created and configured
- [ ] S3 upload middleware integrated
- [ ] Admin user created
- [ ] API health check returns 200
- [ ] Port 5000 removed from security group
- [ ] Domain DNS pointing to EC2 public IP
- [ ] WebSocket connections working
- [ ] Image uploads working via S3

---

## 🔧 Troubleshooting

### Issue: Cannot connect to MongoDB
```bash
# Check environment variables
cd ~/grocera && cat .env | grep MONGODB_URI

# Test connection
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(err => console.error(err));"

# Verify IP whitelist in MongoDB Atlas
```

### Issue: Nginx 502 Bad Gateway
```bash
# Check if Node.js is running
pm2 status

# Check PM2 logs
pm2 logs rbs-grocery-api

# Restart application
pm2 restart rbs-grocery-api

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: SSL Certificate Not Working
```bash
# Verify certificate files exist
sudo ls -la /etc/letsencrypt/live/yourdomain.com/

# Test SSL configuration
sudo nginx -t

# Renew certificate manually
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: File Upload Fails
```bash
# Check S3 credentials in .env
cat .env | grep AWS_

# Verify IAM user permissions
# Check S3 bucket policy allows public read
# Test S3 access from EC2
aws s3 ls s3://rbs-grocery-products/
```

---

## 📊 Performance Optimization Tips

1. **Enable Nginx Gzip Compression**
```nginx
# Add to /etc/nginx/nginx.conf in http block
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

2. **Configure Node.js Memory Limits**
```javascript
// In ecosystem.config.js
node_args: '--max-old-space-size=400'
```

3. **Use CloudFront CDN for S3 Assets**
```bash
# Create CloudFront distribution pointing to S3 bucket
# Update product image URLs to use CloudFront domain
```

4. **Enable Redis Caching**
```bash
sudo apt install redis-server
# Update REDIS_URL in .env
# REDIS_URL=redis://localhost:6379
```

---

## 🚀 Continuous Deployment Setup

### Auto-deploy on Git Push (Optional)
```bash
# Install webhook listener
cd ~
npm install -g pm2-githook

# Configure webhook
pm2 install pm2-githook
pm2 set pm2-githook:port 8888
pm2 set pm2-githook:apps '{"rbs-grocery-api":{"secret":"YOUR_WEBHOOK_SECRET","prehook":"git pull && npm ci","posthook":"pm2 restart rbs-grocery-api"}}'

# Add webhook URL to GitHub:
# http://YOUR_EC2_IP:8888
```

---

**Deployment Complete! 🎉**

Your RBS Grocery backend is now live at `https://yourdomain.com/api`
