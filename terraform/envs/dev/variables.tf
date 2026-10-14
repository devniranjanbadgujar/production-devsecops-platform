variable "aws_region" {
  description = "AWS region for the development environment"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name used in resource tags"
  type        = string
  default     = "production-devsecops"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "devsecops-platform"
}

variable "admin_cidr" {
  description = "Your trusted public IP in CIDR notation for EKS API access"
  type        = string
}
