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
    try{
      const lf = document.getElementById('login-form');
      if(lf) lf.querySelectorAll('input,button').forEach(i=>i.disabled=true);
    }catch(e){ /* ignore */ }
    return false;
  }
}

// All event handlers and CRUD logic inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  await checkBackend();
  
  // Cache DOM elements
  const loginForm = document.getElementById('login-form');
  const loginMsg = document.getElementById('login-msg');
  const dashboard = document.getElementById('dashboard');
  const loginSection = document.getElementById('login-section');
  const projectForm = document.getElementById('project-form');
  const projectsList = document.getElementById('projects-list');
  const blogForm = document.getElementById('blog-form');
  const blogsList = document.getElementById('blogs-list');
  const serviceForm = document.getElementById('service-form');
  const servicesList = document.getElementById('services-list');
  const skillForm = document.getElementById('skill-form');
  const skillsList = document.getElementById('skills-list');
  const teamForm = document.getElementById('team-form');
  const teamList = document.getElementById('team-list');
  const reviewsList = document.getElementById('reviews-list');
  const adminTabs = document.querySelectorAll('.admin-tab');
  const adminSections = document.querySelectorAll('.admin-section');
  
  if(!loginForm) {
    console.error('loginForm element not found');
    return;
  }
  
  // Show first admin tab
  const firstTab = document.querySelector('.admin-tab');
  if(firstTab) firstTab.click();
  
  // Helper function to set form input if element exists
  const setIf = (form, selector, value) => {
    const el = form && form.querySelector(selector);
    if(el) el.value = value;
  };
  
  // ===== PROJECTS CRUD =====
  async function loadProjects(){
    if(!projectsList) return;
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
  }
  
  async function editProject(id){
    console.log('[editProject] Loading projects for id:', id);
    const projects = await api('/api/projects');
    console.log('[editProject] Fetched projects:', projects);
    const p = projects.find(x => String(x.id) === String(id));
    console.log('[editProject] Found project:', p);
    if(!p) { console.error('[editProject] Project not found'); return; }
    if(!projectForm) { console.error('[editProject] projectForm is null'); return; }
    console.log('[editProject] Populating form with:', p);
    setIf(projectForm, '[name=id]', p.id);
    setIf(projectForm, '[name=title]', p.title);
    setIf(projectForm, '[name=slug]', p.slug);
    setIf(projectForm, '[name=link]', p.link || '');
    setIf(projectForm, '[name=github]', p.github || '');
    setIf(projectForm, '[name=description]', p.description || '');
    console.log('[editProject] Form populated successfully');
  }
  
  async function deleteProject(id){
    if(!confirm('Delete project?')) return;
    await api('/api/projects/' + id, { method: 'DELETE' });
    loadProjects();
  }
  
  if(projectForm){
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(projectForm);
      const id = formData.get('id');
      const url = id ? '/api/projects/' + id : '/api/projects';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, credentials:'include', body: formData });
      if(!res.ok) { alert('Save failed'); return; }
      projectForm.reset();
      await loadProjects();
    });
  }
  
  if(projectsList){
    projectsList.addEventListener('click', async (e) => {
      console.log('[projectsList click] Event target:', e.target);
      const btn = e.target.closest('button');
      console.log('[projectsList click] Closest button:', btn);
      if(!btn) { console.log('[projectsList click] No button found'); return; }
      const id = btn.dataset.id;
      console.log('[projectsList click] Button id:', id, 'classList:', btn.className);
      if(btn.classList.contains('edit')) { 
        console.log('[projectsList click] Edit button clicked');
        await editProject(id); 
      }
      else if(btn.classList.contains('delete')) { 
        console.log('[projectsList click] Delete button clicked');
        await deleteProject(id); 
      }
    });
  }
  
  // ===== BLOGS CRUD =====
  async function loadBlogs(){
    if(!blogsList) return;
    blogsList.innerHTML = '<p>Loading...</p>';
    const blogs = await api('/api/blogs');
    blogsList.innerHTML = '';
    blogs.forEach(b => {
      const d = document.createElement('div');
      d.className = 'item-row';
      d.innerHTML = `<h4>${b.title}</h4><p>${b.excerpt||''}</p><img src="${b.image||'/images/placeholder.png'}" style="max-width:200px"><button data-id="${b.id}" class="edit-blog">Edit</button> <button data-id="${b.id}" class="del-blog">Delete</button>`;
      blogsList.appendChild(d);
    });
  }
  
  if(blogForm){
    blogForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(blogForm);
      const id = fd.get('id');
      const url = id? '/api/blogs/' + id : '/api/blogs';
      const method = id? 'PUT':'POST';
      const res = await fetch(url, { method, credentials:'include', body: fd });
      if(!res.ok) { alert('Blog save failed'); return; }
      blogForm.reset();
      loadBlogs();
    });
  }
  
  if(blogsList){
    blogsList.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if(!btn) return;
      const id = btn.dataset.id;
      if(btn.classList.contains('edit-blog')){
        const items = await api('/api/blogs');
        const item = items.find(x => x.id == id);
        if(!item) return;
        setIf(blogForm, '[name=id]', item.id);
        setIf(blogForm, '[name=title]', item.title);
        setIf(blogForm, '[name=slug]', item.slug);
        setIf(blogForm, '[name=excerpt]', item.excerpt||'');
        setIf(blogForm, '[name=content]', item.content||'');
        setIf(blogForm, '[name=externalLink]', item.externalLink || '');
        setIf(blogForm, '[name=ctaLink]', item.ctaLink || '');
        setIf(blogForm, '[name=ctaText]', item.ctaText || '');
      } else if(btn.classList.contains('del-blog')){
        if(!confirm('Delete blog?')) return;
        await api('/api/blogs/'+id, { method:'DELETE' });
        loadBlogs();
      }
    });
  }
  
  // ===== SERVICES CRUD =====
  async function loadServices(){
    if(!servicesList) return;
    servicesList.innerHTML = '<p>Loading...</p>';
    const items = await api('/api/services');
    servicesList.innerHTML = '';
    items.forEach(s => {
      const d = document.createElement('div');
      d.className = 'item-row';
      d.innerHTML = `<h4>${s.name}</h4><p>${s.description||''}</p><img src="${s.icon||'/images/placeholder.png'}" style="max-width:160px"><button data-id="${s.id}" class="edit-service">Edit</button> <button data-id="${s.id}" class="del-service">Delete</button>`;
      servicesList.appendChild(d);
    });
  }
  
  if(serviceForm){
    serviceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(serviceForm);
      const id = fd.get('id');
      const url = id? '/api/services/' + id : '/api/services';
      const method = id? 'PUT':'POST';
      const res = await fetch(url, { method, credentials:'include', body: fd });
      if(!res.ok){ alert('Service save failed'); return;}
      serviceForm.reset();
      loadServices();
    });
  }
  
  if(servicesList){
    servicesList.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if(!btn) return;
      const id = btn.dataset.id;
      if(btn.classList.contains('edit-service')){
        const items = await api('/api/services');
        const item = items.find(x => x.id == id);
        if(!item) return;
        setIf(serviceForm, '[name=id]', item.id);
        setIf(serviceForm, '[name=name]', item.name);
        setIf(serviceForm, '[name=slug]', item.slug);
        setIf(serviceForm, '[name=description]', item.description||'');
      } else if(btn.classList.contains('del-service')){
        if(!confirm('Delete service?')) return;
        await api('/api/services/'+id, { method:'DELETE' });
        loadServices();
      }
    });
  }
  
  // ===== SKILLS CRUD =====
  async function loadSkills(){
    if(!skillsList) return;
    skillsList.innerHTML = '<p>Loading...</p>';
    const items = await api('/api/skills');
    skillsList.innerHTML = '';
    items.forEach(s => {
      const d = document.createElement('div');
      d.className = 'item-row';
      d.innerHTML = `<strong>${s.name}</strong> <small>${s.level||''}</small><button data-id="${s.id}" class="edit-skill">Edit</button> <button data-id="${s.id}" class="del-skill">Delete</button>`;
      skillsList.appendChild(d);
    });
  }
  
  if(skillForm){
    skillForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(skillForm);
      const payload = { name: fd.get('name'), level: fd.get('level'), order: fd.get('order') };
      const id = fd.get('id');
      const url = id? '/api/skills/' + id : '/api/skills';
      const method = id? 'PUT':'POST';
      const res = await fetch(url, { method, credentials:'include', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if(!res.ok) { alert('Skill save failed'); return }
      skillForm.reset();
      loadSkills();
    });
  }
  
  if(skillsList){
    skillsList.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if(!btn) return;
      const id = btn.dataset.id;
      if(btn.classList.contains('edit-skill')){
        const items = await api('/api/skills');
        const it = items.find(x => x.id == id);
        if(!it) return;
        setIf(skillForm, '[name=id]', it.id);
        setIf(skillForm, '[name=name]', it.name);
        setIf(skillForm, '[name=level]', it.level||'');
        setIf(skillForm, '[name=order]', it.order||0);
      } else if(btn.classList.contains('del-skill')){
        if(!confirm('Delete skill?')) return;
        await api('/api/skills/'+id, { method:'DELETE' });
        loadSkills();
      }
    });
  }
  
  // ===== TEAM CRUD =====
  async function loadTeam(){
    if(!teamList) return;
    teamList.innerHTML = '<p>Loading...</p>';
    const items = await api('/api/team');
    teamList.innerHTML = '';
    items.forEach(m => {
      const d = document.createElement('div');
      d.className = 'item-row';
      d.innerHTML = `<h4>${m.name} <small>${m.role||''}</small></h4><p>${m.bio||''}</p><img src="${m.photo||'/images/placeholder.png'}" style="max-width:160px"><button data-id="${m.id}" class="edit-member">Edit</button> <button data-id="${m.id}" class="del-member">Delete</button>`;
      teamList.appendChild(d);
    });
  }
  
  if(teamForm){
    teamForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(teamForm);
      const id = fd.get('id');
      const url = id? '/api/team/' + id : '/api/team';
      const method = id? 'PUT':'POST';
      const res = await fetch(url, { method, credentials:'include', body: fd });
      if(!res.ok){ alert('Member save failed'); return }
      teamForm.reset();
      loadTeam();
    });
  }
  
  if(teamList){
    teamList.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if(!btn) return;
      const id = btn.dataset.id;
      if(btn.classList.contains('edit-member')){
        const items = await api('/api/team');
        const it = items.find(x => x.id == id);
        if(!it) return;
        setIf(teamForm, '[name=id]', it.id);
        setIf(teamForm, '[name=name]', it.name);
        setIf(teamForm, '[name=role]', it.role||'');
        setIf(teamForm, '[name=bio]', it.bio||'');
        setIf(teamForm, '[name=linkedin]', it.linkedin||'');
        setIf(teamForm, '[name=website]', it.website||'');
      } else if(btn.classList.contains('del-member')){
        if(!confirm('Delete member?')) return;
        await api('/api/team/'+id, { method:'DELETE' });
        loadTeam();
      }
    });
  }
  
  // ===== REVIEWS MODERATION =====
  async function loadReviews(){
    if(!reviewsList) return;
    reviewsList.innerHTML = '<p>Loading...</p>';
    const items = await api('/api/reviews');
    reviewsList.innerHTML = '';
    items.forEach(r => {
      const d = document.createElement('div');
      d.className = 'item-row';
      d.innerHTML = `<strong>${r.author} <small>${r.role||''}</small></strong>
        <p>${(r.text||'').substring(0,300)}</p>
        <small>${new Date(r.createdAt).toLocaleString()}</small>
        <div style="margin-top:8px">
          <button data-id="${r.id}" class="edit-review">Edit</button>
          <button data-id="${r.id}" class="del-review">Delete</button>
        </div>`;
      reviewsList.appendChild(d);
    });
  }
  
  if(reviewsList){
    reviewsList.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if(!btn) return;
      const id = btn.dataset.id;
      if(btn.classList.contains('edit-review')){
        const items = await api('/api/reviews');
        const it = items.find(x => x.id == id);
        if(!it) return;
        const newText = prompt('Edit review text:', it.text);
        if(newText === null) return;
        const newRating = prompt('Edit rating (1-5, empty to clear):', it.rating||'');
        if(newRating === null) return;
        const parsed = newRating.trim() === '' ? null : parseInt(newRating, 10);
        const payload = { author: it.author, role: it.role, text: newText, rating: parsed };
        await api('/api/reviews/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        loadReviews();
      } else if(btn.classList.contains('del-review')){
        if(!confirm('Delete review?')) return;
        await api('/api/reviews/'+id, { method:'DELETE' });
        loadReviews();
      }
    });
  }
  
  // ===== TAB NAVIGATION =====
  adminTabs.forEach(t => t.addEventListener('click', () => {
    const target = t.dataset.section;
    adminSections.forEach(s => s.hidden = (s.id !== 'section-' + target));
    adminTabs.forEach(x => {
      x.classList.toggle('active', x === t);
      x.setAttribute('aria-selected', x === t ? 'true' : 'false');
    });
  }));
  
  // ===== LOGIN HANDLER =====
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('#email').value.trim();
    const password = loginForm.querySelector('#password').value.trim();
    if(!email || !password) {
      loginMsg.textContent = 'Email and password required';
      return;
    }
    try {
      const resp = await api('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      console.log('login success', resp);
      loginSection.hidden = true;
      dashboard.hidden = false;
      loginMsg.textContent = '';
      
      // Show user email and logout button
      const userEl = document.getElementById('admin-user');
      if(userEl) {
        userEl.innerHTML = `<div class="user-info">${resp.user.email} <button id="logout-btn" class="btn small">Logout</button></div>`;
        const lb = document.getElementById('logout-btn');
        if(lb) {
          lb.addEventListener('click', async () => {
            try {
              await api('/api/logout', { method: 'POST' });
              loginSection.hidden = false;
              dashboard.hidden = true;
              userEl.innerHTML = '';
              loginForm.reset();
            } catch(e) {
              console.error('logout failed', e);
            }
          });
        }
      }
      
      // Load all data
      await loadProjects();
      await loadBlogs();
      await loadServices();
      await loadSkills();
      await loadTeam();
      await loadReviews();
    } catch(err) {
      console.error('login error', err);
      loginMsg.textContent = err.message || 'Login failed';
    }
  });
});
