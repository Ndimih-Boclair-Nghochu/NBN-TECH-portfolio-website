terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
    random = { source = "hashicorp/random" }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

provider "random" {}

# default VPC & subnets
data "aws_vpc" "default" {
  default = true
}

data "aws_subnet_ids" "default" {
  vpc_id = data.aws_vpc.default.id
}

# S3 bucket for static site
resource "aws_s3_bucket" "site" {
  bucket = var.s3_bucket_name != "" ? var.s3_bucket_name : "${var.project_name}-${random_id.bucket_id.hex}"
  acl    = "private"
  force_destroy = true
}

resource "random_id" "bucket_id" {
  byte_length = 4
}

# CloudFront OAI to serve private bucket
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for ${var.project_name} site"
}

resource "aws_s3_bucket_policy" "site_policy" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_policy.json
}

data "aws_iam_policy_document" "site_policy" {
  statement {
    actions = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]
    principals {
      type = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.oai.iam_arn]
    }
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id   = "s3-${aws_s3_bucket.site.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} static site CDN"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${aws_s3_bucket.site.id}"
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100"
  restrictions { geo_restriction { restriction_type = "none" } }

  viewer_certificate { cloudfront_default_certificate = true }
}

# RDS subnet group
resource "aws_db_subnet_group" "default" {
  name       = "${var.project_name}-db-subnet"
  subnet_ids = data.aws_subnet_ids.default.ids
  depends_on = [data.aws_subnet_ids.default]
}

# Security groups
resource "aws_security_group" "ec2_sg" {
  name        = "${var.project_name}-ec2-sg"
  description = "Allow SSH and app traffic"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Allow DB traffic from EC2"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id]
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

# RDS Postgres
resource "random_password" "db_pass" {
  length  = 16
  special = true
}

resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-db"
  engine = "postgres"
  engine_version = "13.9"
  instance_class = var.db_instance_class
  allocated_storage = 20
  name = var.db_name
  username = var.db_username
  password = random_password.db_pass.result
  db_subnet_group_name = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot = true
  publicly_accessible = false
  multi_az = false
}

# IAM Role for EC2 to access S3
resource "aws_iam_role" "ec2_role" {
  name = "${var.project_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

data "aws_iam_policy_document" "ec2_assume_role" {
  statement { actions = ["sts:AssumeRole"] principals { type = "Service" identifiers = ["ec2.amazonaws.com"] } }
}

resource "aws_iam_policy" "s3_policy" {
  name = "${var.project_name}-s3-policy"
  policy = data.aws_iam_policy_document.s3_policy.json
}

data "aws_iam_policy_document" "s3_policy" {
  statement {
    actions = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.site.arn, "${aws_s3_bucket.site.arn}/*"]
  }
}

resource "aws_iam_role_policy_attachment" "attach_s3" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.s3_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-instance-profile"
  role = aws_iam_role.ec2_role.name
}

# EC2 instance
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter { name = "name" values = ["amzn2-ami-hvm-*-x86_64-gp2"] }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true
  key_name = var.key_name != "" ? var.key_name : null

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    db_host = aws_db_instance.postgres.address,
    db_name = var.db_name,
    db_user = var.db_username,
    db_pass = random_password.db_pass.result,
    bucket  = aws_s3_bucket.site.id
  })

  tags = { Name = "${var.project_name}-app" }
}

# Upload minimal admin config file to S3 so the SPA knows API base
resource "aws_s3_bucket_object" "admin_config" {
  bucket = aws_s3_bucket.site.id
  key    = "admin/config.js"
  content = "window.API_BASE = 'http://${aws_instance.app.public_dns}:3000';"
  content_type = "application/javascript"
  depends_on = [aws_instance.app]
}

*** End Patch