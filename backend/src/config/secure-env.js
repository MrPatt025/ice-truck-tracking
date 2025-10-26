'use strict';

/**
 * backend/src/config/secure-env.js
 * CommonJS utility for generating a locked-down .env
 */

const nodeCrypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

class SecureEnvGenerator {
  constructor(envPath) {
    // default to backend/.env
    this.envPath = envPath || path.join(__dirname, '..', '..', '.env');
  }

  generateSecureSecret(lengthBytes = 64) {
    return nodeCrypto.randomBytes(lengthBytes).toString('hex');
  }

  /**
   * Opinionated secure defaults for this repo
   * Aligns with Prisma SQLite: DATABASE_URL=file:./dev.db
   */
  generateSecureConfig() {
    return {
      NODE_ENV: 'production',
      PORT: '5000',
      DATABASE_URL: 'file:./dev.db',
      JWT_SECRET: this.generateSecureSecret(64),
      JWT_EXPIRES_IN: '1h',
      SALT_ROUNDS: '12',
      CLIENT_URL: 'https://ice-truck-tracking.com',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX_REQUESTS: '100',
      LOG_LEVEL: 'info',
      LOG_FORMAT: 'json',
      HEALTH_CHECK_TIMEOUT: '5000',
      // Optional demo login (disabled when unset)
      // DEMO_CREDENTIALS: '{"username":"admin","password":"admin","role":"ADMIN"}'
    };
  }

  toEnvString(obj) {
    return Object.entries(obj)
      .map(([k, v]) => `${k}=${String(v).replace(/\r?\n/g, '')}`)
      .join('\n');
  }

  ensureParentDir() {
    const dir = path.dirname(this.envPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // lock down dir on POSIX
    this.setStrictPermissions([dir]);
  }

  /**
   * Create or overwrite a secure .env atomically
   */
  writeSecureEnvFile({ overwrite = false } = {}) {
    this.ensureParentDir();

    if (!overwrite && fs.existsSync(this.envPath)) {
      console.log('ℹ️  .env already exists. Use overwrite=true to regenerate.');
      return false;
    }

    const content = this.toEnvString(this.generateSecureConfig());
    const tmp = `${this.envPath}.${process.pid}.tmp`;

    try {
      fs.writeFileSync(tmp, content, { mode: 0o600, flag: 'w' });
      fs.renameSync(tmp, this.envPath);
      this.setStrictPermissions([this.envPath]);
      console.log('✅ Secure .env created');
      console.log(
        '🔐 JWT_SECRET generated using cryptographically secure random bytes',
      );
      return true;
    } catch (err) {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch (unlinkErr) {
        console.warn(
          '⚠️  Could not cleanup temp file:',
          unlinkErr && unlinkErr.message ? unlinkErr.message : unlinkErr,
        );
      }

      console.error(
        '❌ Failed to create .env:',
        err && err.message ? err.message : err,
      );
      return false;
    }
  }

  /**
   * Apply strict perms:
   * - file: 0600
   * - directory: 0700
   * On Windows, chmod is a no-op and will be skipped.
   */
  setStrictPermissions(targets) {
    if (process.platform === 'win32') return;

    for (const p of targets) {
      try {
        if (!fs.existsSync(p)) continue;
        const st = fs.statSync(p);
        const mode = st.isDirectory() ? 0o700 : 0o600;
        fs.chmodSync(p, mode);

        console.log(`✅ Set permissions ${mode.toString(8)} for ${p}`);
      } catch (err) {
        console.error(
          `❌ Failed to chmod ${p}:`,
          err && err.message ? err.message : err,
        );
      }
    }
  }

  /**
   * Convenience helper to tighten common artifacts in this repo
   */
  fixFilePermissions() {
    const candidates = [
      path.join(__dirname, '..', '..', 'database.sqlite'),
      path.join(__dirname, '..', '..', '.env'),
      path.join(__dirname, '..', '..', '..', 'nginx', 'ssl'),
    ];
    this.setStrictPermissions(candidates);
  }
}

module.exports = SecureEnvGenerator;

if (require.main === module) {
  const generator = new SecureEnvGenerator();
  generator.writeSecureEnvFile();
  generator.fixFilePermissions();
}
