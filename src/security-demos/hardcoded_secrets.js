/**
 * SECURITY DEMO: Hardcoded Secrets
 * 
 * Directory: src/security-demos/hardcoded_secrets.js
 * Status: Isolated from live application path
 */

// ==========================================
// 1. VULNERABLE CODE (BEFORE)
// ==========================================
function connectToExternalPaymentAPIVulnerable() {
  // REMEDIATED: Do not hardcode secrets. Retrieve from environment instead.
  const apiSecretKey = process.env.PAYMENT_API_SECRET_KEY;
  if (!apiSecretKey) {
    throw new Error('Missing environment variable: PAYMENT_API_SECRET_KEY');
  }
  return mockConnect(apiSecretKey);
}

// ==========================================
// 2. SONARCLOUD RULE TRIPPED
// ==========================================
/*
 * Rule ID: javascript:S2068 (Credentials should not be hard-coded)
 * Severity: Critical / Blocker
 * 
 * Why it trips:
 * SonarCloud scans source code files using regex and entropy detection patterns to identify strings
 * that look like passwords, API keys, private keys, or credentials. Hardcoded credentials are 
 * flagged because they violate confidentiality and complicate credential rotation.
 */

// ==========================================
// 3. SECURE REWRITE (AFTER)
// ==========================================
function connectToExternalPaymentAPISecure() {
  // SECURE: Retrieve the credential at runtime from environment variables.
  // The environment variable can be injected by a secure secret store (e.g. AWS Secrets Manager,
  // HashiCorp Vault, or GitHub Repository Secrets in CI/CD).
  const apiSecretKey = process.env.PAYMENT_API_SECRET_KEY;
  
  if (!apiSecretKey) {
    throw new Error("Missing environment variable: PAYMENT_API_SECRET_KEY");
  }

  return mockConnect(apiSecretKey);
}

// ==========================================
// 4. REMEDIATION PRINCIPLE
// ==========================================
/*
 * Principle: Configuration and Secret Externalization.
 * 
 * Never hardcode cryptographic keys, database passwords, or API secrets in source files.
 * Store secrets in secure config stores, load them dynamically from process environment variables,
 * and define templates (such as `.env.example`) to document necessary keys without values.
 */

function mockConnect(key) {
  return `Connected with key: ${key.substring(0, 7)}...`;
}

module.exports = {
  connectToExternalPaymentAPIVulnerable,
  connectToExternalPaymentAPISecure
};
