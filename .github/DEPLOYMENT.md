Automatic deploy instructions

This repo includes a GitHub Actions workflow that deploys the frontend to S3 and invalidates CloudFront on every push to `main`.

Required repository secrets (set these in Settings → Secrets → Actions):

- `AWS_ACCESS_KEY_ID` — AWS key with S3 and CloudFront permissions
- `AWS_SECRET_ACCESS_KEY` — AWS secret
- `SSH_HOST` (optional) — EC2 hostname or IP for backend deployment
- `SSH_USER` (optional) — ssh user name (e.g., `ec2-user`)
- `SSH_PRIVATE_KEY` (optional) — private key (PEM) for SSH deploy; when present the workflow will attempt backend deploy
- `SSH_PORT` (optional) — ssh port, default 22
- `BACKEND_DIR` (optional) — path to backend on remote host; default `/home/ec2-user/server/server`

Configuration notes

- The workflow uses the following defaults (change by editing `.github/workflows/deploy.yml`):
  - S3 bucket: `nbntech-frontend`
  - CloudFront distribution ID: `E1P3KA7L8DP9Z1`
  - AWS region: `us-east-1`

- The backend step is conditional: it runs only when both `SSH_HOST` and `SSH_PRIVATE_KEY` are defined as secrets.

- The workflow performs a best-effort smoke test after both frontend and backend deployments.

Security

- Keep your secrets in the GitHub repository or organization secrets, do not commit credentials into the repository.

Troubleshooting

- If the CloudFront invalidation does not appear to propagate quickly, you can query invalidations using `aws cloudfront list-invalidations --distribution-id <id>`.
- If the backend step fails, check the Actions log and the EC2 system logs for details.
