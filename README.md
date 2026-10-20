# Production DevSecOps Platform

A portfolio project demonstrating an end-to-end DevSecOps and GitOps workflow for a containerized web application: application development, CI checks, container vulnerability scanning, image publication, GitOps promotion, Kubernetes deployment, and runtime observability.

> **Current status:** The project was deployed to AWS EKS and the deployment/monitoring evidence was captured. The AWS infrastructure has since been torn down to avoid ongoing cloud costs. The repository contains the configuration and source needed to reproduce the environment; live AWS endpoints should not be expected to work until it is redeployed.

## Architecture at a glance

![Platform repository architecture](docs/platform-architecture.svg)

The full cross-repository flow is documented in [End-to-end architecture](docs/end-to-end-architecture.md).

## What this project demonstrates

- **Web application:** React + Vite frontend and Node.js/Express backend.
- **Application services:** MongoDB for persistence and Redis for cache/session-style data; Docker Compose for local development.
- **CI:** Jenkins pipeline with backend tests and linting, frontend lint/build, npm audit report generation, Docker image builds, and Trivy vulnerability scans.
- **Image delivery:** On the `main` branch, the pipeline authenticates to Amazon ECR, publishes backend/frontend images using the commit-derived tag and Jenkins build number, and updates the GitOps repository.
- **GitOps deployment:** A separate repository stores the Argo CD Application and Helm chart configuration. Argo CD reconciles that Git state into EKS.
- **Infrastructure as code:** Terraform provisions a VPC, public/private subnets across two Availability Zones, NAT networking, EKS, a managed node group, IAM roles/policies, and ECR repositories. A separate Terraform root installs the AWS Load Balancer Controller into an existing cluster.
- **Observability:** Prometheus and Grafana were installed into a dedicated `monitoring` namespace to inspect cluster, node, namespace, and pod metrics. This monitoring release was installed separately from the application GitOps chart.

## Technology stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express, Mongoose, JWT, bcryptjs, Redis client |
| Data services | MongoDB 7, Redis 7 Alpine |
| Local containers | Docker, Docker Compose, Nginx |
| CI and reporting | Jenkins, Jest, Supertest, ESLint, Oxlint, npm audit |
| Image security | Trivy image vulnerability scanning |
| Registry | Amazon ECR |
| Cloud and IaC | AWS, Terraform, Amazon EKS, VPC, IAM, EBS CSI, AWS Load Balancer Controller |
| Deployment | Helm, Argo CD, Kubernetes |
| Monitoring | Prometheus, Grafana, node-exporter, kube-state-metrics, Alertmanager (via kube-prometheus-stack) |

The current Jenkinsfile does **not** implement SonarQube or OWASP Dependency-Check stages. Dependency review is performed using `npm audit`, and container image scanning is performed using Trivy.

## Repository layout

```text
.
├── backend/                 # Express API, models, routes, middleware, tests
├── frontend/                # React/Vite application and Nginx container config
├── helm/                    # Application Helm chart used by the platform repo
├── jenkins/                 # Custom Jenkins agent image definition
├── terraform/
│   ├── envs/dev/             # VPC, EKS, ECR, and related cloud resources
│   ├── envs/addons/          # AWS Load Balancer Controller Helm release
│   └── modules/              # Reusable EKS and network modules
├── scripts/                 # Kubernetes secret helper
├── docs/                    # Architecture, implementation notes, evidence
├── docker-compose.yml       # Local application stack
└── Jenkinsfile              # CI, scan, publish, GitOps update, report stages
```

## End-to-end CI/CD flow

1. A developer pushes a code change to the application repository on GitHub.
2. Jenkins checks out the source and derives an image tag from the commit SHA.
3. Backend dependencies are installed; Jest tests and ESLint run.
4. Frontend dependencies are installed; Oxlint and the Vite production build run.
5. `npm audit` reports are generated for backend and frontend dependencies.
6. Docker images are built and Trivy scans the backend and frontend images for vulnerabilities.
7. For `main`, Jenkins verifies the AWS account, authenticates to ECR, and pushes images tagged with the commit-derived tag and build number.
8. Jenkins updates `apps/production-devsecops-platform/values-ecr.yaml` in the GitOps repository, validates the image values, commits the change, and pushes it using the configured Jenkins credential.
9. Argo CD detects the GitOps change and reconciles the Helm chart into the `production-devsecops` namespace in EKS.
10. The frontend is exposed through an ALB Ingress when the AWS Load Balancer Controller and ingress configuration are enabled. Backend, MongoDB, and Redis communicate through Kubernetes Services.
11. Prometheus/Grafana monitoring can be installed separately to inspect EKS and workload metrics.

The Jenkinsfile contains no explicit GitHub webhook trigger declaration. The exact build trigger (manual, webhook, or Jenkins job configuration) depends on the Jenkins job configuration outside this repository. The `JENKINS_REPORT_URL` parameter in the supplied Jenkinsfile was configured for the previous deployment; because that AWS endpoint was torn down, set this parameter to blank to skip reporting or replace it with the new backend report endpoint after redeployment.

## Run locally with Docker Compose

### Prerequisites

- Git
- Docker Engine or Docker Desktop with Compose
- Node.js/npm are useful for running individual app checks outside containers

### Start the stack

```bash
git clone https://github.com/devniranjanbadgujar/production-devsecops-platform.git
cd production-devsecops-platform
cp backend/.env.example backend/.env
```

Edit `backend/.env` and replace `JWT_SECRET` with a long, random value. The Compose file overrides the database and Redis URLs for container-to-container networking.

```bash
docker compose up --build -d
docker compose ps
```

Local endpoints (as configured in `docker-compose.yml`):

- Frontend: http://localhost:3000
- Backend health endpoint: http://localhost:8081/api/health
- MongoDB: `127.0.0.1:27017`
- Redis: `127.0.0.1:6379`

The database and Redis ports are bound to loopback in Compose, not all network interfaces.

```bash
# Follow service logs
docker compose logs -f backend frontend

# Stop the local stack; retain named data volumes
docker compose down

# Optional: remove local database/cache volumes too (destructive)
# docker compose down -v
```

## Run backend checks locally

```bash
cd backend
npm ci
npm test
npm run lint
```

For the frontend:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

## Terraform: reproduce the AWS environment

> **Cost and security warning:** AWS resources can incur charges, especially EKS worker nodes, NAT Gateway, load balancers, EBS volumes, and public IPv4 addresses. The current environment has been torn down. These commands are instructions for a deliberate future redeployment, not a requirement to read or use the repository.

Prerequisites: AWS CLI configured with a least-privilege identity, Terraform `>= 1.5`, and an approved AWS region/account. Set `admin_cidr` to a trusted public IP with `/32`; never expose the Kubernetes API to `0.0.0.0/0` for convenience.

```bash
cd terraform/envs/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and set admin_cidr to YOUR_TRUSTED_PUBLIC_IP/32
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan
# Only after reviewing the complete plan and expected costs:
# terraform apply
```

The dev Terraform root uses local state unless configured otherwise. Protect and back up state securely; never commit `.tfstate`, saved plans, `.terraform/`, or real `terraform.tfvars` files. The example file is safe to publish and contains a documentation-only CIDR placeholder.

The add-ons root requires an already-running EKS cluster and its Terraform outputs. See [`terraform/envs/addons/README.md`](terraform/envs/addons/README.md). Do not run the add-ons root before the cluster exists and is reachable.

## Evidence and portfolio presentation

Screenshots captured during the completed deployment can be added under `docs/screenshots/` and referenced from this README. Useful evidence includes:

- Jenkins successful pipeline and stage view
- Trivy scan results / archived report summary
- ECR image tags (avoid exposing credentials)
- Argo CD application state showing `Synced` and `Healthy`
- EKS nodes and application pods
- Grafana cluster CPU/memory and namespace/pod resource dashboards
- The frontend application and backend health response

Screenshots are point-in-time evidence; do not describe the AWS environment as currently running after teardown.

## Security notes

- Never commit `.env`, real JWT values, Jenkins tokens, AWS credentials, private keys, Kubernetes Secret manifests containing literal credentials, Terraform state, or saved plans.
- Use Jenkins Credentials for the GitOps repository token and Jenkins report token.
- Create Kubernetes secrets with `scripts/create-k8s-secrets.sh`; do not put the JWT secret in Helm values or Git.
- Restrict EKS API access through `admin_cidr` and use least-privilege IAM.
- Review Trivy and npm audit results; the pipeline generates reports, but `npm audit` is configured to preserve pipeline flow even when the audit command returns a non-zero status. Treat report review as a release decision, not proof that dependencies are vulnerability-free.

## Related repository

- [Production DevSecOps GitOps](https://github.com/devniranjanbadgujar/production-devsecops-gitops) — Argo CD Application, Helm chart, image values, and ingress configuration.

## License

No root-level license file is included in the provided source archive. Add a license before inviting reuse or redistribution.
