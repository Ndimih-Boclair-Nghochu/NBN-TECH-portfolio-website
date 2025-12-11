require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const db = require('./models');
const User = db.User;
const Project = db.Project;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'data') }),
  secret: process.env.SESSION_SECRET || 'change_this_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'-'))
});
const upload = multer({ storage });

// Rate limiting for contact form (simple in-memory store per IP)
const contactRateLimits = new Map();
function checkContactRateLimit(ip) {
  const now = Date.now();
  const key = ip;
  const data = contactRateLimits.get(key) || { count: 0, resetTime: now + 60000 };
  
  if (now > data.resetTime) {
    data.count = 0;
    data.resetTime = now + 60000;
  }
  
  data.count++;
  contactRateLimits.set(key, data);
  
  return data.count <= 5; // max 5 per minute
}

// Serve admin & frontend static files
app.use('/', express.static(path.join(__dirname, '..')));

// Auth endpoints
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = await User.findOne({ where: { email } });
  if(!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  req.session.save(() => {});
  res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/logout', (req,res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

function requireAuth(req,res,next){
  if(req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Projects CRUD
app.get('/api/projects', async (req,res) => {
  const projects = await Project.findAll({ order: [['createdAt','DESC']] });
  res.json(projects);
});

app.post('/api/projects', requireAuth, upload.single('image'), async (req,res) => {
  const { title, slug, description, link, github } = req.body;
  let imagePath = null;
  if(req.file) imagePath = '/uploads/' + path.basename(req.file.path);
  try{
    const p = await Project.create({ title, slug, description, link, github, image: imagePath });
    res.json(p);
  }catch(err){
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', requireAuth, upload.single('image'), async (req,res) => {
  const id = req.params.id;
  const project = await Project.findByPk(id);
  if(!project) return res.status(404).json({ error: 'Not found' });
  const { title, slug, description, link, github } = req.body;
  if(req.file){
    project.image = '/uploads/' + path.basename(req.file.path);
  }
  project.title = title;
  project.slug = slug;
  project.description = description;
  project.link = link;
  project.github = github;
  await project.save();
  res.json(project);
});

app.delete('/api/projects/:id', requireAuth, async (req,res) => {
  const id = req.params.id;
  const p = await Project.findByPk(id);
  if(!p) return res.status(404).json({ error: 'Not found' });
  await p.destroy();
  res.json({ ok: true });
});

// Blogs CRUD
app.get('/api/blogs', async (req,res) => {
  const blogs = await db.Blog.findAll({ order: [['createdAt','DESC']] });
  res.json(blogs);
});

app.post('/api/blogs', requireAuth, upload.single('image'), async (req,res) => {
  const { title, slug, excerpt, content, externalLink, ctaLink, ctaText } = req.body;
  let imagePath = null;
  if(req.file) imagePath = '/uploads/' + path.basename(req.file.path);
  try{
    const b = await db.Blog.create({ title, slug, excerpt, content, image: imagePath, externalLink, ctaLink, ctaText });
    res.json(b);
  }catch(err){ res.status(500).json({ error: err.message }); }
});

app.put('/api/blogs/:id', requireAuth, upload.single('image'), async (req,res) => {
  const b = await db.Blog.findByPk(req.params.id);
  if(!b) return res.status(404).json({ error: 'Not found' });
  const { title, slug, excerpt, content, externalLink, ctaLink, ctaText } = req.body;
  if(req.file) b.image = '/uploads/' + path.basename(req.file.path);
  b.title = title; b.slug = slug; b.excerpt = excerpt; b.content = content; b.externalLink = externalLink; b.ctaLink = ctaLink; b.ctaText = ctaText;
  await b.save();
  res.json(b);
});

app.delete('/api/blogs/:id', requireAuth, async (req,res) => {
  const b = await db.Blog.findByPk(req.params.id);
  if(!b) return res.status(404).json({ error: 'Not found' });
  await b.destroy();
  res.json({ ok: true });
});

// Reviews CRUD (public POST, admin manages edits/deletes)
app.get('/api/reviews', async (req,res) => {
  const items = await db.Review.findAll({ order: [['createdAt','DESC']] });
  res.json(items);
});

app.post('/api/reviews', async (req,res) => {
  const { author, role, text, rating } = req.body;
  if(!text) return res.status(400).json({ error: 'Missing review text' });
  let rInt = null;
  if(rating !== undefined && rating !== null){
    const parsed = parseInt(rating,10);
    if(!isNaN(parsed) && parsed >=1 && parsed <=5) rInt = parsed;
  }
  try{
    const r = await db.Review.create({ author: author || 'Anonymous', role, text, rating: rInt });
    res.json(r);
  }catch(err){ res.status(500).json({ error: err.message }); }
});

app.put('/api/reviews/:id', requireAuth, async (req,res) => {
  const r = await db.Review.findByPk(req.params.id); if(!r) return res.status(404).json({ error: 'Not found' });
  const { author, role, text, rating } = req.body;
  r.author = author; r.role = role; r.text = text;
  if(rating !== undefined){ const parsed = parseInt(rating,10); r.rating = (!isNaN(parsed) && parsed>=1 && parsed<=5) ? parsed : null; }
  await r.save(); res.json(r);
});

app.delete('/api/reviews/:id', requireAuth, async (req,res) => { const r = await db.Review.findByPk(req.params.id); if(!r) return res.status(404).json({ error:'Not found' }); await r.destroy(); res.json({ ok:true }); });

// Services CRUD
app.get('/api/services', async (req,res) => {
  const items = await db.Service.findAll({ order: [['id','ASC']] });
  res.json(items);
});
app.post('/api/services', requireAuth, upload.single('icon'), async (req,res) => {
  const { name, slug, description } = req.body;
  let icon = null; if(req.file) icon = '/uploads/' + path.basename(req.file.path);
  const s = await db.Service.create({ name, slug, description, icon });
  res.json(s);
});
app.put('/api/services/:id', requireAuth, upload.single('icon'), async (req,res) => {
  const s = await db.Service.findByPk(req.params.id); if(!s) return res.status(404).json({ error: 'Not found' });
  const { name, slug, description } = req.body; if(req.file) s.icon = '/uploads/' + path.basename(req.file.path);
  s.name = name; s.slug = slug; s.description = description; await s.save(); res.json(s);
});
app.delete('/api/services/:id', requireAuth, async (req,res) => { const s = await db.Service.findByPk(req.params.id); if(!s) return res.status(404).json({ error: 'Not found' }); await s.destroy(); res.json({ ok:true }); });

// Skills CRUD
app.get('/api/skills', async (req,res) => { const items = await db.Skill.findAll({ order: [['order','ASC']] }); res.json(items); });
app.post('/api/skills', requireAuth, async (req,res) => { const { name, level, order } = req.body; const s = await db.Skill.create({ name, level, order: order||0 }); res.json(s); });
app.put('/api/skills/:id', requireAuth, async (req,res) => { const s = await db.Skill.findByPk(req.params.id); if(!s) return res.status(404).json({ error:'Not found' }); const { name, level, order } = req.body; s.name = name; s.level = level; s.order = order||0; await s.save(); res.json(s); });
app.delete('/api/skills/:id', requireAuth, async (req,res) => { const s = await db.Skill.findByPk(req.params.id); if(!s) return res.status(404).json({ error:'Not found' }); await s.destroy(); res.json({ ok:true }); });

// Team members CRUD
app.get('/api/team', async (req,res) => { const members = await db.TeamMember.findAll({ order:[['id','ASC']] }); res.json(members); });
app.post('/api/team', requireAuth, upload.single('photo'), async (req,res) => { const { name, role, bio, linkedin, website, github } = req.body; let photo = null; if(req.file) photo = '/uploads/' + path.basename(req.file.path); const m = await db.TeamMember.create({ name, role, bio, linkedin, website, github, photo }); res.json(m); });
app.put('/api/team/:id', requireAuth, upload.single('photo'), async (req,res) => { const m = await db.TeamMember.findByPk(req.params.id); if(!m) return res.status(404).json({ error:'Not found' }); const { name, role, bio, linkedin, website, github } = req.body; if(req.file) m.photo = '/uploads/' + path.basename(req.file.path); m.name = name; m.role = role; m.bio = bio; m.linkedin = linkedin; m.website = website; m.github = github; await m.save(); res.json(m); });
app.delete('/api/team/:id', requireAuth, async (req,res) => { const m = await db.TeamMember.findByPk(req.params.id); if(!m) return res.status(404).json({ error:'Not found' }); await m.destroy(); res.json({ ok:true }); });

// Contact submissions
app.post('/api/contact', async (req, res) => {
  try{
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Rate limiting check
    if(!checkContactRateLimit(ip)){
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    // Honeypot check
    const honeypot = req.body.website || '';
    if(honeypot && honeypot.trim()){
      console.warn('Honeypot triggered from IP:', ip);
      return res.status(400).json({ error: 'Invalid submission' });
    }
    
    const { name, email, subject, message } = req.body;
    if(!message || !email) return res.status(400).json({ error: 'Missing required fields' });
    
    // Basic email validation
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    const rec = await db.Contact.create({ name, email, subject, message });
    res.json({ ok: true, id: rec.id });
  }catch(err){
    console.error('Contact POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contact', requireAuth, async (req,res) => {
  const items = await db.Contact.findAll({ order: [['createdAt','DESC']] });
  res.json(items);
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health
app.get('/api/health', (req,res) => res.json({ ok: true }));

// Start server and sync DB
async function start(){
  try {
    await db.sequelize.authenticate();
    console.log('DB authenticated');
    await db.sequelize.sync();
    console.log('DB synced');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('Server running on port ' + PORT);
    });
    server.on('error', (err) => {
      console.error('Server socket error:', err);
      process.exit(1);
    });
    // Return a never-resolving promise to keep process alive
    return new Promise(() => {});
  } catch(err) {
    console.error('Start error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

// Catch any unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

start().then(() => {
  console.log('Server started successfully');
}).catch(err => {
  console.error('Fatal error:', err);
  console.error(err.stack);
  process.exit(1);
});
