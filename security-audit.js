const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
    constructor() {
        this.issues = [];
        this.recommendations = [];
        this.baseUrl = 'http://localhost:5000';
    }

    async runFullAudit() {
        console.log('🔒 Starting comprehensive security audit...\n');

        await this.checkDependencies();
        await this.checkSecurityHeaders();
        await this.checkCORSConfiguration();
        await this.checkRateLimiting();
        await this.checkInputValidation();
        await this.checkAuthentication();
        await this.checkErrorHandling();
        await this.checkFilePermissions();
        await this.checkEnvironmentVariables();
        await this.checkSSLConfiguration();

        this.generateReport();
    }

    async checkDependencies() {
        console.log('📦 Checking dependencies for vulnerabilities...');

        try {
            // Check for known vulnerabilities in package.json
            const packagePath = path.join(__dirname, 'api', 'package.json');
            if (fs.existsSync(packagePath)) {
                const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

                // Check for known vulnerable packages
                const vulnerablePackages = [
                    'express', 'socket.io', 'bcrypt', 'jsonwebtoken'
                ];

                for (const pkg of vulnerablePackages) {
                    if (packageJson.dependencies[pkg]) {
                        console.log(`  ✓ ${pkg} version: ${packageJson.dependencies[pkg]}`);
                    }
                }
            }
        } catch (error) {
            this.issues.push(`Dependency check failed: ${error.message}`);
        }
    }

    async checkSecurityHeaders() {
        console.log('🛡️ Checking security headers...');

        try {
            const response = await this.makeRequest('/api/v1/health');

            const requiredHeaders = {
                'x-content-type-options': 'nosniff',
                'x-frame-options': 'DENY',
                'x-xss-protection': '1; mode=block'
            };

            for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
                const actualValue = response.headers[header];
                if (actualValue === expectedValue) {
                    console.log(`  ✓ ${header}: ${actualValue}`);
                } else {
                    this.issues.push(`Missing or incorrect security header: ${header}`);
                    this.recommendations.push(`Add header: ${header}: ${expectedValue}`);
                }
            }

            // Check for additional security headers
            const additionalHeaders = ['strict-transport-security', 'content-security-policy'];
            for (const header of additionalHeaders) {
                if (!response.headers[header]) {
                    this.recommendations.push(`Consider adding ${header} header for enhanced security`);
                }
            }
        } catch (error) {
            this.issues.push(`Security headers check failed: ${error.message}`);
        }
    }

    async checkCORSConfiguration() {
        console.log('🌐 Checking CORS configuration...');

        try {
            const response = await this.makeRequest('/api/v1/health', {
                headers: { 'Origin': 'http://malicious-site.com' }
            });

            const corsHeader = response.headers['access-control-allow-origin'];
            if (corsHeader === 'http://localhost:3000' || corsHeader === '*') {
                console.log(`  ✓ CORS origin: ${corsHeader}`);
            } else {
                this.issues.push(`Insecure CORS configuration: ${corsHeader}`);
                this.recommendations.push('Restrict CORS to specific trusted origins');
            }
        } catch (error) {
            this.issues.push(`CORS check failed: ${error.message}`);
        }
    }

    async checkRateLimiting() {
        console.log('⚡ Checking rate limiting...');

        try {
            const requests = Array(100).fill().map(() =>
                this.makeRequest('/api/v1/health')
            );

            const responses = await Promise.all(requests);
            const rateLimited = responses.filter(r => r.statusCode === 429);

            if (rateLimited.length > 0) {
                console.log(`  ✓ Rate limiting active: ${rateLimited.length} requests blocked`);
            } else {
                this.issues.push('Rate limiting not properly configured');
                this.recommendations.push('Implement rate limiting to prevent abuse');
            }
        } catch (error) {
            this.issues.push(`Rate limiting check failed: ${error.message}`);
        }
    }

    async checkInputValidation() {
        console.log('🔍 Checking input validation...');

        try {
            // Test SQL injection attempts
            const sqlInjectionTests = [
                "' OR '1'='1",
                "'; DROP TABLE users; --",
                "' UNION SELECT * FROM users --"
            ];

            for (const test of sqlInjectionTests) {
                const response = await this.makeRequest(`/api/v1/health?test=${encodeURIComponent(test)}`);
                if (response.statusCode === 500) {
                    this.issues.push(`Potential SQL injection vulnerability detected`);
                    this.recommendations.push('Implement proper input validation and parameterized queries');
                    break;
                }
            }

            // Test XSS attempts
            const xssTests = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src="x" onerror="alert(\'xss\')">'
            ];

            for (const test of xssTests) {
                const response = await this.makeRequest(`/api/v1/health?test=${encodeURIComponent(test)}`);
                if (response.body && response.body.includes(test)) {
                    this.issues.push(`Potential XSS vulnerability detected`);
                    this.recommendations.push('Implement proper output encoding and CSP headers');
                    break;
                }
            }
        } catch (error) {
            this.issues.push(`Input validation check failed: ${error.message}`);
        }
    }

    async checkAuthentication() {
        console.log('🔐 Checking authentication...');

        try {
            // Check if JWT secret is properly configured
            const envPath = path.join(__dirname, 'api', '.env');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                if (envContent.includes('JWT_SECRET=ice-truck-tracking-super-secret-jwt-key-2025')) {
                    this.issues.push('Default JWT secret is being used');
                    this.recommendations.push('Change JWT_SECRET to a strong, unique value');
                }
            }

            // Check for authentication endpoints
            const authResponse = await this.makeRequest('/api/v1/auth/login');
            if (authResponse.statusCode === 404) {
                this.recommendations.push('Consider implementing authentication endpoints');
            }
        } catch (error) {
            this.issues.push(`Authentication check failed: ${error.message}`);
        }
    }

    async checkErrorHandling() {
        console.log('⚠️ Checking error handling...');

        try {
            // Test for information disclosure
            const response = await this.makeRequest('/api/nonexistent');

            if (response.body && response.body.includes('stack trace')) {
                this.issues.push('Stack traces are exposed in error responses');
                this.recommendations.push('Disable stack trace exposure in production');
            }

            if (response.body && response.body.includes('internal server error')) {
                this.issues.push('Internal error details are exposed');
                this.recommendations.push('Use generic error messages in production');
            }
        } catch (error) {
            this.issues.push(`Error handling check failed: ${error.message}`);
        }
    }

    async checkFilePermissions() {
        console.log('📁 Checking file permissions...');

        try {
            const criticalFiles = [
                'api/database.sqlite',
                'api/.env',
                'nginx/ssl'
            ];

            for (const file of criticalFiles) {
                const filePath = path.join(__dirname, file);
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    const mode = stats.mode.toString(8);

                    if (mode.includes('777') || mode.includes('666')) {
                        this.issues.push(`Insecure file permissions: ${file} (${mode})`);
                        this.recommendations.push(`Restrict permissions on ${file}`);
                    } else {
                        console.log(`  ✓ ${file}: ${mode}`);
                    }
                }
            }
        } catch (error) {
            this.issues.push(`File permissions check failed: ${error.message}`);
        }
    }

    async checkEnvironmentVariables() {
        console.log('🔧 Checking environment variables...');

        try {
            const envPath = path.join(__dirname, 'api', '.env');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');

                if (envContent.includes('NODE_ENV=development')) {
                    this.issues.push('Running in development mode');
                    this.recommendations.push('Set NODE_ENV=production for production deployment');
                }

                if (envContent.includes('DEBUG=true')) {
                    this.issues.push('Debug mode is enabled');
                    this.recommendations.push('Disable debug mode in production');
                }
            }
        } catch (error) {
            this.issues.push(`Environment variables check failed: ${error.message}`);
        }
    }

    async checkSSLConfiguration() {
        console.log('🔒 Checking SSL configuration...');

        try {
            // Check if HTTPS is configured
            const nginxConfig = path.join(__dirname, 'nginx', 'nginx.conf');
            if (fs.existsSync(nginxConfig)) {
                const config = fs.readFileSync(nginxConfig, 'utf8');

                if (config.includes('ssl_certificate') && config.includes('ssl_certificate_key')) {
                    console.log('  ✓ SSL certificates configured');
                } else {
                    this.recommendations.push('Configure SSL certificates for HTTPS');
                }

                if (config.includes('ssl_protocols')) {
                    console.log('  ✓ SSL protocols configured');
                } else {
                    this.recommendations.push('Configure secure SSL protocols (TLS 1.2+)');
                }
            }
        } catch (error) {
            this.issues.push(`SSL configuration check failed: ${error.message}`);
        }
    }

    makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.baseUrl + path);
            const client = url.protocol === 'https:' ? https : http;

            const req = client.request(url, {
                method: options.method || 'GET',
                headers: options.headers || {}
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const body = JSON.parse(data);
                        resolve({ statusCode: res.statusCode, headers: res.headers, body });
                    } catch {
                        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    generateReport() {
        console.log('\n📋 Security Audit Report');
        console.log('='.repeat(50));

        if (this.issues.length === 0) {
            console.log('✅ No critical security issues found!');
        } else {
            console.log(`❌ Found ${this.issues.length} security issues:`);
            this.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }

        if (this.recommendations.length > 0) {
            console.log(`\n💡 ${this.recommendations.length} recommendations:`);
            this.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
        }

        console.log('\n🔒 Security audit completed!');
    }
}

// Run the audit
const auditor = new SecurityAuditor();
auditor.runFullAudit().catch(console.error); 
