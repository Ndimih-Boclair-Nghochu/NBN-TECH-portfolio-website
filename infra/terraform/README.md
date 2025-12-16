# Terraform infra for portfolio_template

What this creates:
- S3 bucket (private) + CloudFront distribution (default cert) for the static frontend
- RDS Postgres instance (single-AZ)
- EC2 instance (single t2.micro) for the backend with an IAM role that permits S3 read/write
- Minimal `admin/config.js` S3 object pointing the admin UI at the backend

Quick start
1. Install Terraform and configure your AWS credentials (e.g., `aws configure` or environment vars).
2. Edit `variables.tf` or pass variables on the command line. You must set a globally unique `s3_bucket_name` or leave blank to auto-generate.
3. Initialize, plan, and apply:

```bash
cd infra/terraform
terraform init
terraform plan -out plan.tfplan
terraform apply plan.tfplan
```

4. After apply completes:
- Upload the static site to the S3 bucket (replace `<bucket>`):

```bash
# from repo root
aws s3 sync . s3://<bucket> --exclude "server/*" --acl private
```

- The admin SPA will read `/admin/config.js` (created during apply) which sets `window.API_BASE` to the EC2 public DNS.

Notes & security
- RDS storage is set to 20 GB; free-tier eligibility varies by account and time — confirm your account's free tier.
- For production, use HTTPS, a managed load balancer, and proper certificate (ACM) attached to CloudFront.
- The EC2 `user_data` here installs Node and starts the server; replace with a systemd/PM2 service for robustness.

If you want, I can:
- Add a Terraform target to upload the entire static site automatically.
- Add an ELB + Route53 + ACM configuration.
- Replace the simple `user_data` start with a systemd unit and health checks.
