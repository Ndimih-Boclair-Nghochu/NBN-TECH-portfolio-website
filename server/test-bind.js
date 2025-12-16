const http = require('http');
const PORT = 3000;
const server = http.createServer((req,res)=>{
  res.writeHead(200, {'Content-Type':'text/plain'});
  res.end('ok');
});
server.listen(PORT, '0.0.0.0', () => {
  console.log('test-bind: listening on ' + PORT + ' PID=' + process.pid);
});
setInterval(()=> console.log(new Date().toISOString() + ' tick PID=' + process.pid), 3000);
process.on('uncaughtException', e=> console.error('uncaught', e));
process.on('exit', c=> console.log('exiting', c));
