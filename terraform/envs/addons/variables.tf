variable "aws_region" {
  description = "AWS region containing the EKS cluster"
  type        = string
  default     = "ap-south-1"
}

variable "cluster_name" {
  description = "Existing EKS cluster name"
  type        = string
  default     = "devsecops-platform"
}

variable "vpc_id" {
  description = "VPC ID of the existing EKS cluster"
  type        = string
}
