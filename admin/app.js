async function api(path, options={}){
  const res = await fetch(path, { credentials: 'include', ...options });
  let bodyText = null;
  try{ bodyText = await res.text(); }catch(e){ /* ignore */ }
  const contentType = res.headers.get('content-type') || '';
  const parsed = (contentType.includes('application/json') && bodyText) ? JSON.parse(bodyText) : null;
  if(!res.ok){
    const msg = parsed && parsed.error ? parsed.error : (parsed && parsed.message ? parsed.message : bodyText || 'API error');
    const err = new Error(msg);
    err.status = res.status;
    err.body = parsed || bodyText;
    throw err;
  }
  return parsed || (bodyText ? JSON.parse(bodyText) : {});
}

async function checkBackend(){
  const msgEl = document.getElementById('login-msg');
  try{
    const res = await fetch('/api/health', { credentials: 'include' });
    if(!res.ok) throw new Error('health check failed');
    if(msgEl) msgEl.textContent = '';
    return true;
  }catch(err){
    const hint = 'Backend unreachable. Make sure you open the site via the dev server: http://localhost:3000/admin/index.html';
    console.error('backend check failed', err);
    if(msgEl) msgEl.textContent = hint;
    // disable login form
    loginForm.querySelectorAll('input,button').forEach(i=>i.disabled=true);
    return false;
  }
}

// Initialize admin UI: run backend check and ensure default tab
document.addEventListener('DOMContentLoaded', async () => {
  await checkBackend();
  // show first tab by default
  const firstTab = document.querySelector('.admin-tab');
  if(firstTab){ firstTab.click(); }
});

const loginForm = document.getElementById('login-form');
const loginMsg = document.getElementById('login-msg');
const dashboard = document.getElementById('dashboard');
const loginSection = document.getElementById('login-section');
const projectForm = document.getElementById('project-form');
const projectsList = document.getElementById('projects-list');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm.querySelector('#email').value;
  const password = loginForm.querySelector('#password').value;
  try{
    const resp = await api('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    console.log('login success', resp);
    loginSection.hidden = true;
    dashboard.hidden = false;
    // show admin user and enable logout
    const userEl = document.getElementById('admin-user');
    if(userEl){
      userEl.innerHTML = `<div class="user-info">${resp.user.email} <button id="logout-btn" class="btn small">Logout</button></div>`;
      const lb = document.getElementById('logout-btn'); if(lb) lb.addEventListener('click', async ()=>{ try{ await api('/api/logout',{ method:'POST' }); loginSection.hidden=false; dashboard.hidden=true; userEl.innerHTML=''; }catch(e){ console.error('logout failed', e); } });
    }
    loadProjects();
  }catch(err){
    console.error('login error', err);
    loginMsg.textContent = err.message || 'Login failed';
    if(err.status){ loginMsg.dataset.status = err.status; }
  }
});

async function loadProjects(){
  projectsList.innerHTML = '<p>Loading...</p>';
  const projects = await api('/api/projects');
  projectsList.innerHTML = '';
  projects.forEach(p => {
    const div = document.createElement('div');
    div.className = 'project-row';
    div.innerHTML = `<h3>${p.title}</h3>
      <p>${p.description ? p.description.substring(0,160) : ''}</p>
      <img src="${p.image || '/images/placeholder.png'}" style="max-width:240px;display:block;margin-bottom:8px">
      <button data-id="${p.id}" class="edit">Edit</button>
      <button data-id="${p.id}" class="delete">Delete</button>`;
    projectsList.appendChild(div);
  });
  projectsList.querySelectorAll('.edit').forEach(b=>b.addEventListener('click', editProject));
  projectsList.querySelectorAll('.delete').forEach(b=>b.addEventListener('click', delProject));
}

async function editProject(e){
  const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)
    || (e && e.target && e.target.dataset && e.target.dataset.id)
    || (e && e.target && e.target.closest && e.target.closest('button') && e.target.closest('button').dataset && e.target.closest('button').dataset.id);
  if(!id) return;
  const projects = await api('/api/projects');
  const p = projects.find(x=>String(x.id)===String(id));
  if(!p) return;
  if(!projectForm) return;
  const setIf = (selector, value) => { const el = projectForm.querySelector(selector); if(el) el.value = value; };
  setIf('[name=id]', p.id);
  setIf('[name=title]', p.title);
  setIf('[name=slug]', p.slug);
  setIf('[name=link]', p.link || '');
  setIf('[name=github]', p.github || '');
  setIf('[name=description]', p.description || '');
}

async function delProject(e){
  const id = e.target.dataset.id;
  if(!confirm('Delete project?')) return;
  await api('/api/projects/' + id, { method: 'DELETE' });
  loadProjects();
}

projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(projectForm);
  const id = formData.get('id');
  const url = id? '/api/projects/' + id : '/api/projects';
  const method = id? 'PUT' : 'POST';
  const res = await fetch(url, { method, credentials:'include', body: formData });
  if(!res.ok) { alert('Save failed'); return; }
  projectForm.reset();
  loadProjects();
});

// initial state: check if session exists by calling health or projects
(async ()=>{
  try{
    await api('/api/health');
  }catch(err){ console.log('API down'); }
})();

// --- Admin UI: tabs and additional CRUD for blogs, services, skills, team ---
const adminTabs = document.querySelectorAll('.admin-tab');
const adminSections = document.querySelectorAll('.admin-section');
adminTabs.forEach(t => t.addEventListener('click', () => {
  const target = t.dataset.section;
  adminSections.forEach(s => s.hidden = (s.id !== 'section-' + target));
  // active tab styling and aria
  adminTabs.forEach(x => { x.classList.toggle('active', x===t); x.setAttribute('aria-selected', x===t ? 'true' : 'false'); });
}));

// BLOGS
const blogForm = document.getElementById('blog-form');
const blogsList = document.getElementById('blogs-list');
if(blogForm){
  blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(blogForm);
    const id = fd.get('id');
    const url = id? '/api/blogs/' + id : '/api/blogs';
    const method = id? 'PUT':'POST';
    const res = await fetch(url, { method, credentials:'include', body: fd });
    if(!res.ok) { alert('Blog save failed'); return; }
    blogForm.reset(); loadBlogs();
  });
}

async function loadBlogs(){
  blogsList.innerHTML = '<p>Loading...</p>';
  const blogs = await api('/api/blogs');
  blogsList.innerHTML = '';
  blogs.forEach(b => {
    const d = document.createElement('div'); d.className = 'item-row';
    d.innerHTML = `<h4>${b.title}</h4><p>${b.excerpt||''}</p><img src="${b.image||'/images/placeholder.png'}" style="max-width:200px"><button data-id="${b.id}" class="edit-blog">Edit</button> <button data-id="${b.id}" class="del-blog">Delete</button>`;
    blogsList.appendChild(d);
  });
  blogsList.querySelectorAll('.edit-blog').forEach(b=>b.addEventListener('click', async (e)=>{
    const id = e.target.dataset.id; const items = await api('/api/blogs'); const item = items.find(x=>x.id==id); if(!item) return; blogForm.querySelector('[name=id]').value = item.id; blogForm.querySelector('[name=title]').value = item.title; blogForm.querySelector('[name=slug]').value = item.slug; blogForm.querySelector('[name=excerpt]').value = item.excerpt||''; blogForm.querySelector('[name=content]').value = item.content||''; blogForm.querySelector('[name=externalLink]').value = item.externalLink || '';
  }));
  blogsList.querySelectorAll('.del-blog').forEach(b=>b.addEventListener('click', async (e)=>{ if(!confirm('Delete blog?')) return; await api('/api/blogs/'+e.target.dataset.id,{ method:'DELETE' }); loadBlogs(); }));
}

// SERVICES
const serviceForm = document.getElementById('service-form');
const servicesList = document.getElementById('services-list');
if(serviceForm){ serviceForm.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = new FormData(serviceForm); const id = fd.get('id'); const url = id? '/api/services/' + id : '/api/services'; const method = id? 'PUT':'POST'; const res = await fetch(url,{ method, credentials:'include', body: fd }); if(!res.ok){ alert('Service save failed'); return;} serviceForm.reset(); loadServices(); }); }
async function loadServices(){ servicesList.innerHTML = '<p>Loading...</p>'; const items = await api('/api/services'); servicesList.innerHTML = ''; items.forEach(s=>{ const d=document.createElement('div'); d.className='item-row'; d.innerHTML=`<h4>${s.name}</h4><p>${s.description||''}</p><img src="${s.icon||'/images/placeholder.png'}" style="max-width:160px"><button data-id="${s.id}" class="edit-service">Edit</button> <button data-id="${s.id}" class="del-service">Delete</button>`; servicesList.appendChild(d); }); servicesList.querySelectorAll('.edit-service').forEach(b=>b.addEventListener('click', async e=>{ const id=e.target.dataset.id; const items = await api('/api/services'); const item = items.find(x=>x.id==id); if(!item) return; serviceForm.querySelector('[name=id]').value=item.id; serviceForm.querySelector('[name=name]').value=item.name; serviceForm.querySelector('[name=slug]').value=item.slug; serviceForm.querySelector('[name=description]').value=item.description||''; })); servicesList.querySelectorAll('.del-service').forEach(b=>b.addEventListener('click', async e=>{ if(!confirm('Delete service?')) return; await api('/api/services/'+e.target.dataset.id,{ method:'DELETE' }); loadServices(); })); }

// SKILLS
const skillForm = document.getElementById('skill-form');
const skillsList = document.getElementById('skills-list');
if(skillForm){ skillForm.addEventListener('submit', async e=>{ e.preventDefault(); const fd = new FormData(skillForm); const payload = { name: fd.get('name'), level: fd.get('level'), order: fd.get('order') }; const id = fd.get('id'); const url = id? '/api/skills/' + id : '/api/skills'; const method = id? 'PUT':'POST'; const res = await fetch(url, { method, credentials:'include', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) }); if(!res.ok) { alert('Skill save failed'); return } skillForm.reset(); loadSkills(); }); }
async function loadSkills(){ skillsList.innerHTML = '<p>Loading...</p>'; const items = await api('/api/skills'); skillsList.innerHTML=''; items.forEach(s=>{ const d=document.createElement('div'); d.className='item-row'; d.innerHTML=`<strong>${s.name}</strong> <small>${s.level||''}</small><button data-id="${s.id}" class="edit-skill">Edit</button> <button data-id="${s.id}" class="del-skill">Delete</button>`; skillsList.appendChild(d); }); skillsList.querySelectorAll('.edit-skill').forEach(b=>b.addEventListener('click', async e=>{ const id=e.target.dataset.id; const items = await api('/api/skills'); const it = items.find(x=>x.id==id); if(!it) return; skillForm.querySelector('[name=id]').value=it.id; skillForm.querySelector('[name=name]').value=it.name; skillForm.querySelector('[name=level]').value=it.level||''; skillForm.querySelector('[name=order]').value=it.order||0; })); skillsList.querySelectorAll('.del-skill').forEach(b=>b.addEventListener('click', async e=>{ if(!confirm('Delete skill?')) return; await api('/api/skills/'+e.target.dataset.id,{ method:'DELETE' }); loadSkills(); })); }

// TEAM
const teamForm = document.getElementById('team-form');
const teamList = document.getElementById('team-list');
if(teamForm){ teamForm.addEventListener('submit', async e=>{ e.preventDefault(); const fd = new FormData(teamForm); const id = fd.get('id'); const url = id? '/api/team/' + id : '/api/team'; const method = id? 'PUT':'POST'; const res = await fetch(url, { method, credentials:'include', body: fd }); if(!res.ok){ alert('Member save failed'); return } teamForm.reset(); loadTeam(); }); }
async function loadTeam(){ teamList.innerHTML='<p>Loading...</p>'; const items = await api('/api/team'); teamList.innerHTML=''; items.forEach(m=>{ const d=document.createElement('div'); d.className='item-row'; d.innerHTML=`<h4>${m.name} <small>${m.role||''}</small></h4><p>${m.bio||''}</p><img src="${m.photo||'/images/placeholder.png'}" style="max-width:160px"><button data-id="${m.id}" class="edit-member">Edit</button> <button data-id="${m.id}" class="del-member">Delete</button>`; teamList.appendChild(d); }); teamList.querySelectorAll('.edit-member').forEach(b=>b.addEventListener('click', async e=>{ const id=e.target.dataset.id; const items = await api('/api/team'); const it = items.find(x=>x.id==id); if(!it) return; teamForm.querySelector('[name=id]').value=it.id; teamForm.querySelector('[name=name]').value=it.name; teamForm.querySelector('[name=role]').value=it.role||''; teamForm.querySelector('[name=bio]').value=it.bio||''; teamForm.querySelector('[name=linkedin]').value=it.linkedin||''; teamForm.querySelector('[name=website]').value=it.website||''; })); teamList.querySelectorAll('.del-member').forEach(b=>b.addEventListener('click', async e=>{ if(!confirm('Delete member?')) return; await api('/api/team/'+e.target.dataset.id,{ method:'DELETE' }); loadTeam(); })); }

// Load initial project/blog/etc lists when dashboard shown
function loadAll(){ loadProjects(); loadBlogs(); loadServices(); loadSkills(); loadTeam(); }


// REVIEWS (admin moderation)
const reviewsList = document.getElementById('reviews-list');
async function loadReviews(){
  if(!reviewsList) return;
  reviewsList.innerHTML = '<p>Loading...</p>';
  const items = await api('/api/reviews');
  reviewsList.innerHTML = '';
  items.forEach(r => {
    const d = document.createElement('div'); d.className = 'item-row';
    d.innerHTML = `<strong>${r.author} <small>${r.role||''}</small></strong>
      <p>${(r.text||'').substring(0,300)}</p>
      <small>${new Date(r.createdAt).toLocaleString()}</small>
      <div style="margin-top:8px">
        <button data-id="${r.id}" class="edit-review">Edit</button>
        <button data-id="${r.id}" class="del-review">Delete</button>
      </div>`;
    reviewsList.appendChild(d);
  });
  reviewsList.querySelectorAll('.edit-review').forEach(b=>b.addEventListener('click', async (e)=>{
    const id = e.target.dataset.id; const items = await api('/api/reviews'); const it = items.find(x=>x.id==id); if(!it) return;
    const newText = prompt('Edit review text:', it.text); if(newText===null) return;
    const newRating = prompt('Edit rating (1-5, empty to clear):', it.rating||''); if(newRating===null) return;
    const parsed = newRating.trim()==='' ? null : parseInt(newRating,10);
    const payload = { author: it.author, role: it.role, text: newText, rating: parsed };
    await api('/api/reviews/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    loadReviews();
  }));
  reviewsList.querySelectorAll('.del-review').forEach(b=>b.addEventListener('click', async (e)=>{ if(!confirm('Delete review?')) return; await api('/api/reviews/'+e.target.dataset.id, { method:'DELETE' }); loadReviews(); }));
}

// include reviews in loadAll
const oldLoadAll = loadAll;
function loadAll(){ oldLoadAll(); loadReviews(); }
// When dashboard becomes visible after login, call loadAll
const originalLoginHandler = loginForm.onsubmit;
// adjust login flow already sets dashboard visible and loadProjects; ensure loadAll
const oldLoginSubmit = loginForm.addEventListener ? null : null;

// hook into successful login by observing dashboard visibility (simple)
const obs = new MutationObserver((m)=>{ if(!dashboard.hidden) loadAll(); });
obs.observe(dashboard, { attributes:true, attributeFilter:['hidden'] });
