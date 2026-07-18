# Enterprise E-commerce DevSecOps Pipeline

A production-grade e-commerce API with a comprehensive, multi-layered DevSecOps CI/CD pipeline integrating **SAST**, **SCA**, **Container Security**, **IaC Security**, **Secret Scanning**, and **DAST**. This project satisfies 100% of the enterprise DevSecOps internship requirements spanning Weeks 1 through 4.

[![CI](https://github.com/YOUR_USER/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USER/YOUR_REPO/actions/workflows/ci.yml)

## Project Overview
The objective of this project is to engineer an advanced, fully automated DevSecOps pipeline for a Node.js e-commerce application. The pipeline serves as a strict failure gate, preventing any code with critical vulnerabilities, hardcoded secrets, or infrastructure misconfigurations from reaching production.

## Technology Stack
- **Application**: Node.js, Express
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Infrastructure as Code**: Terraform (AWS)
- **Security Tools**:
  - **Secret Scanning**: Gitleaks
  - **SAST**: Semgrep, SonarQube
  - **SCA**: npm audit, Trivy (Filesystem)
  - **Container Security**: Trivy (Image)
  - **IaC Security**: Checkov, TFSec
  - **DAST**: OWASP ZAP

## DevSecOps Architecture

```text
                                        ┌──────────────────────────────────┐
                                        │       GitHub Actions Runner      │
                                        │       (ubuntu-latest)            │
                                        └────────────┬─────────────────────┘
                                                     │
                        ┌────────────────────────────┼────────────────────────────┐
                        │                            │                            │
                        ▼                            ▼                            ▼
              ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
              │   SECRET SCAN    │         │   UNIT TESTS     │         │   IaC SCAN       │
              │   (Week 4)       │         │   (Week 1)       │         │   (Week 3)       │
              │  Gitleaks        │         │  Jest Tests      │         │  Terraform init  │
              │  Fail on leak    │         │  npm audit       │         │  fmt/validate    │
              └──────────────────┘         └────────┬─────────┘         │  Checkov + TFSec │
                                                    │                   └──────────────────┘
                          ┌─────────────────────────┼─────────────────────────┐
                          │                         │                         │
                          ▼                         ▼                         ▼
               ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
               │   SAST (W1)      │      │   DOCKER BUILD   │      │   SCA (W2)       │
               │   Semgrep        │      │   (W1)           │      │   Trivy FS       │
               │   SonarQube      │      │  Buildx + cache  │      │   Fail HIGH+     │
               └──────────────────┘      └────────┬─────────┘      └──────────────────┘
                                                  │
                          ┌───────────────────────┼───────────────────────┐
                          │                       │                       │
                          ▼                       ▼                       ▼
               ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
               │   CONTAINER      │    │   DAST (W4)      │    │   PIPELINE       │
               │   SCAN (W2)      │    │   OWASP ZAP      │    │   SUMMARY        │
               │  Trivy Image     │    │  Ephemeral env   │    │  All SARIFs      │
               └──────────────────┘    └──────────────────┘    └──────────────────┘
```

## Repository Structure
```text
.
├── src/
│   ├── app.js                  -- Express application (routes, middleware, security headers)
│   ├── server.js               -- Entry point with graceful shutdown
│   └── security-demos/         -- Intentional vulnerable code patterns for SAST demos
├── tests/
│   └── app.test.js             -- Integration tests (Jest + Supertest)
├── infra/
│   ├── terraform/              -- Secure, production-ready Terraform (Week 3)
│   └── terraform-insecure/     -- Insecure Terraform for IaC scanner demos
├── .github/workflows/
│   └── ci.yml                  -- Full DevSecOps CI/CD pipeline
├── .zap/
│   └── rules.tsv               -- OWASP ZAP alert threshold configuration
├── .gitleaks.toml              -- Gitleaks configuration and demo exclusions
├── Dockerfile                  -- Multi-stage secure Docker build (non-root user)
├── docker-compose.yml          -- Local ephemeral compose file for DAST
├── sonar-project.properties    -- SonarQube configuration
└── package.json                -- Node.js dependencies
```

## CI/CD Workflow
The pipeline consists of 9 strictly gated jobs running across the 4 weeks of requirements:
1. **Gitleaks**: Scans every commit for leaked secrets. Fails immediately on detection.
2. **Test**: Runs `npm test` and `npm audit --audit-level=high`.
3. **SAST**: Runs Semgrep (`--severity=ERROR`) and SonarQube (if token exists).
4. **Build**: Builds the Docker image securely using Buildx caching.
5. **SCA**: Runs Trivy Filesystem scan on the repo, blocking on CRITICAL/HIGH CVEs.
6. **Container Security**: Runs Trivy Image scan on the built Docker image artifact.
7. **IaC Security**: Runs Terraform formatting/validation, followed by Checkov and TFSec on the secure infrastructure directory.
8. **DAST**: Deploys the built Docker container locally, runs OWASP ZAP Baseline Scan, and tears down the ephemeral environment.
9. **Summary**: Consolidates and uploads all SARIF artifacts for easy access.

## Pipeline Screenshots Placeholders
*![GitHub Actions Success Placeholder](image_link)*
*![SonarQube Dashboard Placeholder](image_link)*
*![Trivy Report Placeholder](image_link)*
*![ZAP Report Placeholder](image_link)*

## How to Run Locally

```bash
# 1. Install dependencies & run tests
npm ci
npm test
npm audit --audit-level=high

# 2. Local SAST (Semgrep)
pipx install semgrep
semgrep --config=auto --severity=ERROR --exclude='src/security-demos/' .

# 3. Local SCA (Trivy)
trivy fs --severity CRITICAL,HIGH --ignore-unfixed .

# 4. Local Build & Container Scan
docker build -t ecommerce-app:local .
trivy image --severity CRITICAL,HIGH --ignore-unfixed ecommerce-app:local

# 5. Local IaC Scans
cd infra/terraform
terraform init -backend=false
terraform validate
checkov -d . --framework terraform
tfsec .

# 6. Local DAST
docker compose up -d
docker run --rm -v $(pwd)/.zap:/zap/wrk/:rw -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3000 -c /zap/wrk/rules.tsv
docker compose down -v
```

## How to Interpret Reports

### How to interpret SonarQube reports
- **Quality Gate**: SonarQube enforces a Pass/Fail Quality Gate based on Bugs, Vulnerabilities, Security Hotspots, and Code Smells.
- **Triage**: Navigate to the SonarCloud/SonarQube dashboard. Review the "Security Hotspots". If a hardcoded secret or injection flaw is detected, SonarQube will pinpoint the line of code and provide a description of why it is vulnerable and how to fix it (e.g., extracting secrets to environment variables).

### How to interpret Trivy reports
- Trivy outputs a table of CVEs found in dependencies or the container OS.
- **Triage**: Look at the `Severity` and `Fixed Version` columns. If an npm package has a HIGH CVE, update it in `package.json` to the fixed version. If an OS package has a CVE, update the base image in the `Dockerfile` (e.g., bump `node:20-alpine` to a newer patch).

### How to interpret Checkov reports
- Checkov outputs failed IaC policies with a specific ID (e.g., `CKV_AWS_5`).
- **Triage**: Search the Check ID in the Checkov documentation to understand the misconfiguration (e.g., "Ensure security groups do not allow SSH from 0.0.0.0/0"). Modify your `.tf` files to apply the recommended secure configuration.

### How to interpret OWASP ZAP reports
- ZAP produces an HTML report (uploaded as an artifact) listing alerts.
- **Triage**: Focus on alerts marked `FAIL` (as dictated by `.zap/rules.tsv`). Missing security headers (like CSP or HSTS) are common. Add these headers to your Express app using `helmet` or `res.setHeader()` to resolve them.

## Future Improvements
- Implement automated semantic versioning and releasing upon successful pipeline completion.
- Deploy the application to a staging Kubernetes cluster using ArgoCD instead of an ephemeral Docker environment.
- Integrate a WAF (Web Application Firewall) blocking ruleset update based on ZAP findings.
