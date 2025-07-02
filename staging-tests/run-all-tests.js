#!/usr/bin/env node

const ContinuousValidationLoop = require('./validation-loop');
const fs = require('fs');
const path = require('path');

class MasterTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.testResults = {
      startTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'staging',
      version: this.getVersion()
    };
  }

  async run() {
    console.log('🛡️ Quality Guardian & Self-Healing Engineer');
    console.log('==========================================');
    console.log(`Environment: ${this.testResults.environment}`);
    console.log(`Version: ${this.testResults.version}`);
    console.log(`Started: ${this.testResults.startTime}`);
    console.log('');

    try {
      // Pre-flight checks
      await this.preFlightChecks();
      
      // Run continuous validation
      const validator = new ContinuousValidationLoop();
      const validationReport = await validator.run();
      
      this.testResults.validation = validationReport;
      this.testResults.endTime = new Date().toISOString();
      this.testResults.duration = Date.now() - this.startTime;
      this.testResults.success = validationReport.summary.finalStatus === 'PASSED';
      
      // Generate final report
      this.generateMasterReport();
      
      return this.testResults.success;
      
    } catch (error) {
      console.error('❌ Master test runner failed:', error);
      this.testResults.error = error.message;
      this.testResults.success = false;
      return false;
    }
  }

  async preFlightChecks() {
    console.log('✈️ Running pre-flight checks...');
    
    const checks = [
      this.checkDockerServices(),
      this.checkEnvironmentVariables(),
      this.checkDiskSpace(),
      this.checkNetworkConnectivity()
    ];

    const results = await Promise.allSettled(checks);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      console.error('❌ Pre-flight checks failed:');
      failures.forEach(failure => {
        console.error(`  - ${failure.reason}`);
      });
      throw new Error('Pre-flight checks failed');
    }
    
    console.log('✅ All pre-flight checks passed');
  }

  async checkDockerServices() {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('docker-compose ps --services --filter status=running', { encoding: 'utf8' });
      const runningServices = output.trim().split('\n').filter(s => s.trim());
      
      const requiredServices = ['backend', 'dashboard', 'redis'];
      const missingServices = requiredServices.filter(service => 
        !runningServices.includes(service)
      );
      
      if (missingServices.length > 0) {
        throw new Error(`Missing services: ${missingServices.join(', ')}`);
      }
      
      console.log(`✅ Docker services running: ${runningServices.join(', ')}`);
    } catch (error) {
      throw new Error(`Docker services check failed: ${error.message}`);
    }
  }

  async checkEnvironmentVariables() {
    const requiredVars = ['NODE_ENV'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }
    
    console.log('✅ Environment variables configured');
  }

  async checkDiskSpace() {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('df -h .', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const dataLine = lines[1];
      const usage = dataLine.split(/\s+/)[4];
      const usagePercent = parseInt(usage.replace('%', ''));
      
      if (usagePercent > 90) {
        throw new Error(`Disk usage too high: ${usagePercent}%`);
      }
      
      console.log(`✅ Disk space available: ${100 - usagePercent}% free`);
    } catch (error) {
      console.warn('Could not check disk space:', error.message);
    }
  }

  async checkNetworkConnectivity() {
    try {
      const response = await fetch('http://localhost:5000/api/v1/health', { 
        timeout: 5000 
      });
      
      if (!response.ok) {
        throw new Error(`API not responding: ${response.status}`);
      }
      
      console.log('✅ Network connectivity verified');
    } catch (error) {
      throw new Error(`Network connectivity check failed: ${error.message}`);
    }
  }

  getVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.version || '1.0.0';
    } catch (error) {
      return '1.0.0';
    }
  }

  generateMasterReport() {
    const report = {
      ...this.testResults,
      summary: {
        status: this.testResults.success ? 'PASSED' : 'FAILED',
        duration: `${(this.testResults.duration / 1000).toFixed(1)}s`,
        timestamp: new Date().toISOString()
      },
      metrics: this.calculateMetrics(),
      nextSteps: this.getNextSteps()
    };

    // Write master report
    fs.writeFileSync(
      'staging-tests/master-report.json',
      JSON.stringify(report, null, 2)
    );

    // Write summary for CI/CD
    fs.writeFileSync(
      'staging-tests/test-summary.txt',
      this.generateTextSummary(report)
    );

    console.log('\n📋 Master Test Report');
    console.log('====================');
    console.log(`Status: ${report.summary.status}`);
    console.log(`Duration: ${report.summary.duration}`);
    console.log(`Timestamp: ${report.summary.timestamp}`);
    
    if (report.metrics) {
      console.log('\n📊 Metrics:');
      Object.entries(report.metrics).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }

    if (report.nextSteps.length > 0) {
      console.log('\n📝 Next Steps:');
      report.nextSteps.forEach(step => {
        console.log(`  - ${step}`);
      });
    }
  }

  calculateMetrics() {
    if (!this.testResults.validation) return null;

    const validation = this.testResults.validation;
    
    return {
      'Total Iterations': validation.summary.totalIterations,
      'Success Rate': `${((validation.summary.successfulIterations / validation.summary.totalIterations) * 100).toFixed(1)}%`,
      'System Health': validation.summary.systemHealth,
      'Test Duration': `${(this.testResults.duration / 1000).toFixed(1)}s`
    };
  }

  getNextSteps() {
    const steps = [];
    
    if (this.testResults.success) {
      steps.push('✅ System validated - Ready for production deployment');
      steps.push('🚀 Trigger production rollout pipeline');
      steps.push('📊 Monitor production metrics after deployment');
    } else {
      steps.push('❌ System validation failed - Manual intervention required');
      steps.push('🔍 Review test reports and error logs');
      steps.push('🔧 Apply necessary fixes and re-run validation');
      
      if (this.testResults.validation?.recommendations) {
        steps.push(...this.testResults.validation.recommendations.map(r => `💡 ${r}`));
      }
    }
    
    return steps;
  }

  generateTextSummary(report) {
    return `
Ice Truck Tracking System - Test Summary
========================================

Status: ${report.summary.status}
Duration: ${report.summary.duration}
Environment: ${report.environment}
Version: ${report.version}
Timestamp: ${report.summary.timestamp}

${report.summary.status === 'PASSED' ? 
  '🎉 All tests passed! System is ready for production.' :
  '⚠️ Tests failed. Manual intervention required.'
}

Next Steps:
${report.nextSteps.map(step => `- ${step}`).join('\n')}
`.trim();
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new MasterTestRunner();
  runner.run().then(success => {
    console.log(success ? '\n🎉 All tests passed!' : '\n❌ Tests failed!');
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('\n💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = MasterTestRunner;