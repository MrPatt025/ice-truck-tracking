// security-audit.js
// Self-contained security audit for the monorepo (backend + nginx).
// Usage:
//   node security-audit.js
//   BASE_URL=http://localhost:5000 node security-audit.js

const { exec } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const DEFAULT_BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TIMEOUT_MS = Number(process.env.AUDIT_TIMEOUT_MS || 5000);
const MAX_PARALLEL = Number(process.env.AUDIT_MAX_PARALLEL || 10);

class SecurityAuditor {
  constructor(opts = {}) {
    this.baseUrl = opts.baseUrl || DEFAULT_BASE_URL;
    this.issues = [];
    this.recommendations = [];
    this.findings = [];
    this.env = {};
    this.monorepoRoot = path.resolve(__dirname);
    this.backendDir = path.join(this.monorepoRoot, 'backend');
    this.nginxDir = path.join(this.monorepoRoot, 'nginx');
  }

  async runFullAudit() {
    console.log('🔒 Starting security audit against:', this.baseUrl, '\n');
    await this.loadBackendEnv();

    await this.checkDependencies();
    await this.checkSecurityHeaders();
    await this.checkCORS();
    await this.checkRateLimiting();
    await this.checkInputRobustness();
    await this.checkAuthSurface();
    await this.checkErrorHandling();
    await this.checkSecretsAndPermissions();
    await this.checkSSL();
    await this.outputReport();
  }

  // ---------- helpers ----------
  async makeRequest(relPath, { method = 'GET', headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(relPath, this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(
        url,
        { method, headers, timeout: TIMEOUT_MS },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let parsed = data;
            try {
              parsed = JSON.parse(data);
            } catch (_) {}
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsed,
            });
          });
        },
      );
      req.on('timeout', () => {
        req.destroy(new Error(`Request timeout ${url.href}`));
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  readFileSafe(p) {
    try {
      return fs.readFileSync(p, 'utf8');
    } catch {
      return null;
    }
  }

  exists(p) {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }

  // ---------- checks ----------
  async loadBackendEnv() {
    const envPath = path.join(this.backendDir, '.env');
    const examplePath = path.join(this.monorepoRoot, '.env.example');
    const raw = this.readFileSafe(envPath) || '';
    const rawExample = this.readFileSafe(examplePath) || '';
    const parse = (txt) =>
      Object.fromEntries(
        txt
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map((l) => {
            const i = l.indexOf('=');
            return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null;
          })
          .filter(Boolean),
      );
    this.env = { ...parse(rawExample), ...parse(raw) };
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies (pnpm audit --json)...');
    const run = (cmd) =>
      new Promise((resolve) => {
        exec(
          cmd,
          { cwd: this.monorepoRoot, maxBuffer: 1024 * 1024 },
          (err, stdout) => {
            if (err && !stdout) return resolve(null);
            resolve(stdout || null);
          },
        );
      });

    // Prefer pnpm audit; fallback to npm audit
    const json =
      (await run('pnpm audit --json --audit-level=high')) ||
      (await run('npm audit --json'));
    if (!json) {
      this.recommendations.push(
        'Run dependency audit in CI (pnpm audit / Snyk) and fix high severity issues',
      );
      return;
    }

    try {
      const report = JSON.parse(json);
      const totals =
        report.metadata?.vulnerabilities ||
        report.totals || // older npm formats
        {};
      const { critical = 0, high = 0, moderate = 0, low = 0 } = totals;
      this.findings.push({
        area: 'deps',
        details: { critical, high, moderate, low },
      });
      if (critical || high) {
        this.issues.push(
          `Dependencies contain ${critical} critical / ${high} high vulnerabilities`,
        );
        this.recommendations.push(
          'Upgrade/patch vulnerable packages; pin versions; consider `pnpm audit fix`',
        );
      } else {
        console.log('  ✓ No high/critical vulnerabilities reported');
      }
    } catch {
      this.recommendations.push(
        'Could not parse audit JSON; ensure pnpm audit is available in environment',
      );
    }
  }

  async checkSecurityHeaders() {
    console.log('🛡️ Checking security headers...');
    const res = await this.safeGet('/api/v1/health');
    if (!res) return;

    const headers = normalizeHeaders(res.headers);

    // Always recommended
    const reqd = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
    };

    Object.entries(reqd).forEach(([k, v]) => {
      if (headers[k] !== v) {
        this.issues.push(
          `Missing/incorrect header: ${k} (got "${headers[k] || 'none'}")`,
        );
        this.recommendations.push(`Add header ${k}: ${v}`);
      }
    });

    // Hide framework
    if (headers['x-powered-by']) {
      this.issues.push(
        `Framework disclosure via X-Powered-By: ${headers['x-powered-by']}`,
      );
      this.recommendations.push(
        'Disable Express X-Powered-By header (`app.disable("x-powered-by")`)',
      );
    }

    // Content-Type correctness
    const ct = headers['content-type'] || '';
    if (!ct.includes('application/json')) {
      this.issues.push(
        `Unexpected Content-Type for JSON endpoint: ${ct || 'none'}`,
      );
      this.recommendations.push(
        'Ensure JSON endpoints respond with Content-Type: application/json; charset=utf-8',
      );
    }

    // HSTS/CSP: recommend in production over HTTPS
    const isLocalHttp = this.baseUrl.startsWith('http://localhost');
    if (!isLocalHttp) {
      if (!headers['strict-transport-security']) {
        this.recommendations.push(
          'Add HSTS (strict-transport-security) when serving over HTTPS',
        );
      }
      if (!headers['content-security-policy']) {
        this.recommendations.push(
          "Add CSP header to mitigate XSS (at least default-src 'self')",
        );
      }
    }
  }

  async checkCORS() {
    console.log('🌐 Checking CORS...');
    const allowed = this.env.CORS_ORIGIN || 'http://localhost:3000';
    const maliciousOrigin = 'http://malicious-site.example';

    const resAllowed = await this.safeGet('/api/v1/health', {
      headers: { Origin: allowed },
    });
    const resBad = await this.safeGet('/api/v1/health', {
      headers: { Origin: maliciousOrigin },
    });
    if (!resAllowed || !resBad) return;

    const good = normalizeHeaders(resAllowed.headers)[
      'access-control-allow-origin'
    ];
    const bad = normalizeHeaders(resBad.headers)['access-control-allow-origin'];

    if (!good) {
      this.issues.push('CORS missing for allowed origin');
      this.recommendations.push(`Set CORS to allow trusted origin: ${allowed}`);
    } else if (!(good === allowed || good === '*')) {
      this.issues.push(`CORS ACAO unexpected for allowed origin: ${good}`);
    }

    if (bad && bad !== 'null' && bad !== allowed && bad !== '*') {
      this.issues.push(`CORS might allow untrusted origin: ${bad}`);
      this.recommendations.push(
        'Restrict CORS to explicit trusted origins only',
      );
    }
  }

  async checkRateLimiting() {
    console.log('⚡ Checking rate limiting...');
    if (String(this.env.DISABLE_RATE_LIMIT).toLowerCase() === 'true') {
      this.findings.push({ area: 'rate-limit', details: { disabled: true } });
      this.recommendations.push(
        'Enable rate limiting in production (DISABLE_RATE_LIMIT should be false)',
      );
      return;
    }

    const reqs = Array.from({ length: 40 }).map(() =>
      this.safeGet('/api/v1/health'),
    );
    const results = await throttle(reqs, MAX_PARALLEL);
    const hits429 = results.filter((r) => r && r.statusCode === 429).length;

    if (hits429 > 0) {
      console.log(`  ✓ Rate limit active: ${hits429} requests returned 429`);
      const any = results.find((r) => r && r.statusCode === 429);
      if (any && !normalizeHeaders(any.headers)['retry-after']) {
        this.recommendations.push(
          'Include Retry-After header on 429 responses',
        );
      }
    } else {
      this.issues.push('Rate limiting not detected (no 429 responses)');
      this.recommendations.push(
        'Implement express-rate-limit (different windows for /metrics, /health as needed)',
      );
    }
  }

  async checkInputRobustness() {
    console.log('🔍 Checking input robustness (basic fuzz)...');
    const probes = [
      '/api/v1/health?test=%27%20OR%20%271%27%3D%271',
      '/api/v1/trucks?test=<script>alert(1)</script>',
      '/api/v1/alerts?limit=__proto__',
    ];

    for (const p of probes) {
      const res = await this.safeGet(p);
      if (!res) continue;
      if (res.statusCode >= 500) {
        this.issues.push(
          `Unhandled error (HTTP ${res.statusCode}) on probe ${p}`,
        );
        this.recommendations.push(
          'Harden input validation and add centralized error handling',
        );
      }
      if (
        typeof res.body === 'string' &&
        /<script>|javascript:/i.test(res.body)
      ) {
        this.issues.push(`Reflected content detected on ${p} (potential XSS)`);
        this.recommendations.push('Escape untrusted output and add CSP');
      }
    }
  }

  async checkAuthSurface() {
    console.log('🔐 Checking auth surface...');
    // If login endpoint exists, it should be POST and not leak info on GET
    const loginGet = await this.safeGet('/api/v1/auth/login');
    if (loginGet && loginGet.statusCode === 200) {
      this.issues.push(
        'Auth login endpoint responds to GET (should typically be POST or 405)',
      );
      this.recommendations.push(
        'Restrict methods for auth endpoints (POST only), return 405 for others',
      );
    }

    // A protected endpoint (if exists) should return 401/403 without token
    const maybeProtected = [
      '/api/v1/users/me',
      '/api/v1/secure',
      '/api/v1/admin',
    ];
    for (const p of maybeProtected) {
      const res = await this.safeGet(p);
      if (res && res.statusCode === 200) {
        this.recommendations.push(
          `Verify ${p} is intended to be public; if not, enforce auth (401/403)`,
        );
      }
    }

    // JWT secret sanity
    const jwt = this.env.JWT_SECRET || '';
    if (!jwt || jwt.length < 16 || /change|secret|default|test/i.test(jwt)) {
      this.issues.push(
        'Weak or default JWT_SECRET detected (from backend/.env or .env.example)',
      );
      this.recommendations.push(
        'Use strong, unique JWT_SECRET (32+ random chars) and rotate periodically',
      );
    }

    // SALT_ROUNDS sanity (prod)
    const rounds = Number(this.env.SALT_ROUNDS || 10);
    if (
      (this.env.NODE_ENV || '').toLowerCase() === 'production' &&
      rounds < 10
    ) {
      this.issues.push(`Low SALT_ROUNDS (${rounds}) in production`);
      this.recommendations.push('Use SALT_ROUNDS >= 12 in production');
    }
  }

  async checkErrorHandling() {
    console.log('⚠️ Checking error handling...');
    const res = await this.safeGet('/api/this-route-does-not-exist');
    if (!res) return;
    const bodyStr =
      typeof res.body === 'string' ? res.body : JSON.stringify(res.body || {});
    if (/stack|Error:\s|at\s.+\(/i.test(bodyStr)) {
      this.issues.push(
        'Stack traces or internal error details exposed in responses',
      );
      this.recommendations.push(
        'Hide stack traces in production; return sanitized error payloads (problem+json)',
      );
    }
    if (res.statusCode !== 404) {
      this.recommendations.push(
        'Non-existent routes should return clean 404 JSON consistently',
      );
    }
  }

  async checkSecretsAndPermissions() {
    console.log('📁 Checking secrets & file permissions...');
    const files = [
      path.join(this.backendDir, 'database.sqlite'),
      path.join(this.backendDir, '.env'),
      path.join(this.nginxDir, 'ssl'),
    ].filter(Boolean);

    for (const f of files) {
      if (!this.exists(f)) continue;
      try {
        const stat = fs.statSync(f);
        // On POSIX, lower 3 octal digits are permissions; on Windows this is less meaningful.
        const mode = (stat.mode & 0o777).toString(8);
        if (/^6|^7/.test(mode)) {
          this.issues.push(
            `Insecure permissions for ${rel(this.monorepoRoot, f)} (0${mode})`,
          );
          this.recommendations.push(
            `Set secure permissions e.g. 600/640 (chmod) for ${rel(this.monorepoRoot, f)}`,
          );
        }
      } catch {
        // ignore
      }
    }
  }

  async checkSSL() {
    console.log('🔒 Checking SSL (nginx)...');
    const confPath = path.join(this.nginxDir, 'nginx.conf');
    const conf = this.readFileSafe(confPath);
    if (!conf) {
      this.recommendations.push(
        'Provide nginx.conf with TLS hardening for production',
      );
      return;
    }

    if (
      !/ssl_certificate\s+/i.test(conf) ||
      !/ssl_certificate_key\s+/i.test(conf)
    ) {
      this.recommendations.push(
        'Configure ssl_certificate and ssl_certificate_key in nginx for HTTPS',
      );
    }
    if (!/ssl_protocols\s+TLSv1\.2\s+TLSv1\.3/i.test(conf)) {
      this.recommendations.push('Use ssl_protocols TLSv1.2 TLSv1.3 in nginx');
    }
    if (!/ssl_prefer_server_ciphers\s+on;/i.test(conf)) {
      this.recommendations.push(
        'Enable ssl_prefer_server_ciphers on; in nginx',
      );
    }
    if (!/add_header\s+Strict-Transport-Security/i.test(conf)) {
      this.recommendations.push(
        'Add HSTS header in nginx for HTTPS (with preload if appropriate)',
      );
    }
  }

  async safeGet(p, opts = {}) {
    try {
      return await this.makeRequest(p, opts);
    } catch (e) {
      this.issues.push(`Request failed ${p}: ${e.message}`);
      return null;
    }
  }

  // ---------- report ----------
  async outputReport() {
    console.log('\n📋 Security Audit Report');
    console.log('='.repeat(60));

    if (this.issues.length) {
      console.log(`❌ Issues (${this.issues.length})`);
      this.issues.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
    } else {
      console.log('✅ No critical issues detected');
    }

    if (this.recommendations.length) {
      console.log(`\n💡 Recommendations (${this.recommendations.length})`);
      this.recommendations.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
    }

    const reportDir = path.join(this.monorepoRoot, 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const file = path.join(
      reportDir,
      `security-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    );
    const payload = {
      baseUrl: this.baseUrl,
      timestamp: new Date().toISOString(),
      issues: this.issues,
      recommendations: this.recommendations,
      findings: this.findings,
      envHints: {
        NODE_ENV: this.env.NODE_ENV,
        DISABLE_RATE_LIMIT: this.env.DISABLE_RATE_LIMIT,
        CORS_ORIGIN: this.env.CORS_ORIGIN,
      },
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\n📝 Report saved to: ${rel(this.monorepoRoot, file)}`);
    console.log('🔒 Security audit completed.');
  }
}

// ---------- small utils ----------
function normalizeHeaders(h) {
  const out = {};
  for (const k in h || {}) out[k.toLowerCase()] = h[k];
  return out;
}

async function throttle(promises, limit) {
  const ret = [];
  let i = 0;
  async function worker() {
    while (i < promises.length) {
      const idx = i++;
      try {
        ret[idx] = await promises[idx];
      } catch (e) {
        ret[idx] = null;
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, promises.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return ret;
}

function rel(root, p) {
  return path.relative(root, p) || p;
}

// ---------- run ----------
if (require.main === module) {
  const auditor = new SecurityAuditor({ baseUrl: DEFAULT_BASE_URL });
  auditor.runFullAudit().catch((err) => {
    console.error('Audit failed:', err);
    process.exitCode = 1;
  });
}
