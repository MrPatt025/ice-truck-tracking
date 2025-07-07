const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecureEnvGenerator {
    constructor() {
        this.envPath = path.join(__dirname, '..', '..', '.env');
    }

    generateSecureSecret(length = 64) {
        return crypto.randomBytes(length).toString('hex');
    }

    generateSecureConfig() {
        const config = {
            NODE_ENV: 'production',
            PORT: '5000',
            DB_URL: './database.sqlite',
            JWT_SECRET: this.generateSecureSecret(64),
            JWT_EXPIRES_IN: '1h',
            SALT_ROUNDS: '12',
            CLIENT_URL: 'https://ice-truck-tracking.com',
            RATE_LIMIT_WINDOW_MS: '900000',
            RATE_LIMIT_MAX_REQUESTS: '100',
            LOG_LEVEL: 'info',
            LOG_FORMAT: 'json',
            HEALTH_CHECK_TIMEOUT: '5000'
        };

        return config;
    }

    writeSecureEnvFile() {
        const config = this.generateSecureConfig();
        const envContent = Object.entries(config)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        try {
            fs.writeFileSync(this.envPath, envContent, { mode: 0o600 });
            console.log('✅ Secure environment file created successfully');
            console.log('🔐 JWT_SECRET has been generated with cryptographically secure random bytes');
            return true;
        } catch (error) {
            console.error('❌ Failed to create secure environment file:', error.message);
            return false;
        }
    }

    fixFilePermissions() {
        const criticalFiles = [
            path.join(__dirname, '..', '..', 'database.sqlite'),
            path.join(__dirname, '..', '..', '.env'),
            path.join(__dirname, '..', '..', '..', 'nginx', 'ssl')
        ];

        criticalFiles.forEach(file => {
            if (fs.existsSync(file)) {
                try {
                    fs.chmodSync(file, 0o600);
                    console.log(`✅ Fixed permissions for ${file}`);
                } catch (error) {
                    console.error(`❌ Failed to fix permissions for ${file}:`, error.message);
                }
            }
        });
    }
}

// Export for use in other modules
module.exports = SecureEnvGenerator;

// Run if called directly
if (require.main === module) {
    const generator = new SecureEnvGenerator();
    generator.writeSecureEnvFile();
    generator.fixFilePermissions();
} 
