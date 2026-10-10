@'
# Architecture

## Project Goal

Build a production-grade DevSecOps + GitOps platform for a MERN application using Docker, Jenkins, security scanning, Kubernetes, ArgoCD, and AWS EKS.

## Application Architecture

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB
- Cache: Redis
- Local runtime: Docker Compose

## DevSecOps Flow

1. Developer pushes code to GitHub.
2. Jenkins pulls the latest code.
3. Pipeline runs quality and security checks.
4. Docker images are built and pushed.
5. Kubernetes manifests are updated.
6. ArgoCD syncs changes to EKS.
7. Application runs on Kubernetes.
8. Prometheus and Grafana monitor the platform.

## Target Cloud Architecture

- AWS EKS for Kubernetes workloads
- IAM for access control
- Security groups for network access
- Jenkins controller for CI/CD
- ArgoCD for GitOps deployment
- Prometheus and Grafana for monitoring

## Day 1 Scope

Today we only create the clean repository foundation and documentation.

No AWS resources will be created today.
'@ | Set-Content docs\architecture.md