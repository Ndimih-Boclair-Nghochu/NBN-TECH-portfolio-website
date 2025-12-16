const puppeteer = require('puppeteer');

(async ()=>{
  const url = 'http://127.0.0.1:3000/admin/index.html';
  const email = 'nbntechteam@gmail.com';
  const password = '@Boclair444';
  console.log('Headless settings UI test starting...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  page.on('console', msg => console.log('PAGE LOG>', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR>', err.message));
  page.on('response', async res => {
    try{
      const u = res.url();
      if(u.includes('/api/settings')){
        console.log('API SETTINGS RESP', res.status(), await res.text().catch(()=>null));
      }
      if(u.includes('/api/login')){
        console.log('API LOGIN RESP', res.status(), await res.text().catch(()=>null));
      }
    }catch(e){ console.log('resp handler', e.message); }
  });

  try{
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.type('#email', email, { delay: 30 });
    await page.type('#password', password, { delay: 30 });
    await page.click('#login-submit');
    await page.waitForSelector('#dashboard', { visible: true });
    console.log('Logged in, dashboard visible');

    // open settings tab
    await page.click('.admin-tab[data-section="settings"]');
    await page.waitForSelector('#settings-form', { visible: true });
    console.log('Settings form visible');
    // debug: dump settings section HTML snippet
    const settingsHtml = await page.evaluate(()=>{ const s = document.getElementById('section-settings'); return s ? s.innerHTML.slice(0,2000) : null; });
    console.log('SECTION-SETTINGS HTML PREVIEW:', settingsHtml ? settingsHtml.replace(/\n/g,' ').slice(0,500) : 'null');

    // add a platform via add form
    const newPlatform = 'Telegram-Test-UI';
    await page.waitForSelector('#platform-add-form', { visible: true });
    await page.waitForSelector('#platform-add-form input[name="newPlatform"]', { visible: true });
    await page.focus('#platform-add-form input[name="newPlatform"]');
    await page.evaluate((v)=>{ const el = document.querySelector('#platform-add-form input[name="newPlatform"]'); if(el) el.value = v; }, newPlatform);
    await page.click('#platform-add-form button');
    // ensure it appears in list
    await page.waitForFunction((v)=>{ return Array.from(document.querySelectorAll('#platforms-list li span')).some(s=>s.textContent.trim()===v); }, {}, newPlatform);
    console.log('Added platform in UI:', newPlatform);

    // fill handle and url
    await page.evaluate(()=>{
      const f = document.getElementById('settings-form'); if(!f) return;
      f.querySelector('[name=platformName]').value = 'Telegram UI Test';
      f.querySelector('[name=handle]').value = '@nbn_ui_test';
      f.querySelector('[name=url]').value = 'https://t.me/nbn_ui_test';
      // set select to our new platform if available
      const sel = f.querySelector('[name=platform]'); if(sel){ const opt = Array.from(sel.options).find(o=>o.value.includes('Telegram-Test-UI')); if(opt) sel.value = opt.value; }
    });

    // Click Save
    await page.click('#settings-form button[type=submit]');

    // Wait for status text to show 'Saved' or 'Save failed'
    const statusText = await page.waitForFunction(()=>{
      const s = document.getElementById('settings-status'); if(!s) return null; return s.textContent.trim();
    }, {}, 20000).catch(()=>null);

    const status = statusText ? await page.evaluate(()=>document.getElementById('settings-status').textContent.trim()) : null;
    console.log('Settings status text:', status);

    // read final settings from API to confirm
    const resp = await page.evaluate(async ()=>{ const r = await fetch('/api/settings'); if(!r.ok) return null; return r.json(); });
    console.log('Settings from API after save:', JSON.stringify(resp));

    // cleanup: remove test platform by submitting form without it
    // restore by removing the li we added
    await page.evaluate((v)=>{ const li = Array.from(document.querySelectorAll('#platforms-list li')).find(li=> li.querySelector('span') && li.querySelector('span').textContent.trim()===v); if(li) li.remove(); const delBtn = document.querySelector('#platforms-list button.plat-del'); if(delBtn) delBtn.click(); }, newPlatform);

    await browser.close();
    process.exit(0);
  }catch(err){
    console.error('Headless settings UI error:', err && err.message);
    try{ await browser.close(); }catch(e){}
    process.exit(2);
  }
})();
