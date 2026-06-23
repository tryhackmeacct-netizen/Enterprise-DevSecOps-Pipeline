/**
 * SECURITY DEMO: SQL Injection (SQLi)
 * 
 * Directory: src/security-demos/sql_injection.js
 * Status: Isolated from live application path
 */

// ==========================================
// 1. VULNERABLE CODE (BEFORE)
// ==========================================
function getUserProfileVulnerable(db, userId) {
  // DANGER: Direct string concatenation of untrusted input into a SQL query.
  // An attacker could pass a payload like: " ' OR '1'='1 " to bypass authentication
  // or " '; DROP TABLE users; -- " to delete the database.
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";
  
  return db.query(query);
}

// ==========================================
// 2. SONARCLOUD RULE TRIPPED
// ==========================================
/*
 * Rule ID: javascript:S3649 (Database queries should not be vulnerable to SQL injection)
 * Severity: Critical / Blocker
 * 
 * Why it trips:
 * SonarCloud tracks data flow (taint analysis) from sources (user input, HTTP headers/parameters)
 * to sinks (database execution APIs). It alerts when a dynamic query is compiled from untrusted strings
 * without being sanitized or parameterized, indicating a major security vulnerability.
 */

// ==========================================
// 3. SECURE REWRITE (AFTER)
// ==========================================
function getUserProfileSecure(db, userId) {
  // SECURE: Use parameterized queries (prepared statements).
  // The database engine compiles the query template first, and treats the user parameter
  // strictly as data, not executable SQL command code.
  const query = "SELECT * FROM users WHERE id = ?";
  
  return db.query(query, [userId]);
}

// ==========================================
// 4. REMEDIATION PRINCIPLE
// ==========================================
/*
 * Principle: Input Parameterization / Separation of Code and Data.
 * 
 * Always use prepared statements or ORM queries that parameterize input values.
 * Never build SQL query strings using raw string concatenation or interpolation with user-supplied inputs.
 */

module.exports = {
  getUserProfileVulnerable,
  getUserProfileSecure
};
