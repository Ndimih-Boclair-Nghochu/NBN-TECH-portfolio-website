// Minimal login-only admin client (final overwrite)
document.addEventListener('DOMContentLoaded', ()=>{
  try{ window.__admin_app_loaded = true; }catch(e){}
  const form = document.getElementById('login-form');
  const msg = document.getElementById('login-msg');
  if(!form) return;

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(msg) msg.textContent = '';
    const email = (form.querySelector('#email')||{value:''}).value.trim();
    const password = (form.querySelector('#password')||{value:''}).value.trim();
    if(!email || !password){ if(msg) msg.textContent = 'Email and password required'; return; }
    try{
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      if(!res.ok){ const txt = await res.text().catch(()=>null); throw new Error(txt || 'Login failed'); }
      if(msg) msg.textContent = 'Logged in';
      const loginSection = document.getElementById('login-section');
      const dashboard = document.getElementById('dashboard');
      if(loginSection) loginSection.hidden = true;
      if(dashboard) dashboard.hidden = false;
    }catch(err){ console.error('login error', err); if(msg) msg.textContent = err.message || 'Login failed'; }
  });
});

// Tab switching: show matching section and call loader
function showSection(name){
  const sections = document.querySelectorAll('.admin-section');
  sections.forEach(s=> s.hidden = true);
  const target = document.getElementById('section-' + name);
  if(target) target.hidden = false;
  // update active tab
  document.querySelectorAll('.admin-tab').forEach(b=> b.classList.toggle('active', b.dataset.section === name));
  // call loader if present
  try{
    if(name === 'projects') loadProjects();
    else if(name === 'blogs') loadBlogs();
    else if(name === 'services') loadServices();
    else if(name === 'skills') loadSkills();
    else if(name === 'team') loadTeam();
    else if(name === 'reviews') loadReviews();
    else if(name === 'settings') loadSettings();
  }catch(e){ /* loader may not exist yet */ }
}

document.addEventListener('DOMContentLoaded', ()=>{
  // wire tabs
  document.querySelectorAll('.admin-tab').forEach(btn=>{
    btn.addEventListener('click', ()=> showSection(btn.dataset.section));
  });

  // logout button
  const logout = document.getElementById('logout-btn');
  if(logout){
    logout.addEventListener('click', async ()=>{
      try{ await fetch('/api/logout', { method: 'POST', credentials: 'include' }); window.location.reload(); }catch(e){ console.error('logout error', e); window.location.reload(); }
    });
  }

  // ensure initial section
  const active = document.querySelector('.admin-tab.active');
  if(active) showSection(active.dataset.section || 'projects');
  else showSection('projects');
});

// --- Projects CRUD implementation ---
const API_BASE = window.API_BASE || '';

async function api(path, options = {}){
  const res = await fetch(API_BASE + path, { credentials: 'include', ...options });
  const text = await res.text().catch(()=>null);
  const ct = res.headers && res.headers.get ? res.headers.get('content-type') || '' : '';
  const json = (ct.includes('application/json') && text) ? JSON.parse(text) : null;
  if(!res.ok){
    const msg = (json && (json.error || json.message)) ? (json.error || json.message) : (text || 'API error');
    const err = new Error(msg);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json || (text ? JSON.parse(text) : {});
}

function setIf(form, selector, value){ const el = form && form.querySelector(selector); if(el) el.value = value; }

async function loadProjects(){
  const projectsList = document.getElementById('projects-list');
  if(!projectsList) return;
  projectsList.innerHTML = '<p>Loading projects...</p>';
  try{
    const items = await api('/api/projects');
    projectsList.innerHTML = '';
    items.forEach(p => {
      const div = document.createElement('div');
      div.className = 'project-row';
      div.innerHTML = `
        <h4>${escapeHtml(p.title || '')}</h4>
        <p>${escapeHtml(p.description || '')}</p>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <img src="${p.image || '/images/placeholder.png'}" style="max-width:160px;max-height:90px;object-fit:cover;border-radius:6px">
          <div>
            <button data-id="${p.id}" class="edit">Edit</button>
            <button data-id="${p.id}" class="delete">Delete</button>
          </div>
        </div>
      `;
      projectsList.appendChild(div);
    });
  }catch(err){ projectsList.innerHTML = '<p>Failed loading projects</p>'; console.error('loadProjects error', err); }
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function editProject(id){
  const projectForm = document.getElementById('project-form');
  if(!projectForm) return;
  try{
    const items = await api('/api/projects');
    const it = items.find(x=>String(x.id)===String(id));
    if(!it) return alert('Project not found');
    setIf(projectForm,'[name=id]', it.id);
    setIf(projectForm,'[name=title]', it.title || '');
    setIf(projectForm,'[name=slug]', it.slug || '');
    setIf(projectForm,'[name=link]', it.link || '');
    setIf(projectForm,'[name=github]', it.github || '');
    setIf(projectForm,'[name=description]', it.description || '');
    projectForm.scrollIntoView({ behavior: 'smooth' });
  }catch(err){ console.error('editProject error', err); }
}

async function deleteProject(id){
  if(!confirm('Delete project?')) return;
  try{
    await api('/api/projects/' + id, { method: 'DELETE' });
    await loadProjects();
  }catch(err){ console.error('deleteProject error', err); alert('Delete failed: ' + (err.message||'')); }
}

// wire project form and list interactions
document.addEventListener('DOMContentLoaded', ()=>{
  const projectForm = document.getElementById('project-form');
  const projectsList = document.getElementById('projects-list');
  if(projectForm){
    projectForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(projectForm);
      const id = fd.get('id');
      const url = id ? '/api/projects/' + id : '/api/projects';
      const method = id ? 'PUT' : 'POST';
      try{
        const res = await fetch(url, { method, credentials: 'include', body: fd });
        if(!res.ok) { const t = await res.text().catch(()=>null); throw new Error(t || 'Save failed'); }
        projectForm.reset();
        await loadProjects();
      }catch(err){ console.error('project save error', err); alert('Save failed: ' + (err.message||'')); }
    });
  }
  if(projectsList){
    projectsList.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      const id = btn.dataset.id;
      if(btn.classList.contains('edit')){ await editProject(id); }
      else if(btn.classList.contains('delete')){ await deleteProject(id); }
    });
  }

  // try to load projects automatically if already logged in
  (async ()=>{ try{ const probe = await fetch(API_BASE + '/api/projects', { credentials: 'include' }); if(probe && probe.ok) await loadProjects(); }catch(e){} })();
});

// --- Blogs CRUD implementation ---
async function loadBlogs(){
  const blogsList = document.getElementById('blogs-list');
  if(!blogsList) return;
  blogsList.innerHTML = '<p>Loading blogs...</p>';
  try{
    const items = await api('/api/blogs');
    blogsList.innerHTML = '';
    items.forEach(b => {
      const div = document.createElement('div');
      div.className = 'blog-row';
      div.innerHTML = `
        <h4>${escapeHtml(b.title || '')}</h4>
          <p>${escapeHtml(b.excerpt || b.content || '')}</p>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <img src="${b.image || '/images/placeholder.png'}" style="max-width:160px;max-height:90px;object-fit:cover;border-radius:6px">
          <div>
            <button data-id="${b.id}" class="edit">Edit</button>
            <button data-id="${b.id}" class="delete">Delete</button>
          </div>
        </div>
      `;
      blogsList.appendChild(div);
    });
  }catch(err){ blogsList.innerHTML = '<p>Failed loading blogs</p>'; console.error('loadBlogs error', err); }
}

async function editBlog(id){
  const blogForm = document.getElementById('blog-form');
  if(!blogForm) return;
  try{
    const items = await api('/api/blogs');
    const it = items.find(x=>String(x.id)===String(id));
    if(!it) return alert('Blog not found');
    setIf(blogForm,'[name=id]', it.id);
    setIf(blogForm,'[name=title]', it.title || '');
    setIf(blogForm,'[name=slug]', it.slug || '');
      setIf(blogForm,'[name=excerpt]', it.excerpt || '');
      setIf(blogForm,'[name=externalLink]', it.externalLink || '');
      setIf(blogForm,'[name=ctaLink]', it.ctaLink || '');
      setIf(blogForm,'[name=ctaText]', it.ctaText || '');
    setIf(blogForm,'[name=content]', it.content || '');
    blogForm.scrollIntoView({ behavior: 'smooth' });
  }catch(err){ console.error('editBlog error', err); }
}

async function deleteBlog(id){
  if(!confirm('Delete blog?')) return;
  try{
    await api('/api/blogs/' + id, { method: 'DELETE' });
    await loadBlogs();
  }catch(err){ console.error('deleteBlog error', err); alert('Delete failed: ' + (err.message||'')); }
}

// wire blog form and list interactions
document.addEventListener('DOMContentLoaded', ()=>{
  const blogForm = document.getElementById('blog-form');
  const blogsList = document.getElementById('blogs-list');
  if(blogForm){
    blogForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(blogForm);
      const id = fd.get('id');
      const url = id ? '/api/blogs/' + id : '/api/blogs';
      const method = id ? 'PUT' : 'POST';
      try{
        const res = await fetch(url, { method, credentials: 'include', body: fd });
        if(!res.ok) { const t = await res.text().catch(()=>null); throw new Error(t || 'Save failed'); }
        blogForm.reset();
        await loadBlogs();
      }catch(err){ console.error('blog save error', err); alert('Save failed: ' + (err.message||'')); }
    });
  }
  if(blogsList){
    blogsList.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      const id = btn.dataset.id;
      if(btn.classList.contains('edit')){ await editBlog(id); }
      else if(btn.classList.contains('delete')){ await deleteBlog(id); }
    });
  }

  // try to load blogs automatically if already logged in
  (async ()=>{ try{ const probe = await fetch(API_BASE + '/api/blogs', { credentials: 'include' }); if(probe && probe.ok) await loadBlogs(); }catch(e){} })();
});

  // --- Services CRUD ---
  async function loadServices(){
    const el = document.getElementById('services-list'); if(!el) return; el.innerHTML = '<p>Loading services...</p>';
    try{
      const items = await api('/api/services'); el.innerHTML = '';
      items.forEach(s=>{
        const d = document.createElement('div'); d.className='service-row';
        d.innerHTML = `<h4>${escapeHtml(s.name||'')}</h4><p>${escapeHtml(s.description||'')}</p><div style="margin-top:8px"><button data-id="${s.id}" class="edit">Edit</button> <button data-id="${s.id}" class="delete">Delete</button></div>`;
        el.appendChild(d);
      });
    }catch(err){ el.innerHTML = '<p>Failed loading services</p>'; console.error('loadServices error', err); }
  }

  async function editService(id){ const form = document.getElementById('service-form'); if(!form) return;
    try{ const items = await api('/api/services'); const it = items.find(x=>String(x.id)===String(id)); if(!it) return alert('Service not found'); setIf(form,'[name=id]', it.id); setIf(form,'[name=name]', it.name||''); setIf(form,'[name=slug]', it.slug||''); setIf(form,'[name=description]', it.description||''); form.scrollIntoView({behavior:'smooth'});
    }catch(err){ console.error('editService error', err); }
  }

  async function deleteService(id){ if(!confirm('Delete service?')) return; try{ await api('/api/services/'+id, { method:'DELETE' }); await loadServices(); }catch(err){ console.error('deleteService error', err); alert('Delete failed: '+(err.message||'')); } }

  document.addEventListener('DOMContentLoaded', ()=>{
    const form = document.getElementById('service-form'); const list = document.getElementById('services-list');
    if(form){ form.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = new FormData(form); const id = fd.get('id'); const url = id?'/api/services/'+id:'/api/services'; const method = id?'PUT':'POST'; try{ const res = await fetch(url,{ method, credentials:'include', body: fd }); if(!res.ok){ const t = await res.text().catch(()=>null); throw new Error(t||'Save failed'); } form.reset(); await loadServices(); }catch(err){ console.error('service save error', err); alert('Save failed: '+(err.message||'')); } }); }
    if(list){ list.addEventListener('click', async (e)=>{ const btn = e.target.closest('button'); if(!btn) return; const id = btn.dataset.id; if(btn.classList.contains('edit')) await editService(id); else if(btn.classList.contains('delete')) await deleteService(id); }); }
    (async ()=>{ try{ const probe = await fetch(API_BASE + '/api/services',{ credentials:'include' }); if(probe && probe.ok) await loadServices(); }catch(e){} })();
  });

  // --- Skills CRUD ---
  async function loadSkills(){ const el = document.getElementById('skills-list'); if(!el) return; el.innerHTML = '<p>Loading skills...</p>'; try{ const items = await api('/api/skills'); el.innerHTML=''; items.forEach(s=>{ const d=document.createElement('div'); d.className='skill-row'; d.innerHTML = `<strong>${escapeHtml(s.name||'')}</strong> <span style="margin-left:8px">${escapeHtml(s.level||'')}</span> <button data-id="${s.id}" class="delete" style="margin-left:12px">Delete</button>`; el.appendChild(d); }); }catch(err){ el.innerHTML='<p>Failed loading skills</p>'; console.error('loadSkills error', err); } }

  async function deleteSkill(id){ if(!confirm('Delete skill?')) return; try{ await api('/api/skills/'+id, { method:'DELETE' }); await loadSkills(); }catch(err){ console.error('deleteSkill error', err); alert('Delete failed: '+(err.message||'')); } }

  document.addEventListener('DOMContentLoaded', ()=>{
    const form = document.getElementById('skill-form'); const list = document.getElementById('skills-list');
    if(form){ form.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = new FormData(form); const id = fd.get('id'); const payload = { name: fd.get('name'), level: fd.get('level'), order: fd.get('order') }; const url = id?'/api/skills/'+id:'/api/skills'; const method = id?'PUT':'POST'; try{ const res = await fetch(url, { method, credentials:'include', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) }); if(!res.ok){ const t = await res.text().catch(()=>null); throw new Error(t||'Save failed'); } form.reset(); await loadSkills(); }catch(err){ console.error('skill save error', err); alert('Save failed: '+(err.message||'')); } }); }
    if(list){ list.addEventListener('click', async (e)=>{ const btn = e.target.closest('button'); if(!btn) return; const id = btn.dataset.id; if(btn.classList.contains('delete')) await deleteSkill(id); }); }
    (async ()=>{ try{ const probe = await fetch(API_BASE + '/api/skills',{ credentials:'include' }); if(probe && probe.ok) await loadSkills(); }catch(e){} })();
  });

  // --- Team CRUD ---
  async function loadTeam(){ const el = document.getElementById('team-list'); if(!el) return; el.innerHTML='<p>Loading team...</p>'; try{ const items = await api('/api/team'); el.innerHTML=''; items.forEach(m=>{ const d=document.createElement('div'); d.className='team-row'; d.innerHTML = `<strong>${escapeHtml(m.name||'')}</strong> <div style="margin-top:6px">${escapeHtml(m.role||'')}</div><div style="margin-top:6px"><button data-id="${m.id}" class="edit">Edit</button> <button data-id="${m.id}" class="delete">Delete</button></div>`; el.appendChild(d); }); }catch(err){ el.innerHTML='<p>Failed loading team</p>'; console.error('loadTeam error', err); } }

  async function editTeam(id){ const form = document.getElementById('team-form'); if(!form) return; try{ const items = await api('/api/team'); const it = items.find(x=>String(x.id)===String(id)); if(!it) return alert('Member not found'); setIf(form,'[name=id]', it.id); setIf(form,'[name=name]', it.name||''); setIf(form,'[name=role]', it.role||''); setIf(form,'[name=bio]', it.bio||''); setIf(form,'[name=linkedin]', it.linkedin||''); setIf(form,'[name=website]', it.website||''); setIf(form,'[name=github]', it.github||''); form.scrollIntoView({behavior:'smooth'}); }catch(err){ console.error('editTeam error', err); } }

  async function deleteTeam(id){ if(!confirm('Delete member?')) return; try{ await api('/api/team/'+id, { method:'DELETE' }); await loadTeam(); }catch(err){ console.error('deleteTeam error', err); alert('Delete failed: '+(err.message||'')); } }

  document.addEventListener('DOMContentLoaded', ()=>{
    const form = document.getElementById('team-form'); const list = document.getElementById('team-list');
    if(form){ form.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = new FormData(form); const id = fd.get('id'); const url = id?'/api/team/'+id:'/api/team'; const method = id?'PUT':'POST'; try{ const res = await fetch(url, { method, credentials:'include', body: fd }); if(!res.ok){ const t = await res.text().catch(()=>null); throw new Error(t||'Save failed'); } form.reset(); await loadTeam(); }catch(err){ console.error('team save error', err); alert('Save failed: '+(err.message||'')); } }); }
    if(list){ list.addEventListener('click', async (e)=>{ const btn = e.target.closest('button'); if(!btn) return; const id = btn.dataset.id; if(btn.classList.contains('edit')) await editTeam(id); else if(btn.classList.contains('delete')) await deleteTeam(id); }); }
    (async ()=>{ try{ const probe = await fetch(API_BASE + '/api/team',{ credentials:'include' }); if(probe && probe.ok) await loadTeam(); }catch(e){} })();
  });

  // --- Reviews management ---
  async function loadReviews(){ const el = document.getElementById('reviews-list'); if(!el) return; el.innerHTML='<p>Loading reviews...</p>'; try{ const items = await api('/api/reviews'); el.innerHTML=''; items.forEach(r=>{ const d=document.createElement('div'); d.className='review-row'; d.innerHTML = `<strong>${escapeHtml(r.author||'Anonymous')}</strong> <div>${escapeHtml(r.text||'')}</div><div style="margin-top:6px"><button data-id="${r.id}" class="delete">Delete</button></div>`; el.appendChild(d); }); }catch(err){ el.innerHTML='<p>Failed loading reviews</p>'; console.error('loadReviews error', err); } }

  async function deleteReview(id){ if(!confirm('Delete review?')) return; try{ await api('/api/reviews/'+id,{ method:'DELETE' }); await loadReviews(); }catch(err){ console.error('deleteReview error', err); alert('Delete failed: '+(err.message||'')); } }

  document.addEventListener('DOMContentLoaded', ()=>{
    const list = document.getElementById('reviews-list'); if(list){ list.addEventListener('click', async (e)=>{ const btn = e.target.closest('button'); if(!btn) return; const id = btn.dataset.id; if(btn.classList.contains('delete')) await deleteReview(id); }); }
    (async ()=>{ try{ const probe = await fetch(API_BASE + '/api/reviews',{ credentials:'include' }); if(probe && probe.ok) await loadReviews(); }catch(e){} })();
  });

  // --- Settings (platform list + save) ---
  async function loadSettings(){ const status = document.getElementById('settings-status'); const form = document.getElementById('settings-form'); const platformsList = document.getElementById('platforms-list'); if(!form) return; if(status && !status.classList.contains('success')) status.textContent='Loading...'; try{ const data = await api('/api/settings'); // fill simple fields
    setIf(form,'[name=platform]', data.platform || ''); setIf(form,'[name=platformName]', data.platformName || ''); setIf(form,'[name=handle]', data.handle || ''); setIf(form,'[name=url]', data.url || ''); // populate platforms list
    if(platformsList){ platformsList.innerHTML=''; (data.platforms||[]).forEach(p=>{ const li = document.createElement('li'); li.style.display='flex'; li.style.justifyContent='space-between'; li.style.alignItems='center'; li.style.padding='4px 6px'; li.innerHTML = `<span>${escapeHtml(p)}</span> <button data-name="${escapeHtml(p)}" class="plat-del">Delete</button>`; platformsList.appendChild(li); });
      // populate select with platforms
      const sel = form.querySelector('[name=platform]');
      if(sel){ sel.innerHTML = ''; (data.platforms||[]).forEach(p=>{ const opt = document.createElement('option'); opt.value = p; opt.textContent = p; sel.appendChild(opt); }); sel.value = data.platform || ''; }
    }
    if(status && status.textContent === 'Loading...') status.textContent=''; }catch(err){ console.error('loadSettings error', err); if(status && !status.classList.contains('success')) status.textContent='Failed to load settings'; }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const form = document.getElementById('settings-form'); const platformsList = document.getElementById('platforms-list'); const addForm = document.getElementById('platform-add-form'); const status = document.getElementById('settings-status');
    if(addForm){
      const addInput = addForm.querySelector('input[name="newPlatform"]');
      const addBtn = addForm.querySelector('button');
      if(addBtn){
        addBtn.addEventListener('click', (e)=>{
          e.preventDefault();
          if(!addInput) return;
          const v = addInput.value && addInput.value.trim();
          if(!v) return;
          const li = document.createElement('li'); li.style.display='flex'; li.style.justifyContent='space-between'; li.style.alignItems='center'; li.style.padding='4px 6px'; li.innerHTML = `<span>${escapeHtml(v)}</span> <button class="plat-del">Delete</button>`;
          platformsList.appendChild(li);
          const selAdd = form.querySelector('[name=platform]'); if(selAdd){ const opt = document.createElement('option'); opt.value = v; opt.textContent = v; selAdd.appendChild(opt); }
          addInput.value = '';
        });
      }
    }
    if(platformsList){ platformsList.addEventListener('click', (e)=>{ const btn = e.target.closest('button.plat-del'); if(!btn) return; const li = btn.closest('li'); const name = li && li.querySelector('span') ? li.querySelector('span').textContent : null; li && li.remove(); const selRem = form.querySelector('[name=platform]'); if(selRem && name){ // remove matching option(s)
        Array.from(selRem.options).forEach(o=>{ if(o.value === name) o.remove(); }); }
      }); }
    // allow editing a platform by clicking its text
    if(platformsList){
      platformsList.addEventListener('click', (e)=>{
        const span = e.target.closest('li span');
        if(!span) return;
        const cur = span.textContent || '';
        const nv = prompt('Edit platform', cur);
        if(nv === null) return; // cancelled
        const v = nv.trim();
        const selEdit = form.querySelector('[name=platform]');
        const old = cur;
        if(!v) { // remove
          const li = span.closest('li'); li && li.remove();
          if(selEdit){ Array.from(selEdit.options).forEach(o=>{ if(o.value === old) o.remove(); }); }
        }
        else {
          span.textContent = v;
          if(selEdit){ // update option value/text if exists
            Array.from(selEdit.options).forEach(o=>{ if(o.value === old){ o.value = v; o.textContent = v; } });
          }
        }
      });
    }
    if(form){
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const submitBtn = form.querySelector('button[type=submit]') || form.querySelector('button.btn');
        try{
          if(submitBtn) submitBtn.disabled = true;
          if(status){ status.textContent = 'Saving...'; status.classList.remove('success','error'); }
          const fd = new FormData(form);
          const payload = {
            platform: fd.get('platform'),
            platformName: fd.get('platformName'),
            handle: fd.get('handle'),
            url: fd.get('url'),
            platforms: Array.from(platformsList.querySelectorAll('li span')).map(s=>s.textContent)
          };
          const res = await fetch('/api/settings', { method:'PUT', credentials:'include', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
          if(!res.ok){ const t = await res.text().catch(()=>null); throw new Error(t||'Save failed'); }
          // success
          if(status){ status.textContent = 'Saved'; status.classList.add('success'); }
          // refresh UI from server to reflect canonical saved state
          try{ await loadSettings(); }catch(e){ console.error('refresh after save failed', e); }
          // notify other open pages to reload site settings
          try{ localStorage.setItem('site-settings-updated', String(Date.now())); }catch(e){}
          // clear success after a short delay but keep the platforms visible
          setTimeout(()=>{ if(status){ status.classList.remove('success'); status.textContent = ''; } }, 2500);
        }catch(err){
          console.error('settings save error', err);
          if(status){ status.textContent = 'Save failed: ' + (err.message || ''); status.classList.add('error'); }
        }finally{
          if(submitBtn) submitBtn.disabled = false;
        }
      });
    }
    (async ()=>{ try{ const probe = await fetch(API_BASE + '/api/settings', { credentials:'include' }); if(probe && probe.ok) await loadSettings(); }catch(e){} })();
  });
