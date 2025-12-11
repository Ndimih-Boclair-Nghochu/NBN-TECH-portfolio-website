const items = document.querySelectorAll('[data-animate]');

function onScroll(){
	items.forEach(i => {
		if(i.getBoundingClientRect().top < window.innerHeight - 100) i.classList.add('active');
	});
}

window.addEventListener('scroll', onScroll);
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
 
// Mobile nav toggle (hamburger)
document.addEventListener('DOMContentLoaded', () => {
	const navToggle = document.querySelector('.nav-toggle');
	const navLinks = document.getElementById('primary-nav');
	if(!navToggle || !navLinks) return;

	navToggle.addEventListener('click', (e) => {
		e.stopPropagation();
		const open = navLinks.classList.toggle('open');
		navToggle.classList.toggle('open', open);
		navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
	});

	// Close nav when clicking outside (use capture to run early)
	document.addEventListener('click', (e) => {
		if(!navLinks.classList.contains('open')) return;
		if(!navLinks.contains(e.target) && !navToggle.contains(e.target)){
			navLinks.classList.remove('open');
			navToggle.classList.remove('open');
			navToggle.setAttribute('aria-expanded', 'false');
		}
	}, true);
});

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
			const res = await fetch('/api/contact', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
			if(res.ok){ if(statusEl) statusEl.innerHTML = '<strong>Message sent. Thanks!</strong>'; contactForm.reset(); return; }
			// non-OK: fallback to mailto
			const mailtoBody = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
			const mailto = `mailto:hello@example.com?subject=${encodeURIComponent(subject||'Contact from website')}&body=${mailtoBody}`;
			window.location.href = mailto; if(statusEl) statusEl.textContent = 'Opened your email client as a fallback.';
		}catch(err){
			console.error('Contact send error', err);
			// store locally and open mail client as fallback
			try{
				const stored = JSON.parse(localStorage.getItem('contact_messages')||'[]');
				stored.unshift(payload);
				localStorage.setItem('contact_messages', JSON.stringify(stored));
			}catch(e){ /* ignore */ }
			const mailtoBody = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
			const mailto = `mailto:hello@example.com?subject=${encodeURIComponent(subject||'Contact from website')}&body=${mailtoBody}`;
			window.location.href = mailto; if(statusEl) statusEl.textContent = 'Saved locally and opened email client as fallback.';
		}
	});

	if(clearBtn) clearBtn.addEventListener('click', () => { contactForm.reset(); if(statusEl) statusEl.textContent = ''; });
});

// Fetch and render blog posts from API
async function fetchBlogs(){
	const container = document.getElementById('blogs-container');
	if(!container) return;
	container.innerHTML = '<p class="muted">Loading posts…</p>';
	try{
		const res = await fetch('/api/blogs');
		if(!res.ok) throw new Error('Failed to load');
		const posts = await res.json();
		if(!posts.length){ container.innerHTML = '<p class="muted">No posts yet.</p>'; return; }
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
async function fetchProjects(){
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
		console.log('Fetching from /api/projects');
		const res = await fetch('/api/projects');
		console.log('Response status:', res.status);
		if(!res.ok) throw new Error('Failed to load (status ' + res.status + ')');
		const items = await res.json();
		console.log('Fetched projects:', items);
		if(!items.length){ target.innerHTML = '<p class="muted">No projects yet.</p>'; return; }
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
		const res = await fetch('/api/team');
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
		fetchProjects();
	}
});

// --- Reviews: modal, localStorage, rendering ---
const REVIEWS_KEY = 'nbn_reviews_v1';
async function defaultReviews(){
	return [
		{author:'Jane Doe', role:'CEO', text:'NBN TECH delivered an excellent product on time — highly recommended.', createdAt: new Date().toISOString()},
		{author:'John Smith', role:'Founder', text:'Professional team and great communication throughout the project.', createdAt: new Date().toISOString()}
	];
}

async function loadReviews(){
	// Try to fetch from server; fallback to localStorage or seeded defaults
	const container = document.getElementById('reviews-container');
	if(!container) return [];
	try{
		const res = await fetch('/api/reviews');
		if(res.ok){
			const data = await res.json();
			return data;
		}
	}catch(err){ /* network error — fallback below */ }

	try{
		const raw = localStorage.getItem(REVIEWS_KEY);
		if(!raw) return await defaultReviews();
		return JSON.parse(raw);
	}catch(e){ console.error('loadReviews', e); return await defaultReviews(); }
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
				const res = await fetch('/api/reviews', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ author, role, text, rating }) });
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

// Responsive nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.getElementById('primary-nav');
if(navToggle && navLinks){
	navToggle.addEventListener('click', () => {
		const open = navLinks.classList.toggle('open');
		navToggle.classList.toggle('open', open);
		navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
	});
	// close nav when link clicked (mobile)
	navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
		if(navLinks.classList.contains('open')){
			navLinks.classList.remove('open');
			navToggle.classList.remove('open');
			navToggle.setAttribute('aria-expanded','false');
		}
	}));
}