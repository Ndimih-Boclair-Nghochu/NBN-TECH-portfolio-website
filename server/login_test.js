const http = require('http');
const data = JSON.stringify({ email: 'ndimihboclair4@gmail.com', password: '@Boclair444' });
const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let body = '';
  res.on('data', d => body += d.toString());
  res.on('end', () => { console.log('Body:', body); });
});
req.on('error', (e) => console.error('Err', e));
req.write(data);
req.end();
