# Enterprise E-commerce DevSecOps Pipeline
# Enterprise E-commerce DevSecOps Pipeline — Complete Security Integration

A production-ready e-commerce API with a comprehensive DevSecOps pipeline integrating SAST, SCA, container scanning, and IaC scanning.

## Architecture

```
                                    ┌──────────────────────┐
                                    │    GitHub Actions     │
                                    │    CI/CD Pipeline     │
                                    └──────────┬───────────┘
                                               │
            ┌──────────────────────────────────┼──────────────────────────────────┐
            │                                  │                                  │
            ▼                                  ▼                                  ▼
    ┌───────────────┐                  ┌───────────────┐                  ┌───────────────┐
    │    SAST       │                  │     SCA       │                  │  Container    │
    │  SonarCloud   │                  │  npm audit    │                  │   Security    │
    │  Quality Gate │                  │  Trivy FS     │                  │  Trivy Image  │
    └───────────────┘                  └───────────────┘                  └───────────────┘
                                               │                                  │
                                               ▼                                  ▼
                                    ┌──────────────────────────────────────────────────┐
                                    │              IaC Security (Week 3)               │
                                    │                                                   │
                                    │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
                                    │  │  Terraform  │  │   Checkov   │  │  Secure   │ │
                                    │  │ Init/Plan   │  │  IaC Scan   │  │  Infra    │ │
                                    │  └─────────────┘  └─────────────┘  └───────────┘ │
                                    └──────────────────────────────────────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │    AWS Cloud         │
                                    │  ┌────────────────┐  │
                                    │  │     VPC        │  │
                                    │  │  ┌──────────┐  │  │
                                    │  │  │ Public   │  │  │
                                    │  │  │ Subnets  │  │  │
                                    │  │  │  + ALB   │  │  │
                                    │  │  └──────────┘  │  │
                                    │  │  ┌──────────┐  │  │
                                    │  │  │ Private  │  │  │
                                    │  │  │ Subnets  │  │  │
                                    │  │  │ + EC2    │  │  │
                                    │  │  └──────────┘  │  │
                                    │  │  ┌──────────┐  │  │
                                    │  │  │  S3 +    │  │  │
                                    │  │  │  KMS     │  │  │
                                    │  │  └──────────┘  │  │
                                    │  └────────────────┘  │
                                    └──────────────────────┘
```

## Project Structure

```
.
├── src/
│   ├── app.js                  -- Express application (routes, middleware, security headers)
│   ├── server.js               -- Entry point with graceful shutdown and error handlers
│   └── security-demos/         -- Isolated vulnerable code patterns for SonarCloud demos
├── tests/
│   └── app.test.js             -- Integration tests (Jest + Supertest)
├── infra/
│   ├── terraform/              -- Secure production-ready Terraform (Week 3)
│   │   ├── versions.tf         -- Terraform & provider version constraints
│   │   ├── provider.tf         -- AWS provider configuration with default tags
│   │   ├── variables.tf        -- Input variables with defaults
│   │   ├── outputs.tf          -- Output values for deployed resources
│   │   ├── networking.tf       -- VPC, subnets, IGW, NAT, route tables
│   │   ├── security.tf         -- Security groups with restricted access
│   │   ├── iam.tf              -- IAM roles, policies (least privilege)
│   │   ├── storage.tf          -- S3 buckets with encryption, versioning, logging
│   │   └── compute.tf          -- EC2, ALB, launch template, CloudWatch
│   └── terraform-insecure/     -- Deliberately insecure Terraform for Checkov demo
│       └── main.tf             -- Contains intentional misconfigurations
├── .github/workflows/
│   └── ci.yml                  -- CI pipeline (build, test, SAST, SCA, container, IaC)
├── Dockerfile                  -- Multi-stage secure Docker build
├── docker-compose.yml          -- Local development compose file
├── sonar-project.properties    -- SonarCloud/Scan configuration
└── package.json                -- Node.js dependencies and scripts
```

## Terraform Folder Structure

```
infra/terraform/
├── versions.tf         -- Required Terraform version (>= 1.5.0) and AWS provider (~> 5.0)
├── provider.tf         -- AWS provider with region, default_tags, and data sources
├── variables.tf        -- All configurable parameters with sensible defaults
├── outputs.tf          -- Exposed resource attributes (IDs, ARNs, DNS names)
├── networking.tf       -- VPC (10.0.0.0/16), public/private subnets, IGW, NAT, route tables
├── security.tf         -- ALB SG (HTTP/443 from internet), App SG (port 3000 from ALB, SSH from internal)
├── iam.tf              -- EC2 IAM role with least-privilege S3/CloudWatch/SSM policies
├── storage.tf          -- S3 buckets with KMS encryption, versioning, public access blocks, logging
└── compute.tf          -- EC2 (private subnet), ALB, launch template, CloudWatch logs
```

## Pipeline Layers

| Layer | Tool | Trigger |
|-------|------|---------|
| SAST | SonarCloud | CI (when SONAR_TOKEN set) |
| SCA | npm audit + Trivy | CI |
| Container Scan | Trivy | CI (after Docker build) |
| IaC Scan | Checkov | CI (after Terraform validate) |
| Infrastructure | Terraform | CI (validate, fmt, plan) |
| Dependency Audit | npm audit | CI (fail on high+) |

## Pipeline Stages (Week 3)

```
Checkout
    ↓
Install Dependencies (npm ci)
    ↓
Unit Tests (npm test)
    ↓
SonarQube / SonarCloud SAST Scan
    ↓
npm audit (fail on HIGH+)
    ↓
Docker Build (multi-stage)
    ↓
Trivy Filesystem Scan (CRITICAL/HIGH)
    ↓
Trivy Container Image Scan (CRITICAL/HIGH)
    ↓
Terraform Init
    ↓
Terraform Format Check
    ↓
Terraform Validate
    ↓
Checkov IaC Scan (secure infra - FAIL on HIGH)
    ↓
Checkov IaC Scan (insecure infra - soft_fail for demo)
    ↓
Upload Artifacts (coverage + pipeline report)
```

## Prerequisites

- Node.js >= 20
- Docker + Docker Compose v2
- Terraform >= 1.5.0
- Python 3.9+ (for Checkov)
- (Optional) SonarCloud account for SAST

## Terraform Workflow

```bash
# Initialize Terraform (download providers)
terraform init

# Format check (CI enforces this)
terraform fmt -check -recursive

# Validate configuration
terraform validate

# Preview infrastructure changes
terraform plan

# Apply (requires AWS credentials)
terraform apply -auto-approve

# Destroy (cleanup)
terraform destroy -auto-approve
```

## Checkov Installation

```bash
# Install via pip
pip install checkov

# Verify installation
checkov --version

# Scan a directory
checkov -d infra/terraform --framework terraform

# Scan with specific checks skipped
checkov -d infra/terraform-insecure --framework terraform --skip-check CKV_AWS_272

# Generate SARIF output
checkov -d infra/terraform --framework terraform -o sarif > checkov-report.sarif
```

## How to Run (Local Development)

```bash
# Install Node.js dependencies
npm install

# Run tests with coverage
npm test

# Start server locally
npm start

# Build Docker image
docker build -t ecommerce-app:local .

# Run with Docker Compose
docker compose up --build -d

# Verify health
curl http://localhost:3000/health

# Stop services
docker compose down
```

## How to Run Terraform

```bash
# Navigate to terraform directory
cd infra/terraform

# Initialize
terraform init

# Format check
terraform fmt -check

# Validate
terraform validate

# Plan
terraform plan

# Apply (requires AWS credentials configured)
terraform apply
```

## How to Fix Checkov Findings

Checkov runs with `soft_fail: false` on `infra/terraform/`, meaning any HIGH severity finding will fail the CI pipeline. Below are common Checkov checks and their fixes:

| Checkov Check | Finding | Fix |
|--------------|---------|-----|
| CKV_AWS_5 | Security group allows SSH from 0.0.0.0/0 | Restrict SSH to internal CIDR only |
| CKV_AWS_19 | S3 bucket missing SSE encryption | Enable `aws_s3_bucket_server_side_encryption_configuration` with KMS |
| CKV_AWS_20 | S3 bucket ACL allows public read | Remove ACL, enable `aws_s3_bucket_public_access_block` |
| CKV_AWS_21 | S3 bucket missing versioning | Enable `aws_s3_bucket_versioning` |
| CKV_AWS_53 | S3 bucket missing block public ACLs | Set `block_public_acls = true` |
| CKV_AWS_54 | S3 bucket missing block public policy | Set `block_public_policy = true` |
| CKV_AWS_55 | S3 bucket missing ignore public ACLs | Set `ignore_public_acls = true` |
| CKV_AWS_56 | S3 bucket missing restrict public buckets | Set `restrict_public_buckets = true` |
| CKV_AWS_115 | EC2 instance lacks IAM instance profile | Attach least-privilege IAM role |
| CKV_AWS_135 | EC2 instance has public IP | Launch in private subnet, use ALB |
| CKV_AWS_158 | CloudWatch log group missing KMS key | Add `kms_key_id` to log group |
| CKV_AWS_272 | VPC flow logs not enabled | Add `aws_flow_log` resource |
| CKV2_AWS_11 | VPC flow logs not enabled for all ENIs | Enable VPC Flow Logs to CloudWatch |
| CKV_AWS_126 | Resource missing tags | Apply `default_tags` in provider or explicit tags |
| CKV_AWS_173 | Lambda/IAM policy has wildcard action | Scope actions to specific operations |
| CKV_AWS_111 | IAM policy allows full `*` resource | Restrict resource ARN to specific bucket/queue |

## Security Best Practices

- **No hardcoded credentials** - All secrets via GitHub Secrets and Terraform variables
- **Environment variables** - Config via `TF_VAR_*` or `.env`
- **GitHub Secrets** - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SONAR_TOKEN`, etc.
- **Never expose AWS keys** - `.gitignore` excludes `.env`, `.terraform/`, `*.tfstate*`
- **Terraform variables** - All configurable values in `variables.tf` with sensible defaults

## Insecure Terraform (Learning)

The `infra/terraform-insecure/` directory contains deliberately insecure Terraform code for learning purposes. It includes:

- Security Group allowing SSH from `0.0.0.0/0`
- EC2 instance with public IP (in public subnet)
- S3 bucket with `public-read` ACL
- S3 bucket lacking versioning, encryption, and logging
- IAM role with `AdministratorAccess` policy
- Missing tags on resources
- Missing VPC Flow Logs

Run Checkov against it to see what a secure pipeline catches:

```bash
checkov -d infra/terraform-insecure --framework terraform
```

## Security Compliance

- **OWASP Top 10 mitigations**: XSS, SQLi, sensitive data exposure
- **Docker security**: non-root user, healthcheck, multi-stage build, no npm in runtime
- **Node.js security**: strict CSP, HSTS, input validation, body size limits
- **Terraform security**: KMS encryption, S3 public access blocks, IAM least privilege, VPC isolation, restricted SSH
- **IaC security**: Checkov scanning with fail-on-HIGH policy, secure-by-default configuration
- **Dependency security**: transitive dependency overrides via npm overrides

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm test` fails | Ensure Node.js >= 20, run `npm install` first |
| Docker build fails | Check `.dockerignore` doesn't exclude `package*.json` |
| `terraform init` fails | Check network connectivity, verify provider version |
| `terraform validate` fails | Run `terraform fmt` to fix formatting issues |
| `checkov` not found | Install via `pip install checkov` or use venv |
| Checkov scan fails pipeline | Review findings, fix HIGH severity misconfigurations |
| Trivy scan fails | Review report for CRITICAL/HIGH findings, update base image |
| SonarCloud not running | Verify `SONAR_TOKEN` is set in GitHub secrets |
| AWS credentials error | Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub secrets |
| `terraform plan` fails | Verify provider is initialized with `terraform init` |

## Common Checkov Fixes

```hcl
# ❌ INSECURE: SSH from anywhere
resource "aws_security_group_rule" "ssh" {
  cidr_blocks = ["0.0.0.0/0"]
}

# ✅ SECURE: SSH from internal network only
resource "aws_security_group_rule" "ssh" {
  cidr_blocks = ["10.0.0.0/8"]
}
```

```hcl
# ❌ INSECURE: Unencrypted S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
}

# ✅ SECURE: Encrypted, versioned, logged S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
}
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`/`master`:

1. **Checkout** with full git history (required for SonarCloud)
2. **Setup Node.js 20** with npm caching
3. **`npm ci`** -- deterministic dependency install
4. **`npm test`** -- unit tests with coverage
5. **SonarCloud scan** -- SAST quality gate (conditional on `SONAR_TOKEN`)
6. **`npm audit --audit-level=high`** -- fail on critical/high vulnerabilities
7. **Docker build** -- multi-stage secure build
8. **Trivy filesystem scan** -- CRITICAL/HIGH severity
9. **Trivy container image scan** -- CRITICAL/HIGH severity
10. **Terraform init** -- initialize providers
11. **Terraform format check** -- enforce code formatting
12. **Terraform validate** -- validate configuration
13. **Checkov IaC scan (secure)** -- fail on HIGH misconfigurations
14. **Checkov IaC scan (insecure)** -- soft_fail for demo visibility
15. **Upload artifacts** -- coverage report and pipeline summary

## SonarQube / SonarCloud

Configure these GitHub secrets to enable SAST:

- `SONAR_TOKEN` -- Authentication token (required)
- `SONAR_PROJECT_KEY` -- Sonar project key
- `SONAR_ORGANIZATION` -- SonarCloud organization
- `SONAR_HOST_URL` -- Server URL (defaults to https://sonarcloud.io)

The pipeline waits for the quality gate and fails if not green.
