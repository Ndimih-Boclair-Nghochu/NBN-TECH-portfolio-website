variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name for resources"
  type        = string
  default     = "portfolio"
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH to EC2 (set to your IP for safety)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "instance_type" {
  description = "EC2 instance type (use t2.micro for free tier)"
  type        = string
  default     = "t2.micro"
}

variable "db_instance_class" {
  description = "RDS instance class (choose free-tier eligible like db.t2.micro where available)"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "portfolio"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "portfolio"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for frontend (must be globally unique)"
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Name of an existing EC2 key pair to allow SSH (leave empty to skip)"
  type        = string
  default     = ""
}
