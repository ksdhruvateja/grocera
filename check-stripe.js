require('dotenv').config();
try {
    console.log('Checking stripe module...');
    const stripeLib = require('stripe');
    console.log('Stripe module loaded.');

    const key = process.env.STRIPE_SECRET_KEY;
    console.log('Stripe Key present:', !!key);

    if (!key) {
        console.error('❌ STRIPE_SECRET_KEY is missing!');
    } else {
        const stripe = stripeLib(key);
        console.log('Stripe initialized.');
    }
} catch (e) {
    console.error('❌ Error:', e);
}
