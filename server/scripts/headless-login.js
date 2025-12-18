const puppeteer = require('puppeteer');

(async ()=>{
  const url = process.env.ADMIN_URL || 'http://127.0.0.1:3000/admin/index.html';
  const email = process.env.ADMIN_EMAIL || '';
  const password = process.env.ADMIN_PASSWORD || '';
  console.log('Starting headless browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  page.on('console', msg => console.log('PAGE LOG>', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR>', err.message));
  page.on('pageerror', err => console.log('PAGE ERROR STACK>', err.stack));
  page.on('response', async res => {
    try{
      const url = res.url();
      if(url.includes('/api/login')){
        console.log('LOGIN RESPONSE STATUS', res.status());
        const t = await res.text().catch(()=>null);
        console.log('LOGIN RESPONSE BODY', t);
      }
    }catch(e){ console.log('response handler error', e.message); }
  });
  page.on('request', req => {
    try{
      const u = req.url();
      if(u.includes('/api')){
        console.log('REQUEST>', req.method(), u, req.postData ? 'POSTDATA:' + req.postData() : '');
      }
    }catch(e){}
  });

  try{
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('Page loaded');
    await page.type('#email', email, { delay: 30 });
    await page.type('#password', password, { delay: 30 });
    console.log('Submitting login form...');
    await page.click('#login-submit');
    // wait a short while for any network activity
    await new Promise(r=>setTimeout(r,1200));

    // check dashboard visibility
    const dashboardVisible = await page.evaluate(()=>{ const d=document.getElementById('dashboard'); return !!(d && !d.hidden); });
    console.log('DASHBOARD_VISIBLE', dashboardVisible);

    // capture any JS errors logged after submit
    await new Promise(r=>setTimeout(r,800));

    await browser.close();
    process.exit(dashboardVisible?0:2);
  }catch(err){
    console.error('Headless test error:', err && err.message);
    try{ await browser.close(); }catch(e){}
    process.exit(1);
  }
})();
