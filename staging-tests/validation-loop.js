const SmokeTestRunner = require('./smoke-tests');
const SelfHealingEngine = require('./self-healing');
const fs = require('fs');

class ContinuousValidationLoop {
  constructor() {
    this.maxIterations = 5;
    this.currentIteration = 0;
    this.validationHistory = [];
  }

  async run() {
    console.log('🔄 Starting Continuous Validation Loop...');
    
    while (this.currentIteration < this.maxIterations) {
      this.currentIteration++;
      console.log(`\n🔄 Iteration ${this.currentIteration}/${this.maxIterations}`);
      
      const iterationResult = await this.runValidationIteration();
      this.validationHistory.push(iterationResult);
      
      if (iterationResult.success) {
        console.log('✅ All validations passed! System is healthy.');
        break;
      }
      
      if (this.currentIteration >= this.maxIterations) {
        console.log('❌ Maximum iterations reached. Manual intervention required.');
        break;
      }
      
      console.log('⏳ Waiting before next iteration...');
      await this.sleep(30000); // Wait 30 seconds
    }
    
    return this.generateFinalReport();
  }

  async runValidationIteration() {
    const iteration = {
      number: this.currentIteration,
      timestamp: new Date().toISOString(),
      phases: {}
    };

    try {
      // Phase 1: Smoke Tests
      console.log('🚀 Running smoke tests...');
      const smokeRunner = new SmokeTestRunner();
      const smokeSuccess = await smokeRunner.runAllTests();
      
      iteration.phases.smokeTests = {
        success: smokeSuccess,
        timestamp: new Date().toISOString()
      };

      if (smokeSuccess) {
        // Phase 2: Load Tests (simplified)
        console.log('⚡ Running load tests...');
        const loadTestSuccess = await this.runLoadTests();
        
        iteration.phases.loadTests = {
          success: loadTestSuccess,
          timestamp: new Date().toISOString()
        };

        // Phase 3: Security Scan (simplified)
        console.log('🔒 Running security scan...');
        const securitySuccess = await this.runSecurityScan();
        
        iteration.phases.securityScan = {
          success: securitySuccess,
          timestamp: new Date().toISOString()
        };

        iteration.success = smokeSuccess && loadTestSuccess && securitySuccess;
      } else {
        // Phase 4: Self-Healing
        console.log('🔧 Running self-healing...');
        const healer = new SelfHealingEngine();
        const healingReport = await healer.diagnoseAndHeal();
        
        iteration.phases.selfHealing = {
          success: healingReport.summary.fixesApplied > 0,
          report: healingReport,
          timestamp: new Date().toISOString()
        };

        iteration.success = false; // Need to re-validate after healing
      }

    } catch (error) {
      console.error('❌ Validation iteration failed:', error);
      iteration.success = false;
      iteration.error = error.message;
    }

    return iteration;
  }

  async runLoadTests() {
    try {
      // Simplified load test - check if API can handle concurrent requests
      const promises = [];
      const concurrentRequests = 10;
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          fetch('http://localhost:5000/api/v1/health')
            .then(response => ({ success: response.ok, status: response.status }))
            .catch(error => ({ success: false, error: error.message }))
        );
      }
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / concurrentRequests;
      
      console.log(`Load test: ${successCount}/${concurrentRequests} requests succeeded (${(successRate * 100).toFixed(1)}%)`);
      
      return successRate >= 0.95; // 95% success rate required
    } catch (error) {
      console.error('Load test failed:', error);
      return false;
    }
  }

  async runSecurityScan() {
    try {
      // Simplified security check - verify HTTPS headers and basic security
      const response = await fetch('http://localhost:5000/api/v1/health');
      const headers = response.headers;
      
      const securityChecks = [
        headers.get('x-content-type-options') === 'nosniff',
        headers.get('x-frame-options') !== null,
        !headers.get('server') || !headers.get('server').includes('Express') // Server header should be hidden
      ];
      
      const passedChecks = securityChecks.filter(Boolean).length;
      const securityScore = passedChecks / securityChecks.length;
      
      console.log(`Security scan: ${passedChecks}/${securityChecks.length} checks passed (${(securityScore * 100).toFixed(1)}%)`);
      
      return securityScore >= 0.7; // 70% security score required
    } catch (error) {
      console.error('Security scan failed:', error);
      return false;
    }
  }

  generateFinalReport() {
    const finalIteration = this.validationHistory[this.validationHistory.length - 1];
    const totalIterations = this.validationHistory.length;
    const successfulIterations = this.validationHistory.filter(i => i.success).length;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIterations,
        successfulIterations,
        finalStatus: finalIteration?.success ? 'PASSED' : 'FAILED',
        systemHealth: this.assessSystemHealth()
      },
      iterations: this.validationHistory,
      recommendations: this.generateRecommendations()
    };

    // Write final report
    fs.writeFileSync(
      'staging-tests/validation-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Final Validation Report');
    console.log('=========================');
    console.log(`Total Iterations: ${totalIterations}`);
    console.log(`Successful Iterations: ${successfulIterations}`);
    console.log(`Final Status: ${report.summary.finalStatus}`);
    console.log(`System Health: ${report.summary.systemHealth}`);

    if (report.summary.finalStatus === 'PASSED') {
      console.log('\n🎉 System is ready for production deployment!');
      this.tagRelease();
    } else {
      console.log('\n⚠️  System requires manual intervention before production deployment.');
    }

    return report;
  }

  assessSystemHealth() {
    const lastIteration = this.validationHistory[this.validationHistory.length - 1];
    
    if (!lastIteration) return 'UNKNOWN';
    if (lastIteration.success) return 'HEALTHY';
    
    const hasRecentSuccess = this.validationHistory.slice(-3).some(i => i.success);
    return hasRecentSuccess ? 'DEGRADED' : 'UNHEALTHY';
  }

  generateRecommendations() {
    const recommendations = [];
    const failedPhases = new Set();
    
    this.validationHistory.forEach(iteration => {
      if (iteration.phases) {
        Object.entries(iteration.phases).forEach(([phase, result]) => {
          if (!result.success) {
            failedPhases.add(phase);
          }
        });
      }
    });

    if (failedPhases.has('smokeTests')) {
      recommendations.push('Review service configurations and ensure all dependencies are properly connected');
    }
    
    if (failedPhases.has('loadTests')) {
      recommendations.push('Consider scaling up resources or optimizing application performance');
    }
    
    if (failedPhases.has('securityScan')) {
      recommendations.push('Review security headers and implement additional security measures');
    }
    
    if (failedPhases.has('selfHealing')) {
      recommendations.push('Review self-healing logic and ensure proper error handling');
    }

    return recommendations;
  }

  tagRelease() {
    try {
      const { execSync } = require('child_process');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tag = `release-validated-${timestamp}`;
      
      execSync(`git tag ${tag}`, { stdio: 'inherit' });
      console.log(`✅ Tagged release: ${tag}`);
    } catch (error) {
      console.warn('Could not tag release:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new ContinuousValidationLoop();
  validator.run().then(report => {
    process.exit(report.summary.finalStatus === 'PASSED' ? 0 : 1);
  }).catch(error => {
    console.error('Validation loop failed:', error);
    process.exit(1);
  });
}

module.exports = ContinuousValidationLoop;