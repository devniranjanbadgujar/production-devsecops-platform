#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${1:-production-devsecops}"
SECRET_NAME="production-devsecops-secrets"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl is required." >&2
  exit 1
fi

read -r -s -p "Enter JWT_SECRET: " JWT_SECRET
echo

if [[ -z "$JWT_SECRET" ]]; then
  echo "ERROR: JWT_SECRET cannot be empty." >&2
  exit 1
fi

umask 077
SECRET_FILE="$(mktemp)"
trap 'rm -f "$SECRET_FILE"; unset JWT_SECRET' EXIT
printf '%s' "$JWT_SECRET" > "$SECRET_FILE"
unset JWT_SECRET

kubectl create namespace "$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic "$SECRET_NAME" \
  --namespace "$NAMESPACE" \
  --from-file=JWT_SECRET="$SECRET_FILE" \
  --dry-run=client -o yaml | kubectl apply -f -
echo "Kubernetes application secret configured in namespace: $NAMESPACE"
