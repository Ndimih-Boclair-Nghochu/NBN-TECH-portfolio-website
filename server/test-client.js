const http = require('http');
http.get('http://127.0.0.1:3000/', (res)=>{
  console.log('STATUS', res.statusCode);
  res.setEncoding('utf8');
  let body='';
  res.on('data', d=> body+=d);
  res.on('end', ()=> console.log('BODY', body));
}).on('error', e=> console.error('ERR', e));
