try {
    console.log('Checking auth...');
    require('./routes/auth');
    console.log('auth ok');

    console.log('Checking products...');
    require('./routes/products');
    console.log('products ok');

    console.log('Checking cart...');
    require('./routes/cart');
    console.log('cart ok');

    console.log('Checking orders...');
    require('./routes/orders');
    console.log('orders ok');

    console.log('Checking contact...');
    require('./routes/contact');
    console.log('contact ok');

    console.log('Checking payments...');
    require('./routes/payments');
    console.log('payments ok');

    console.log('Checking admin...');
    require('./routes/admin');
    console.log('admin ok');
} catch (e) {
    console.error('❌ Route Error:', e);
}
