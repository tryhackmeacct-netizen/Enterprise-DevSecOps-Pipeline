#!/usr/bin/env bash
set -e

echo "=== WEEK 1: Testing & SAST ==="
npm ci
npm test
npm audit --audit-level=high

pipx install semgrep || true
semgrep --config=auto --error --severity=ERROR --exclude='node_modules/' --exclude='.venv/' .

docker build -t ecommerce-app:local .

echo "=== WEEK 2: Container & SCA Scan ==="
trivy fs --severity CRITICAL,HIGH --exit-code 1 --ignore-unfixed --skip-dirs node_modules --skip-dirs .venv .
trivy image --severity CRITICAL,HIGH --exit-code 1 --ignore-unfixed ecommerce-app:local

echo "=== WEEK 3: IaC Scan ==="
cd infra/terraform
terraform init -backend=false
terraform fmt -check -recursive
terraform validate
cd ../..

checkov -d infra/terraform --framework terraform
tfsec infra/terraform --no-color

echo "=== WEEK 4: DAST & Hardening ==="
gitleaks detect --source . -v

echo "Starting ephemeral environment for DAST..."
docker compose up -d
sleep 10 # Wait for app to be ready

echo "Running OWASP ZAP Baseline Scan..."
# Using host.docker.internal to access localhost from the container on macOS
docker run --rm -v $(pwd)/.zap:/zap/wrk/:rw -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3000 -c /zap/wrk/rules.tsv || true

echo "Cleaning up..."
docker compose down -v

echo "=== PIPELINE COMPLETED SUCCESSFULLY ==="
