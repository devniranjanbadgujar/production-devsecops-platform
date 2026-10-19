#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEV_DIR="$ROOT/terraform/envs/dev"
ADDONS_DIR="$ROOT/terraform/envs/addons"

for output in aws_region cluster_name vpc_id; do
  terraform -chdir="$DEV_DIR" output -raw "$output" >/dev/null
done

region="$(terraform -chdir="$DEV_DIR" output -raw aws_region)"
cluster="$(terraform -chdir="$DEV_DIR" output -raw cluster_name)"
vpc="$(terraform -chdir="$DEV_DIR" output -raw vpc_id)"

cat > "$ADDONS_DIR/terraform.tfvars" <<EOF
aws_region  = "$region"
cluster_name = "$cluster"
vpc_id       = "$vpc"
EOF

echo "Generated terraform/envs/addons/terraform.tfvars from dev Terraform outputs."
echo "No AWS resources were created."
