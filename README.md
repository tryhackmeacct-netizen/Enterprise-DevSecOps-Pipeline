# Enterprise E-commerce DevSecOps Pipeline — Week 1

This repository implements Week 1 deliverables: secure containerization and SAST integration (SonarQube/SonarCloud) for a sample e-commerce Node.js app.

**Contents**
- `src/` — application source
- `tests/` — unit/integration tests (Jest + Supertest)
- `Dockerfile` — multi-stage, hardened image
- `.github/workflows/ci.yml` — CI pipeline (build, test, SAST)
- `sonar-project.properties` — Sonar scanner configuration (placeholders)

## Week 1 Architecture

- Application: Node.js Express app serving a small in-memory catalog and checkout flow.
- Containerization: Multi-stage Dockerfile producing a minimal runtime image and running as non-root.
- CI: GitHub Actions pipeline executes tests, builds image, runs npm audit, and conditionally performs Sonar SAST scan with Quality Gate enforcement.
