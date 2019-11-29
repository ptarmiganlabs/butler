// Set up REST endpoint for Docker healthchecks

var httpHealth = require('http');

var optionsHealth = {
    host: 'localhost',
    port: '12398',
    timeout: 2000,
};

var requestHealth = httpHealth.request(optionsHealth, res => {
    console.log(`STATUS Docker health: ${res.statusCode}`);
    if (res.statusCode == 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

requestHealth.on('error', function (err) {
    console.log('ERROR Docker health:');
    console.log(err);
    process.exit(1);
});

requestHealth.end();
