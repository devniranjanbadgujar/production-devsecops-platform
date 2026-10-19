# EKS Add-ons

This Terraform root installs the AWS Load Balancer Controller into an
**existing** EKS cluster. It is separate from `../dev` because the Helm
provider requires a reachable cluster.

## Workflow

1. Initialize and validate `../dev`.
2. Provision the dev infrastructure only when explicitly approved.
3. Run `./configure-from-dev.sh` to generate local `terraform.tfvars`
   from the dev root's Terraform outputs.
4. Initialize and validate this root.
5. Review a plan before applying add-ons; do not apply until explicitly approved.

The configure script requires an existing dev Terraform state with outputs
`aws_region`, `cluster_name`, and `vpc_id`. It does not create AWS resources.

The AWS Load Balancer Controller IAM role and policy must already exist.
The cluster must be reachable from the machine running Terraform, and the
AWS identity must have permission to access EKS and install Helm releases.

The application Ingress remains disabled by default in the application chart.
