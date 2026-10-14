terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
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
  node_instance_types          = ["t3.medium"]
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
