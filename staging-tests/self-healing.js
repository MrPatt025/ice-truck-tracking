const fs = require('fs');
const { execSync } = require('child_process');
const axios = require('axios');

class SelfHealingEngine {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.maxRetries = 3;
  }

  async diagnoseAndHeal() {
    console.log('🔧 Starting Self-Healing Process...');
    
    await this.detectIssues();
    await this.generateFixes();
    await this.applyFixes();
    await this.validateFixes();
    
    return this.generateHealingReport();
  }

  async detectIssues() {
    console.log('🔍 Detecting issues...');
    
    // Check service health
    await this.checkServiceHealth();
    
    // Check resource usage
    await this.checkResourceUsage();
    
    // Check error logs
    await this.checkErrorLogs();
    
    // Check performance metrics
    await this.checkPerformanceMetrics();
  }

  async checkServiceHealth() {
    const services = [
      { name: 'backend', url: 'http://localhost:5000/api/v1/health' },
      { name: 'dashboard', url: 'http://localhost:3000' },
      { name: 'notification', url: 'http://localhost:3002/health' }
    ];

    for (const service of services) {
      try {
        const response = await axios.get(service.url, { timeout: 5000 });
        if (response.status !== 200) {
          this.addIssue('service_down', `${service.name} service unhealthy`, {
            service: service.name,
            status: response.status,
            url: service.url
          });
        }
      } catch (error) {
        this.addIssue('service_down', `${service.name} service unreachable`, {
          service: service.name,
          error: error.message,
          url: service.url
        });
      }
    }
  }

  async checkResourceUsage() {
    try {
      const stats = execSync('docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"', 
        { encoding: 'utf8' });
      
      const lines = stats.split('\n').slice(1); // Skip header
      
      lines.forEach(line => {
        if (line.trim()) {
          const [name, cpu, memory] = line.split('\t');
          const cpuPercent = parseFloat(cpu.replace('%', ''));
          
          if (cpuPercent > 80) {
            this.addIssue('high_cpu', `High CPU usage in ${name}`, {
              container: name,
              cpu: cpuPercent,
              memory: memory
            });
          }
        }
      });
    } catch (error) {
      console.warn('Could not check resource usage:', error.message);
    }
  }

  async checkErrorLogs() {
    try {
      const logs = execSync('docker-compose logs --tail=100 backend', { encoding: 'utf8' });
      
      if (logs.includes('ERROR') || logs.includes('ECONNREFUSED') || logs.includes('timeout')) {
        this.addIssue('error_logs', 'Errors detected in backend logs', {
          logSample: logs.split('\n').filter(line => 
            line.includes('ERROR') || line.includes('ECONNREFUSED')
          ).slice(0, 5)
        });
      }
    } catch (error) {
      console.warn('Could not check error logs:', error.message);
    }
  }

  async checkPerformanceMetrics() {
    try {
      const startTime = Date.now();
      await axios.get('http://localhost:5000/api/v1/health');
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 1000) {
        this.addIssue('slow_response', 'API response time too slow', {
          responseTime,
          threshold: 1000
        });
      }
    } catch (error) {
      this.addIssue('api_error', 'API performance check failed', {
        error: error.message
      });
    }
  }

  async generateFixes() {
    console.log('💡 Generating fixes...');
    
    for (const issue of this.issues) {
      const fix = this.createFix(issue);
      if (fix) {
        this.fixes.push(fix);
      }
    }
  }

  createFix(issue) {
    switch (issue.type) {
      case 'service_down':
        return {
          type: 'restart_service',
          description: `Restart ${issue.context.service} service`,
          commands: [
            `docker-compose restart ${issue.context.service}`,
            'sleep 10'
          ],
          issue: issue
        };

      case 'high_cpu':
        return {
          type: 'scale_service',
          description: `Scale up ${issue.context.container} due to high CPU`,
          commands: [
            `docker-compose up -d --scale ${issue.context.container}=2`
          ],
          issue: issue
        };

      case 'error_logs':
        return {
          type: 'clear_cache',
          description: 'Clear cache and restart services',
          commands: [
            'docker-compose exec redis redis-cli FLUSHALL',
            'docker-compose restart backend'
          ],
          issue: issue
        };

      case 'slow_response':
        return {
          type: 'optimize_performance',
          description: 'Optimize performance settings',
          commands: [
            'docker-compose restart backend',
            'docker-compose exec redis redis-cli FLUSHALL'
          ],
          issue: issue
        };

      default:
        return {
          type: 'generic_restart',
          description: 'Generic system restart',
          commands: [
            'docker-compose restart'
          ],
          issue: issue
        };
    }
  }

  async applyFixes() {
    console.log('🔨 Applying fixes...');
    
    for (const fix of this.fixes) {
      console.log(`Applying fix: ${fix.description}`);
      
      try {
        for (const command of fix.commands) {
          console.log(`Executing: ${command}`);
          execSync(command, { stdio: 'inherit' });
        }
        
        fix.status = 'applied';
        fix.appliedAt = new Date().toISOString();
      } catch (error) {
        fix.status = 'failed';
        fix.error = error.message;
        console.error(`Fix failed: ${error.message}`);
      }
    }
  }

  async validateFixes() {
    console.log('✅ Validating fixes...');
    
    // Wait for services to stabilize
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Re-run health checks
    const SmokeTestRunner = require('./smoke-tests');
    const smokeTests = new SmokeTestRunner();
    const success = await smokeTests.runAllTests();
    
    if (success) {
      console.log('✅ All fixes validated successfully');
    } else {
      console.log('❌ Some issues remain after fixes');
    }
    
    return success;
  }

  addIssue(type, description, context = {}) {
    const issue = {
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      context,
      detectedAt: new Date().toISOString(),
      severity: this.getSeverity(type)
    };
    
    this.issues.push(issue);
    console.log(`🚨 Issue detected: ${description}`);
  }

  getSeverity(type) {
    const severityMap = {
      service_down: 'critical',
      high_cpu: 'high',
      error_logs: 'medium',
      slow_response: 'medium',
      api_error: 'high'
    };
    
    return severityMap[type] || 'low';
  }

  generateHealingReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        issuesDetected: this.issues.length,
        fixesGenerated: this.fixes.length,
        fixesApplied: this.fixes.filter(f => f.status === 'applied').length,
        fixesFailed: this.fixes.filter(f => f.status === 'failed').length
      },
      issues: this.issues,
      fixes: this.fixes,
      recommendations: this.generateRecommendations()
    };

    // Write report
    fs.writeFileSync(
      'staging-tests/self-healing-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n🏥 Self-Healing Report');
    console.log('=====================');
    console.log(`Issues Detected: ${report.summary.issuesDetected}`);
    console.log(`Fixes Applied: ${report.summary.fixesApplied}`);
    console.log(`Fixes Failed: ${report.summary.fixesFailed}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.issues.some(i => i.type === 'high_cpu')) {
      recommendations.push('Consider upgrading server resources or optimizing application performance');
    }
    
    if (this.issues.some(i => i.type === 'service_down')) {
      recommendations.push('Implement health check monitoring and automatic restart policies');
    }
    
    if (this.issues.some(i => i.type === 'slow_response')) {
      recommendations.push('Review database queries and implement caching strategies');
    }
    
    return recommendations;
  }
}

// Run if called directly
if (require.main === module) {
  const healer = new SelfHealingEngine();
  healer.diagnoseAndHeal().then(report => {
    console.log('Self-healing process completed');
    process.exit(0);
  }).catch(error => {
    console.error('Self-healing failed:', error);
    process.exit(1);
  });
}

module.exports = SelfHealingEngine;