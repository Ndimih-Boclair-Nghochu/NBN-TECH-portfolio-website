const API_BASE = window.API_BASE || '';

// Animation helper: initialize observers or fall back to scroll-based checks
const ANIMATE_SELECTOR = '[data-animate]';
function throttle(fn, wait){ let last = 0; return (...args) => { const now = Date.now(); if(now - last > wait){ last = now; fn(...args); } }; }

function initAnimations(){
    const items = document.querySelectorAll(ANIMATE_SELECTOR);
    if(!items || items.length === 0) return;

    if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if(entry.isIntersecting){
                    entry.target.classList.add('active');
                    obs.unobserve(entry.target);
                }
            });
        }, { root: null, rootMargin: '0px 0px -100px 0px', threshold: 0.1 });
        items.forEach(i => io.observe(i));
    } else {
        function fallback(){
            items.forEach(i => {
                if(i.getBoundingClientRect().top < window.innerHeight - 100) i.classList.add('active');
            });
        }
        window.addEventListener('scroll', throttle(fallback, 200));
        // run once immediately
        fallback();
    }
}

// start animations on DOM ready
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAnimations);
else initAnimations();

// Reviews carousel state
let reviewIntervalId = null;
let reviewIndex = 0;

// Global fallback toggle for nav (inline onclick fallback)
function toggleNav(e){
	// Resolve the toggle button element from event or fallback to first
	var navToggle = null;
	if(e && e.currentTarget) navToggle = e.currentTarget;
	else if(e && e.target && e.target.closest) navToggle = e.target.closest('.nav-toggle');
	if(!navToggle) navToggle = document.querySelector('.nav-toggle');
	if(!navToggle) return;
	if(e && e.stopPropagation) e.stopPropagation();
	var nav = navToggle.closest('.site-nav') || document;
	var navLinks = nav.querySelector('#primary-nav') || document.getElementById('primary-nav');
	if(!navLinks) return;
	var open = navLinks.classList.toggle('open');
	navToggle.classList.toggle('open', open);
	navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
	console.debug('toggleNav called — open:', open);
}
window.toggleNav = toggleNav;

// Ensure `.nav-toggle` uses event listener (more reliable than inline onclick across contexts)
document.addEventListener('DOMContentLoaded', () => {
	const navToggles = document.querySelectorAll('.nav-toggle');
	if(navToggles && navToggles.length){
		navToggles.forEach(navToggle => {
			navToggle.addEventListener('click', (e) => {
				// pass through the event and element
				toggleNav(e);
			});
		});
	}

	// Close mobile menu when resizing back to desktop widths
	window.addEventListener('resize', () => {
		try{
			if(window.innerWidth > 900){
				const navLinks = document.getElementById('primary-nav');
				const navTList = document.querySelectorAll('.nav-toggle');
				if(navLinks && navLinks.classList.contains('open')) navLinks.classList.remove('open');
				if(navTList && navTList.length){
					navTList.forEach(navT => {
						if(navT && navT.classList.contains('open')){ navT.classList.remove('open'); navT.setAttribute('aria-expanded','false'); }
					});
				}
			}
		}catch(e){ /* ignore */ }
	});
});

function onScroll(){
	const items = document.querySelectorAll(ANIMATE_SELECTOR);
	if(!items || items.length === 0) return;
	items.forEach(i => {
		if(i.getBoundingClientRect().top < window.innerHeight - 100) i.classList.add('active');
	});
}

window.addEventListener('scroll', throttle(onScroll, 200));
onScroll();

// Header transparency over hero on contact page
document.addEventListener('DOMContentLoaded', () => {
	const nav = document.querySelector('.site-nav');
	const hero = document.querySelector('.page-hero');
	if(!nav || !hero) return;
	
	function updateNavStyle(){
		const heroBottom = hero.getBoundingClientRect().bottom;
		if(heroBottom > 80){ // still in hero
			nav.classList.add('hero-nav');
		} else {
			nav.classList.remove('hero-nav');
		}
	}
	
	window.addEventListener('scroll', updateNavStyle);
	updateNavStyle();
});


// Highlight active nav link based on current page
function highlightActiveNav(){
	const links = document.querySelectorAll('.nav-links a');
	const pathname = window.location.pathname;
	const path = pathname.split('/').pop();
	const isAdminPath = pathname.includes('/admin/');
	links.forEach(a => {
		const href = a.getAttribute('href');
		if(!href) return;
		// Admin link handling: mark active when viewing anything under /admin/
		if(href.includes('admin/')){
			if(isAdminPath) a.classList.add('active'); else a.classList.remove('active');
			return;
		}
		const clean = href.split('/').pop();
		if((clean === '' || clean === 'index.html') && (path === '' || path === 'index.html')){
			a.classList.add('active');
		} else if(clean === path){
			a.classList.add('active');
		} else {
			a.classList.remove('active');
		}
	});
}
document.addEventListener('DOMContentLoaded', highlightActiveNav);
 
// (nav toggle handled in consolidated block later)

// Smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach(a => {
	a.addEventListener('click', (e) => {
		const href = a.getAttribute('href');
		if(href.length > 1 && href.startsWith('#')){
			const target = document.querySelector(href);
			if(target){
				e.preventDefault();
				target.scrollIntoView({behavior: 'smooth', block: 'start'});
			}
		}
	});
});

// Contact form handler: tries backend, falls back to mailto + localStorage
document.addEventListener('DOMContentLoaded', () => {
	const contactForm = document.getElementById('contact-form');
	if(!contactForm) return;
	const statusEl = document.getElementById('contact-status');
	const clearBtn = document.getElementById('contact-clear');

	contactForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		
		// Honeypot check
		const honeypot = contactForm.querySelector('input[name="website"]')?.value || '';
		if(honeypot.trim()){ console.warn('Honeypot filled'); return; }
		
		if(statusEl) statusEl.textContent = 'Sending…';
		const name = (document.getElementById('c-name') || {}).value?.trim() || '';
		const email = (document.getElementById('c-email') || {}).value?.trim() || '';
		const subject = (document.getElementById('c-subject') || {}).value?.trim() || '';
		const message = (document.getElementById('c-message') || {}).value?.trim() || '';
		if(!name || !email || !message){ if(statusEl) statusEl.textContent = 'Please complete required fields.'; return; }

		const payload = { name, email, subject, message, createdAt: new Date().toISOString() };
		try{
			const res = await fetch(API_BASE + '/api/contact', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
			if(res.ok){ if(statusEl) statusEl.innerHTML = '<strong>Message sent. Thanks!</strong>'; contactForm.reset(); return; }
				// non-OK: service returned an error — show user-friendly message, save locally, then fallback to mailto
				if(statusEl) statusEl.innerHTML = '<strong>Service unavailable — opening your email client as a fallback.</strong>';
				try{
					const stored = JSON.parse(localStorage.getItem('contact_messages')||'[]');
					stored.unshift(payload);
					localStorage.setItem('contact_messages', JSON.stringify(stored));
				}catch(e){ /* ignore */ }
				const mailtoBody = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
				const mailto = `mailto:nbntechteam@gmail.com?subject=${encodeURIComponent(subject||'Contact from website')}&body=${mailtoBody}`;
				window.location.href = mailto;
		}catch(err){
			console.error('Contact send error', err);
			// store locally and open mail client as fallback
			try{
				const stored = JSON.parse(localStorage.getItem('contact_messages')||'[]');
				stored.unshift(payload);
				localStorage.setItem('contact_messages', JSON.stringify(stored));
			}catch(e){ /* ignore */ }
			const mailtoBody = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
			const mailto = `mailto:nbntechteam@gmail.com?subject=${encodeURIComponent(subject||'Contact from website')}&body=${mailtoBody}`;
			window.location.href = mailto; if(statusEl) statusEl.textContent = 'Saved locally and opened email client as fallback.';
		}
	});

	if(clearBtn) clearBtn.addEventListener('click', () => { contactForm.reset(); if(statusEl) statusEl.textContent = ''; });
});

// Fetch and render blog posts from API
async function fetchBlogs(limit){
	const container = document.getElementById('blogs-container');
	if(!container) return;
	container.innerHTML = '<p class="muted">Loading posts…</p>';
	try{
		// try API (fallback disabled by default)
		let posts = await fetchJsonWithFallback('/api/blogs','data/fallback/blogs.json');
		if(!posts || !posts.length){ container.innerHTML = '<p class="muted">No posts yet.</p>'; return; }
		// sort by createdAt desc (newest first) when available
		posts.sort((a,b) => {
			const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return tb - ta;
		});
		if(typeof limit === 'number' && isFinite(limit) && limit > 0){ posts = posts.slice(0, limit); }
		container.innerHTML = posts.map(p => {
			const readMoreHref = `blog.html?id=${encodeURIComponent(p.id)}`;
			const externalHref = p.externalLink || null;
			const externalButton = externalHref
				? `<a href="${externalHref}" class="btn outline" target="_blank" rel="noopener">Open source</a>`
				: `<a href="https://wa.me/?text=${encodeURIComponent(window.location.origin + '/' + 'blog.html?id=' + encodeURIComponent(p.id) + ' ' + (p.title || ''))}" class="btn outline" target="_blank" rel="noopener">Share</a>`;
			return `
			<article class="post blog-post">
				<img src="${p.image||'https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?w=800&h=400&fit=crop'}" alt="${p.title}">
				<h2>${p.title}</h2>
				<p class="meta">${new Date(p.createdAt).toLocaleDateString()} — ${p.excerpt||''}</p>
				<p>${(p.content||'').slice(0,240)}${(p.content||'').length>240?'…':''}</p>
				<div style="display:flex;gap:8px;margin-top:12px">
					<a href="${readMoreHref}" class="btn">Read more</a>
					${externalButton}
				</div>
			</article>
		`}).join('');
	}catch(err){ container.innerHTML = `<p class="muted">Error loading posts.</p>`; console.error(err); }
}

// Fetch and render projects from API
async function fetchProjects(limit){
	const container = document.getElementById('projects-container');
	const homeContainer = document.getElementById('portfolio-grid');
	const target = container || homeContainer;
	console.log('fetchProjects called. Container:', target);
	if(!target) {
		console.log('No target container found');
		return;
	}
	target.innerHTML = '<p class="muted">Loading projects…</p>';
	try{
		console.log('Fetching projects (API)');
		let items = await fetchJsonWithFallback('/api/projects','data/fallback/projects.json');
		console.log('Fetched projects:', items);
		if(!items || !items.length){ target.innerHTML = '<p class="muted">No projects yet.</p>'; return; }
		// sort by createdAt desc if available
		items.sort((a,b) => {
			const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return tb - ta;
		});
		if(typeof limit === 'number' && isFinite(limit) && limit > 0){ items = items.slice(0, limit); }
		// For home page: show as carousel (3 at a time, rotating)
		if(homeContainer === target){
			console.log('Rendering carousel on home page');
			renderProjectCarousel(homeContainer, items);
		} else {
			console.log('Rendering all projects on portfolio page');
			// For portfolio page: show all projects
			target.innerHTML = items.map(p => `
				<div class="project">
					<img src="${p.image||'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop'}" alt="${p.title}">
					<h3>${p.title}</h3>
					<p class="meta">${p.description||''}</p>
					<div style="display:flex;gap:8px;margin-top:8px">
						${p.link ? `<a href="${p.link}" target="_blank" rel="noopener" class="project-link">Live →</a>` : ''}
						${p.github ? `<a href="${p.github}" target="_blank" rel="noopener" class="project-link">GitHub →</a>` : ''}
					</div>
				</div>
			`).join('');
		}
	}catch(err){ 
		console.error('Error fetching projects:', err);
		target.innerHTML = `<p class="muted">Error loading projects.</p>`; 
	}
}

// Carousel for home page - display 3 projects at a time, rotate every minute
let projectCarouselIndex = 0;
let projectCarouselData = [];
function renderProjectCarousel(container, items){
	projectCarouselData = items;
	if(items.length === 0){ container.innerHTML = '<p class="muted">No projects yet.</p>'; return; }
	
	function displayBatch(){
		const batchSize = 3;
		const start = projectCarouselIndex % items.length;
		let batch = [];
		for(let i = 0; i < batchSize && i < items.length; i++){
			batch.push(items[(start + i) % items.length]);
		}
		container.innerHTML = batch.map(p => `
			<div class="project">
				<img src="${p.image||'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop'}" alt="${p.title}">
				<h3>${p.title}</h3>
				<p class="meta">${p.description||''}</p>
				<div style="display:flex;gap:8px;margin-top:8px">
					${p.link ? `<a href="${p.link}" target="_blank" rel="noopener" class="project-link">Live →</a>` : ''}
					${p.github ? `<a href="${p.github}" target="_blank" rel="noopener" class="project-link">GitHub →</a>` : ''}
				</div>
			</div>
		`).join('');
	}
	
	displayBatch();
	
	// Rotate every minute (60000 ms)
	setInterval(() => {
		projectCarouselIndex = (projectCarouselIndex + 3) % items.length;
		displayBatch();
	}, 60000);
}

// Fetch and render team members from API
async function fetchTeam(){
	const container = document.getElementById('team-members');
	if(!container) return;

	// clean demo portraits (Unsplash) used when no `photo` is provided
	const defaultImages = [
		'https://images.unsplash.com/photo-1545996124-1b0b9d6b0c3f?w=800&h=800&fit=crop',
		'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop',
		'https://images.unsplash.com/photo-1531123414780-f0b95d6d6f6d?w=800&h=800&fit=crop'
	];

	try {
		const res = await fetch(API_BASE + '/api/team');
		if(!res.ok) throw new Error('Failed to fetch team');
		const members = await res.json();

		if(!members || members.length === 0){
			container.innerHTML = '<p>No team members yet.</p>';
			return;
		}

		container.innerHTML = '';
		members.forEach((member, idx) => {
			const card = document.createElement('div');
			card.className = 'team-member';
			const linkedinLink = member.linkedin ? `<a href="${member.linkedin}" target="_blank" rel="noopener noreferrer" title="LinkedIn">` +
				`<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.39v-1.2h-2.66v8.37h2.66v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.66M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg></a>` : '';

			const websiteLink = member.website ? `<a href="${member.website}" target="_blank" rel="noopener noreferrer" title="Personal Website">` +
				`<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg></a>` : '';

			const githubLink = member.github ? `<a href="${member.github}" target="_blank" rel="noopener noreferrer" title="GitHub">` +
				`<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.603-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.547 2.91 1.182.092-.92.35-1.548.636-1.903-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg></a>` : '';

			const photoSrc = member.photo || defaultImages[idx % defaultImages.length] || '/images/placeholder.png';

			card.innerHTML = `
				<img src="${photoSrc}" alt="${member.name}" class="team-member-photo">
				<div class="team-member-content">
					<h3 class="team-member-name">${member.name}</h3>
					<p class="team-member-role">${member.role || 'Team Member'}</p>
					<p class="team-member-bio">${member.bio || ''}</p>
					<div class="team-member-social">
						${linkedinLink}
						${websiteLink}
						${githubLink}
					</div>
				</div>
			`;
			container.appendChild(card);
		});
	} catch(err) {
		console.error('Team fetch error:', err);
		container.innerHTML = '<p>Could not load team members.</p>';
	}
}

// Auto-run fetchers on relevant pages
document.addEventListener('DOMContentLoaded', () => {
	const path = window.location.pathname.split('/').pop() || 'index.html';
	console.log('Current page path:', path);
	if(path === 'blogs.html') fetchBlogs();
	if(path === 'portfolio.html') fetchProjects();
	if(path === 'about.html') fetchTeam();
	// Load projects on home page too
	if(path === '' || path === 'index.html') {
		console.log('Loading projects for home page');
		fetchProjects(3);
		// also load latest blogs on the home page
		console.log('Loading blogs for home page');
		fetchBlogs(3);
		// load realtime statistics and poll for updates
		if(document.getElementById('statistics')){
			fetchStats();
			setInterval(fetchStats, 30000); // refresh counts every 30s
		}
	}
});

	// Load and render site-level settings (social handle)
	async function loadSiteSettings(){
		try{
			const res = await fetch(API_BASE + '/api/settings');
			if(!res.ok) throw new Error('No settings');
			const s = await res.json();
			renderSiteSocial(s);
		}catch(err){
			// fallback: nothing
			renderSiteSocial(null);
		}
	}

	function renderSiteSocial(s){
			document.querySelectorAll('.site-social').forEach(el => {
				if(!s || (!s.handle && !s.url)) { el.textContent = ''; return; }
				// Prefer admin-provided platformName (free-text) when present, otherwise fall back to platform
				const label = s.platformName && String(s.platformName).trim() ? String(s.platformName).trim() : (s.platform ? s.platform : '');
				const text = (label ? label + ': ' : '') + (s.handle || s.url);
				if(s.url){
					const icon = getPlatformIcon(s.platform || label);
					el.innerHTML = `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${icon}<span class="site-social-text">${escapeHtml(text)}</span></a>`;
				}else{
					const icon = getPlatformIcon(s.platform || label);
					el.innerHTML = `${icon}<span class="site-social-text">${escapeHtml(text)}</span>`;
				}
			});
	}

// Return inline SVG for common platforms; fallback to generic link icon
function getPlatformIcon(name){
    if(!name) return '';
    const n = String(name).toLowerCase();
    if(n.includes('telegram')) return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;fill:currentColor"><path d="M21.6 3.2c-.3-.2-.7-.2-1 .0L2.6 10.1c-.8.3-.8 1.5.1 1.8l4.7 1.4 1.9 6.1c.2.7 1.2.8 1.6.2l2.2-3.1 3.6 2.6c.6.4 1.4-.1 1.1-.8L22 4.3c-.1-.4-.3-.7-.4-1.1z"></path></svg>';
    if(n.includes('twitter')) return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;fill:currentColor"><path d="M22 5.9c-.6.3-1.2.5-1.9.6.7-.4 1.2-1 1.4-1.8-.6.4-1.4.6-2.2.8C18.5 4.9 17.6 4.5 16.6 4.5c-1.6 0-2.9 1.3-2.9 2.9 0 .2 0 .4.0.6C10.9 7.8 8 6.2 6 3.8c-.3.6-.5 1.3-.5 2 0 1.3.6 2.5 1.6 3.2-.6 0-1.2-.2-1.7-.5v.0c0 1.9 1.3 3.5 3 3.9-.3.1-.6.1-.9.1-.2 0-.4 0-.6-.1.4 1.3 1.6 2.2 3 2.2-1.1.8-2.4 1.2-3.9 1.2-.2 0-.4 0-.6-.0 1.4.9 3 1.4 4.7 1.4 5.6 0 8.6-4.7 8.6-8.6v-.4c.6-.4 1.1-1 1.5-1.6-.6.3-1.2.5-1.9.6z"></path></svg>';
    if(n.includes('mastodon')) return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;fill:currentColor"><path d="M12 2C7 2 4 5 4 10v3c0 3.3 2.7 6 6 6 1.4 0 2.7-.5 3.7-1.4.5-.4 1.1-.6 1.8-.6s1.3.2 1.8.6C21.3 19 24 16.3 24 13v-3c0-5-3-8-12-8z"></path></svg>';
    if(n.includes('github') || n.includes('git')) return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;fill:currentColor"><path d="M12 .5C5.7.5.8 5.4.8 11.7c0 4.7 3 8.7 7.2 10.1.5.1.7-.2.7-.5v-1.9c-2.9.6-3.5-1.2-3.5-1.2-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1 1.6.8 1.9 1.1.1-.9.4-1.6.8-2-2.3-.3-4.7-1.1-4.7-4.9 0-1.1.4-2 1.1-2.7-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 3 .9.9-.2 1.8-.4 2.7-.4s1.8.1 2.7.4c2.1-1.3 3-.9 3-.9.6 1.4.2 2.4.1 2.7.7.7 1.1 1.6 1.1 2.7 0 3.8-2.4 4.6-4.7 4.9.4.3.7 1 .7 2v3c0 .3.2.6.7.5 4.2-1.4 7.2-5.4 7.2-10.1C23.2 5.4 18.3.5 12 .5z"></path></svg>';
    if(n.includes('linkedin') || n.includes('in')) return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;fill:currentColor"><path d="M4.98 3.5C3.88 3.5 3 4.4 3 5.5s.88 2 1.98 2H5c1.1 0 2-.9 2-2S6.08 3.5 5 3.5h-.02zM3 8.98h3.96V21H3V8.98zM9 8.98H13v1.6h.1c.6-1 2.1-2.1 4.3-2.1 4.6 0 5.4 3 5.4 6.9V21h-4v-5.6c0-1.3 0-3-1.9-3-1.9 0-2.2 1.5-2.2 2.9V21H9V8.98z"></path></svg>';
    // fallback generic link icon
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;fill:currentColor"><path d="M3.9 12c0-2 1.6-3.6 3.6-3.6h3v1.8h-3c-1 0-1.8.8-1.8 1.8s.8 1.8 1.8 1.8h3v1.8h-3c-2 0-3.6-1.6-3.6-3.6zM8.1 9.6h7.8c1 0 1.8.8 1.8 1.8s-.8 1.8-1.8 1.8H8.1v-1.8h7.8c.2 0 .4-.2.4-.4s-.2-.4-.4-.4H8.1V9.6z"></path></svg>';
}

	// reload when admin updates settings (localStorage broadcast)
	window.addEventListener('storage', (e) => {
		if(e.key === 'site-settings-updated') loadSiteSettings();
	});

	document.addEventListener('DOMContentLoaded', loadSiteSettings);

// Helper: fetch JSON from API, fall back to a local JSON file path when API fails
async function fetchJsonWithFallback(apiPath, fallbackPath){
	const ALLOW_FALLBACK = false; // set to true only for local dev/testing
	try{
		const r = await fetch(API_BASE + apiPath);
		if(r && r.ok) return await r.json();
	}catch(e){ /* network or CORS error */ }
	if(!ALLOW_FALLBACK) return null;
	try{
		const r2 = await fetch(fallbackPath);
		if(r2 && r2.ok) return await r2.json();
	}catch(e){ /* no fallback */ }
	return null;
}

// Animated count helper
function animateCount(el, end, duration = 900){
	if(!el) return;
	const start = Number(el.getAttribute('data-last') || 0) || 0;
	const target = Number(end) || 0;
	const startTime = performance.now();
	function tick(now){
		const p = Math.min((now - startTime) / duration, 1);
		const value = Math.floor(start + (target - start) * p);
		el.textContent = value;
		if(p < 1) requestAnimationFrame(tick);
		else el.setAttribute('data-last', String(target));
	}
	requestAnimationFrame(tick);
}

// Fetch and display real-time counts for projects, blogs, team and reviews
async function fetchStats(){
	try{
		// Projects count
		let projectsCount = 0;
		try{
			const resP = await fetch(API_BASE + '/api/projects');
			if(resP.ok){
				const items = await resP.json();
				projectsCount = Array.isArray(items) ? items.length : 0;
			}
		}catch(e){ console.warn('projects count fetch failed', e); }

		// Blogs count
		let blogsCount = 0;
		try{
			const resB = await fetch(API_BASE + '/api/blogs');
			if(resB.ok){ const b = await resB.json(); blogsCount = Array.isArray(b) ? b.length : 0; }
		}catch(e){ console.warn('blogs count fetch failed', e); }

		// Team count
		let teamCount = 0;
		try{
			const resT = await fetch(API_BASE + '/api/team');
			if(resT.ok){ const t = await resT.json(); teamCount = Array.isArray(t) ? t.length : 0; }
		}catch(e){ console.warn('team count fetch failed', e); }

		// Reviews count
		let reviewsCount = 0;
		try{
			const resR = await fetch(API_BASE + '/api/reviews');
			if(resR.ok){ const r = await resR.json(); reviewsCount = Array.isArray(r) ? r.length : 0; }
		}catch(e){ console.warn('reviews count fetch failed', e); }

		// Fallbacks: if API missing, try using localStorage where applicable
		try{ if(!projectsCount) projectsCount = Number(localStorage.getItem('projects_count')||projectsCount); }catch(e){}

		const elP = document.getElementById('stat-projects'); if(elP) animateCount(elP, projectsCount);
		const elB = document.getElementById('stat-blogs'); if(elB) animateCount(elB, blogsCount);
		const elT = document.getElementById('stat-team'); if(elT) animateCount(elT, teamCount);
		const elR = document.getElementById('stat-reviews'); if(elR) animateCount(elR, reviewsCount);
	}catch(err){ console.error('fetchStats error', err); }
}

// --- Reviews: modal, localStorage, rendering ---
const REVIEWS_KEY = 'nbn_reviews_v1';
async function defaultReviews(){
	// Do not return seeded demo reviews — default to empty so only real reviews appear
	return [];
}

async function loadReviews(){
	// Try to fetch from server; fallback to localStorage or seeded defaults
	const container = document.getElementById('reviews-container');
	if(!container) return [];
	try{
		const res = await fetch(API_BASE + '/api/reviews');
		if(res.ok){
			const data = await res.json();
			return data;
		}
	}catch(err){ /* network error — fallback below */ }

	try{
		const raw = localStorage.getItem(REVIEWS_KEY);
		if(!raw) return [];
		return JSON.parse(raw);
	}catch(e){ console.error('loadReviews', e); return []; }
}

function saveReviewsLocal(reviews){
	try{ localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); }catch(e){ console.error('saveReviews', e); }
}

async function renderReviews(){
	const container = document.getElementById('reviews-container');
	if(!container) return;
	const reviews = await loadReviews();
	container.innerHTML = reviews.map(r => {
		const rating = r.rating ? parseInt(r.rating,10) : 0;
		const stars = new Array(5).fill(0).map((_,i)=> i<rating ? '<svg viewBox="0 0 24 24" fill="#ffb400" aria-hidden="true"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896 3.664 23.165l1.402-8.168L-0.868 9.21l8.2-1.192z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="#ffb400" aria-hidden="true"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896 3.664 23.165l1.402-8.168L-0.868 9.21l8.2-1.192z"/></svg>').join('');
		return `
		<div class="review-card">
			<p class="quote">"${escapeHtml(r.text)}"</p>
			<div class="meta-row">
			  <p class="author">— ${escapeHtml(r.author)}${r.role?`, ${escapeHtml(r.role)}`:''}</p>
			  <div class="review-rating">${stars}</div>
			</div>
		</div>
	`}).join('');

	// start carousel after rendering
	startReviewCarousel();
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Modal controls
function openModal(){
	const modal = document.getElementById('review-modal');
	if(!modal) return; modal.setAttribute('aria-hidden','false'); modal.classList.add('open');
	const input = document.getElementById('review-author'); if(input) input.focus();
}
function closeModal(){
	const modal = document.getElementById('review-modal'); if(!modal) return; modal.setAttribute('aria-hidden','true'); modal.classList.remove('open');
}

function startReviewCarousel(){
	const container = document.getElementById('reviews-container');
	if(!container) return;
	const cards = container.querySelectorAll('.review-card');
	if(!cards || cards.length === 0) return;
	// stop any existing interval
	if(reviewIntervalId) clearInterval(reviewIntervalId);
	reviewIndex = 0;
	// ensure start position
	container.scrollLeft = 0;
	if(cards.length === 1) return; // no rotation needed
	reviewIntervalId = setInterval(() => {
		reviewIndex = (reviewIndex + 1) % cards.length;
		const card = cards[reviewIndex];
		// center the card in the container
		const left = card.offsetLeft - Math.max(0, (container.clientWidth - card.clientWidth) / 2);
		container.scrollTo({ left, behavior: 'smooth' });
	}, 5000);
}

function stopReviewCarousel(){
	if(reviewIntervalId) { clearInterval(reviewIntervalId); reviewIntervalId = null; }
}

document.addEventListener('DOMContentLoaded', () => {
	// render existing reviews
	renderReviews();

	const addBtn = document.getElementById('add-review');
	if(addBtn) addBtn.addEventListener('click', openModal);

	// modal close (backdrop and close button)
	document.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closeModal));
	const closeBtn = document.querySelector('.modal-close'); if(closeBtn) closeBtn.addEventListener('click', closeModal);

	const form = document.getElementById('review-form');
	if(form){
		form.addEventListener('submit', async (e) =>{
			e.preventDefault();
			const author = form.querySelector('#review-author').value.trim() || 'Anonymous';
			const role = form.querySelector('#review-role').value.trim();
			const text = form.querySelector('#review-text').value.trim();
			const rating = form.querySelector('#review-rating') ? form.querySelector('#review-rating').value || null : null;
			if(!text){ alert('Please enter a review'); return; }
			// Try to POST to server; if it fails, save locally
			try{
				const res = await fetch(API_BASE + '/api/reviews', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ author, role, text, rating }) });
				if(res.ok){
					// refresh from server
					await renderReviews();
					form.reset(); closeModal(); return;
				}
			}catch(err){ /* network error */ }

			// Fallback: save locally
			const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
			reviews.unshift({author, role, text, rating: rating ? parseInt(rating,10) : null, createdAt: new Date().toISOString()});
			saveReviewsLocal(reviews);
			renderReviews();
			form.reset();
			closeModal();
		});
	}
});

// Tech stack 'see more' toggle on portfolio page
document.addEventListener('DOMContentLoaded', () => {
	const techBtn = document.getElementById('tech-see-more');
	const techList = document.getElementById('tech-tags');
	if(!techBtn || !techList) return;
	techBtn.addEventListener('click', () => {
		techList.classList.toggle('open');
		techBtn.textContent = techList.classList.contains('open') ? 'Show less' : 'See more';
	});
});

// Blog tags 'see more' toggle
document.addEventListener('DOMContentLoaded', () => {
	const tagBtn = document.getElementById('tag-see-more');
	const tagList = document.getElementById('blog-tags');
	if(!tagBtn || !tagList) return;
	tagBtn.addEventListener('click', () => {
		tagList.classList.toggle('open');
		tagBtn.textContent = tagList.classList.contains('open') ? 'Show less' : 'See more';
	});
});

// FAQ accordion animation
document.addEventListener('DOMContentLoaded', () => {
	const faqItems = document.querySelectorAll('.faq details');
	faqItems.forEach((detail, idx) => {
		detail.style.animation = `slideUpFade 0.6s ease-out ${0.1 * (idx + 1)}s forwards`;
		detail.style.opacity = '0';
		detail.addEventListener('toggle', (e) => {
			if(e.target.open){
				e.target.style.animation = 'none';
				e.target.offsetHeight; // trigger reflow
				e.target.style.animation = 'slideUpFade 0.4s ease-out forwards';
			}
		});
	});
});

// Responsive nav: ensure toggles exist and attach per-nav handlers
document.addEventListener('DOMContentLoaded', () => {
	function ensureNavToggles(){
		document.querySelectorAll('.site-nav').forEach(nav => {
			if(nav.querySelector('.nav-toggle')) return;
			const btn = document.createElement('button');
			btn.className = 'nav-toggle';
			btn.setAttribute('aria-controls', 'primary-nav');
			btn.setAttribute('aria-expanded', 'false');
			btn.setAttribute('aria-label', 'Toggle navigation');
			btn.innerHTML = '<span class="hamburger"></span>';
			const primary = nav.querySelector('#primary-nav');
			if(primary) nav.insertBefore(btn, primary);
			else nav.appendChild(btn);
		});
	}

	ensureNavToggles();

	document.querySelectorAll('.nav-toggle').forEach(navToggle => {
		navToggle.addEventListener('click', function(e){
			e.stopPropagation();
			const nav = this.closest('.site-nav') || document;
			const navLinks = nav.querySelector('#primary-nav') || document.getElementById('primary-nav');
			if(!navLinks) return;
			const open = navLinks.classList.toggle('open');
			this.classList.toggle('open', open);
			this.setAttribute('aria-expanded', open ? 'true' : 'false');

			// Fallback: force inline display so menu shows even if CSS specificity interferes
			try{
				if(open){
					navLinks.style.display = 'flex';
					navLinks.style.flexDirection = 'column';
					navLinks.style.zIndex = '10000';
				} else {
					navLinks.style.display = 'none';
				}
			}catch(err){ console.error('nav toggle inline style failed', err); }

			console.log('Nav toggle clicked — open:', open, 'navLinks:', navLinks);
			// focus first link for accessibility
			const first = navLinks.querySelector('a'); if(open && first) first.focus();
		});

		// close nav when a link inside is clicked
		const nav = navToggle.closest('.site-nav') || document;
		const navLinks = nav.querySelector('#primary-nav') || document.getElementById('primary-nav');
		if(navLinks){
			navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
				if(navLinks.classList.contains('open')){
					navLinks.classList.remove('open');
					navToggle.classList.remove('open');
					navToggle.setAttribute('aria-expanded','false');
				}
			}));
		}
	});

	// Close when clicking outside any open nav (capture)
	document.addEventListener('click', (e) => {
		document.querySelectorAll('.nav-links.open').forEach(navLinks => {
			const nav = navLinks.closest('.site-nav') || document;
			const navToggle = nav.querySelector('.nav-toggle');
			if(!navLinks.contains(e.target) && !(navToggle && navToggle.contains(e.target))){
				navLinks.classList.remove('open');
				if(navToggle) navToggle.classList.remove('open');
				if(navToggle) navToggle.setAttribute('aria-expanded','false');
			}
		});
	}, true);
});