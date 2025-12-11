// simple sync script to create db and initial admin
require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcrypt');

async function sync(){
  await db.sequelize.sync({ alter: true });
  const adminEmail = process.env.ADMIN_EMAIL || 'ndimihboclair4@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || '@Boclair444';
  const User = db.User;
  const existing = await User.findOne({ where: { email: adminEmail } });
  if(!existing){
    const hash = await bcrypt.hash(adminPassword, 10);
    await User.create({ email: adminEmail, passwordHash: hash, name: 'NBN TECH TEAM Admin' });
    console.log('Created initial admin:', adminEmail);
  } else {
    console.log('Admin already exists:', adminEmail);
  }
  // Basic seed for skills/services/projects (optional quick-start)
  const Project = db.Project;
  const Skill = db.Skill;
  const Service = db.Service;
  const TeamMember = db.TeamMember;
  const Blog = db.Blog;
  const pCount = await Project.count();
  if(pCount===0){
    await Project.bulkCreate([
      { title: 'E-Commerce Platform', slug: 'ecommerce-platform', description: 'A fully responsive e-commerce platform with cart, checkout, and payment integration using React and Stripe API.', image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=600&h=400&fit=crop', link: 'https://ecommerce-demo.example.com', github: 'https://github.com/yourusername/ecommerce-platform' },
      { title: 'Analytics Dashboard', slug: 'analytics-dashboard', description: 'Real-time data visualization dashboard with interactive charts, filters, and performance metrics for business insights.', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop', link: 'https://analytics-demo.example.com', github: 'https://github.com/yourusername/analytics-dashboard' },
      { title: 'Task Management App', slug: 'task-management-app', description: 'Collaborative task management tool with drag-and-drop boards, real-time updates, and team workspace features.', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop', link: 'https://tasks-demo.example.com', github: 'https://github.com/yourusername/task-management-app' }
    ]);
  }
  const sCount = await Skill.count();
  if(sCount===0){ await Skill.bulkCreate([{ name:'HTML', level:'Expert', order:1 },{ name:'CSS', level:'Expert', order:2 },{ name:'JavaScript', level:'Advanced', order:3 }]); }
  const svcCount = await Service.count();
  if(svcCount===0){ await Service.create({ name:'Web Development', slug:'web-development', description:'Full-stack web development services.' }); }
  const tCount = await TeamMember.count();
  if(tCount===0){ 
    await TeamMember.bulkCreate([
      { name:'Ndimih Boclair', role:'Founder & CEO', bio:'Founder of NBN TECH TEAM. Full-stack developer with 5+ years of experience building scalable web applications. Passionate about clean code and DevOps.', linkedin:'https://linkedin.com/in/ndimih-boclair', website:'https://ndimihboclair.com', github:'https://github.com/ndimih-boclair', photo: 'https://images.unsplash.com/photo-1545996124-1b0b9d6b0c3f?w=800&h=800&fit=crop' },
      { name:'Sarah Johnson', role:'Lead Developer', bio:'Senior full-stack engineer specializing in React and Node.js. Expert in cloud architecture and performance optimization.', linkedin:'https://linkedin.com/in/sarah-johnson', website:'https://sarahjohnson.dev', github:'https://github.com/sarahjohnson', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop' },
      { name:'Michael Chen', role:'Product Designer', bio:'UX/UI designer with a focus on user-centered design. Experienced in creating intuitive interfaces for complex applications.', linkedin:'https://linkedin.com/in/michael-chen', website:'https://michaelchen.design', github:'https://github.com/michaelchen', photo: 'https://images.unsplash.com/photo-1531123414780-f0b95d6d6f6d?w=800&h=800&fit=crop' }
    ]); 
  }
  const bCount = await Blog.count();
  if(bCount===0){ await Blog.create({ title:'Welcome', slug:'welcome', excerpt:'Welcome to NBN TECH TEAM', content:'This is a demo blog post.', image: 'https://images.unsplash.com/photo-1508830524289-0adcbe822b40?w=1200&h=400&fit=crop', externalLink: 'https://example.com/welcome' }); }
  const rCount = await db.Review.count();
  if(rCount===0){ await db.Review.bulkCreate([
    { author: 'Jane Doe', role: 'CEO', text: 'NBN TECH delivered an excellent product on time — highly recommended.' },
    { author: 'John Smith', role: 'Founder', text: 'Professional team and great communication throughout the project.' }
  ]); }
  process.exit(0);
}

sync().catch(err => { console.error(err); process.exit(1); });
