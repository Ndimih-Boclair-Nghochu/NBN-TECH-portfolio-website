const puppeteer = require('puppeteer');

(async ()=>{
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', r => console.log('REQUEST FAILED:', r.url(), r.failure()));
  page.on('response', async res => {
    try{
      const url = res.url();
      if(url.includes('/api/login')){
        const text = await res.text();
        console.log('[API LOGIN] status=', res.status(), 'body=', text);
      }
    }catch(e){ console.error('response read error', e); }
  });

  await page.goto('http://127.0.0.1:3000/admin/index.html', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#email');
  // check whether admin app set its load flag
  const adminLoaded = await page.evaluate(() => !!window.__admin_app_loaded);
  console.log('PAGE FLAG __admin_app_loaded =', adminLoaded);
  // attach a test submit listener to observe if submit events fire
  await page.evaluate(() => {
    window.__test_submit_fired = false;
    document.addEventListener('submit', (ev) => { window.__test_submit_fired = true; }, { capture: true });
  });
  await page.type('#email', 'nbntechteam@gmail.com');
  await page.type('#password', '@Boclair444');
  // click login
  await Promise.all([
    page.click('#login-submit'),
    page.waitForResponse(r => r.url().includes('/api/login') && (r.status() === 200 || r.status() === 401), { timeout: 5000 }).catch(e=>null)
  ]);
  // dump cookies
  const cookies = await page.cookies();
  console.log('Cookies:', cookies);

  // wait a bit for navigation or page changes
  await new Promise(r => setTimeout(r, 800));
  // check if projects loaded
  try{
    // wait for API projects call
    // allow navigation/reload triggered by fallback to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 4000 }).catch(e=>null);
    // check if submit event fired
    const submitFired = await page.evaluate(() => !!window.__test_submit_fired);
    console.log('Submit event fired?', submitFired);
    const resp = await page.waitForResponse(r => r.url().includes('/api/projects') && r.status() === 200, { timeout: 5000 }).catch(e=>null);
    if(resp){
      console.log('/api/projects called, status=', resp.status());
      try{ const text = await resp.text(); console.log('/api/projects body length=', text.length); }catch(e){}
      // also check DOM
      try{ await page.waitForSelector('#projects-list .project-row', { timeout: 2000 }); console.log('Projects appear to be loaded in the DOM'); }catch(e){ console.log('Projects API returned but DOM not updated'); }
    } else {
      console.log('No /api/projects response observed');
    }
  }catch(e){ console.log('Projects did not load within timeout'); }
  const content = await page.content();
  console.log('Page content length after login:', content.length);

  await browser.close();
})().catch(err=>{ console.error('Test failed', err); process.exit(2); });
