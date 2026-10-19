terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "network" {
  source = "../../modules/network"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = "10.20.0.0/16"
}

module "eks" {
  source = "../../modules/eks"

  project_name                 = var.project_name
  cluster_name                 = var.cluster_name
  private_subnet_ids           = module.network.private_subnet_ids
  public_subnet_ids            = module.network.public_subnet_ids
  kubernetes_version           = "1.36"
  endpoint_public_access_cidrs = [var.admin_cidr]
  node_instance_types          = ["m7i-flex.large"]
  node_desired_size            = 2
  node_min_size                = 1
  node_max_size                = 3
}

output "vpc_id" {
  value = module.network.vpc_id
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "node_group_name" {
  value = module.eks.node_group_name
}

# Amazon ECR repositories for application images.
locals {
  ecr_repositories = {
    backend  = "${var.project_name}-backend"
    frontend = "${var.project_name}-frontend"
  }
}

resource "aws_ecr_repository" "app" {
  for_each = local.ecr_repositories

  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = each.value
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each = aws_ecr_repository.app

  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Retain the 20 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = {
        type = "expire"
      }
    }]
  })
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for backend and frontend images"
  value = {
    for name, repository in aws_ecr_repository.app :
    name => repository.repository_url
  }
}


output "ebs_csi_role_arn" {
  description = "IAM role ARN for the EBS CSI Driver"
  value       = module.eks.ebs_csi_role_arn
}

output "load_balancer_controller_role_arn" {
  description = "IAM role ARN for the AWS Load Balancer Controller"
  value       = module.eks.load_balancer_controller_role_arn
}


output "aws_region" {
  description = "AWS region used by the dev infrastructure"
  value       = var.aws_region
}


output "eks_admin_role_arn" {
  description = "IAM role ARN for EKS administrator access"
  value       = module.eks.eks_admin_role_arn
}
