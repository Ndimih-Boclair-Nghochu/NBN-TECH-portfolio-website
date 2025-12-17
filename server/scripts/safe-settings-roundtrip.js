(async ()=>{
  try{
    const base = process.env.BASE_URL || 'https://dhq9341hf4.execute-api.us-east-1.amazonaws.com';
    const credentials = { email: 'nbntechteam@gmail.com', password: '@Boclair444' };
    console.log('Logging in...');
    let r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
    if(!r.ok) throw new Error('Login failed ' + r.status);
    const sc = r.headers.get('set-cookie') || '';
    const cookie = sc.split(';')[0];
    console.log('Logged in, cookie obtained.');

    const headers = { 'cookie': cookie, 'content-type': 'application/json' };
    console.log('Fetching current settings...');
    r = await fetch(base + '/api/settings', { method: 'GET', headers });
    if(!r.ok) throw new Error('GET settings failed ' + r.status);
    const original = await r.json();
    console.log('Original settings:', JSON.stringify(original));

    const testPayload = {
      platform: 'Telegram',
      platformName: 'Telegram',
      handle: '@NBN TECH TEAM COMUNITY',
      url: 'https://t.me/+FxjrlczACcExOTU0',
      platforms: ['Telegram']
    };

    console.log('PUT test settings (will restore afterwards)...');
    r = await fetch(base + '/api/settings', { method: 'PUT', headers, body: JSON.stringify(testPayload) });
    const afterPut = await r.text();
    console.log('PUT status', r.status, 'body', afterPut);

    console.log('GET settings to verify...');
    r = await fetch(base + '/api/settings', { method: 'GET', headers });
    const now = await r.json();
    console.log('Now settings:', JSON.stringify(now));

    console.log('Restoring original settings...');
    r = await fetch(base + '/api/settings', { method: 'PUT', headers, body: JSON.stringify(original) });
    console.log('Restore status', r.status, 'body', await r.text().catch(()=>null));

    console.log('Final GET to confirm restore...');
    r = await fetch(base + '/api/settings', { method: 'GET', headers });
    console.log('Final settings:', JSON.stringify(await r.json()));

    console.log('Safe roundtrip completed. No permanent change kept.');
    process.exit(0);
  }catch(e){ console.error('Error during safe roundtrip:', e && e.message); process.exit(2); }
})();
