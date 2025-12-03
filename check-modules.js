try {
    require('helmet');
    console.log('helmet ok');
    require('express-rate-limit');
    console.log('rate-limit ok');
    require('express-mongo-sanitize');
    console.log('mongo-sanitize ok');
    require('xss-clean');
    console.log('xss-clean ok');
} catch (e) {
    console.error(e);
}
