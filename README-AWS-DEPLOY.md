Deployment (AWS) - Overview

This project is prepared for AWS deployment. Recommended production architecture:

- Frontend static files: Amazon S3 + CloudFront
- Backend API: Node.js (Express) on Elastic Beanstalk (or ECS/Fargate with Docker)
- Database: Amazon RDS (Postgres)
- File storage: Amazon S3 (for uploaded images)

Quick local steps
1. Install dependencies
   cd server
   npm install

2. Create local env file `.env` (copy `.env.example`)
   PORT=3000
   SESSION_SECRET=change_this
   ADMIN_EMAIL=ndimihboclair4@gmail.com
   ADMIN_PASSWORD=@Boclair444

3. Initialize DB and create admin
   npm run migrate

4. Run server in dev
   npm run dev

Production notes
- Do NOT commit `.env` or secrets. Use AWS Secrets Manager or EB environment variables.
- Use RDS PostgreSQL for production. Set `DATABASE_URL` env var.
- Configure S3 bucket and update upload code to use `multer-s3` (sample code will be included in server comments).
- Use HTTPS behind CloudFront + ACM SSL certificate.

I will provide an `eb` config and optional `Dockerfile` on request.
