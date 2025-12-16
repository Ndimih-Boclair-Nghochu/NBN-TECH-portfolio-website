#!/bin/bash
set -e
yum update -y
# install node and git
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs git

# clone repository (assumes public or accessible repo)
cd /home/ec2-user
if [ ! -d "portfolio_template" ]; then
  git clone https://github.com/OWNER/REPO.git portfolio_template || true
fi
cd portfolio_template/server || exit 0

# write env file for server
cat >/home/ec2-user/portfolio.env <<EOF
PORT=3000
DATABASE_URL=postgres://${db_user}:${db_pass}@${db_host}:5432/${db_name}
SESSION_SECRET="change_this_in_prod"
S3_BUCKET=${bucket}
S3_REGION="us-east-1"
NODE_ENV=production
EOF

# run app
# use a simple background start so Terraform apply completes; in production use systemd or PM2
npm install --production
nohup node index.js > /var/log/portfolio.out 2>&1 &
