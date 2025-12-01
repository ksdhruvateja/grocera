const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(helmet());

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rbs-grocery';
console.log('Connecting to:', mongoURI);

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Error:', err.message);
        // Don't exit, just log
    });

app.get('/', (req, res) => res.send('Hello'));
app.listen(5002, () => console.log('Test server running on 5002'));
