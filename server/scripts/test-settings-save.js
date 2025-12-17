(async()=>{
  try{
    const base = process.env.BASE_URL || 'https://dhq9341hf4.execute-api.us-east-1.amazonaws.com';
    const login = await fetch(base + '/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nbntechteam@gmail.com', password: '@Boclair444' })
    });
    console.log('login status', login.status);
    const sc = login.headers.get('set-cookie');
    console.log('set-cookie header:', sc);
    const cookie = sc ? sc.split(';')[0] : '';
    const payload = {
      platform: 'Telegram',
      platformName: 'Telegram Test',
      handle: '@nbn_test',
      url: 'https://t.me/nbn_test',
      platforms: ['Telegram Test', 'Twitter Test']
    };
    const res = await fetch(base + '/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'cookie': cookie },
      body: JSON.stringify(payload)
    });
    console.log('settings save status', res.status);
    const text = await res.text();
    console.log('response body:', text);
  }catch(e){ console.error('error', e); process.exit(1); }
})();
