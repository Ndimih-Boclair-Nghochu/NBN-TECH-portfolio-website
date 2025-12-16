output "s3_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "ec2_public_ip" {
  value = aws_instance.app.public_ip
}

output "ec2_ssh_command" {
  value = var.key_name != "" ? "ssh -i <path-to-${var.key_name}.pem> ec2-user@${aws_instance.app.public_dns}" : "(no key pair configured)"
}
