#!/usr/bin/env node

/**
 * Performance Refactor Audit Script
 * Comprehensive audit script that measures performance before and after the refactor
 * Integrates with existing performance monitoring infrastructure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Audit configuration
const AUDIT_CONFIG = {
  srcDir: path.join(process.cwd(), 'src'),
  outputDir: path.join(process.cwd(), 'performance-audit'),
  thresholds: {
    inlineStyles: 50,
    unstableCallbacks: 20,
    unmemoizedComponents: 30,
    slowRenderThreshold: 16, // ms
  }
};

class PerformanceAuditor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {},
      recommendations: [],
      before: null,
      after: null,
    };
  }

  // Scan for inline style objects
  scanInlineStyles(dir = AUDIT_CONFIG.srcDir) {
    console.log('🔍 Scanning for inline style objects...');

    try {
      const output = execSync(`grep -r "style={{" ${dir} --include="*.tsx" --include="*.ts" | wc -l`, { encoding: 'utf8' });
      const count = parseInt(output.trim());

      this.results.details.inlineStyles = {
        count,
        threshold: AUDIT_CONFIG.thresholds.inlineStyles,
        status: count > AUDIT_CONFIG.thresholds.inlineStyles ? 'NEEDS_ATTENTION' : 'GOOD'
      };

      if (count > AUDIT_CONFIG.thresholds.inlineStyles) {
        this.results.recommendations.push(`Found ${count} inline style objects. Consider stabilizing with useStableStyle hook.`);
      }

      console.log(`   Found ${count} inline style objects`);
    } catch (error) {
      console.warn('   Could not scan inline styles:', error.message);
      this.results.details.inlineStyles = { error: error.message };
    }
  }

  // Scan for React.memo usage
  scanMemoization(dir = AUDIT_CONFIG.srcDir) {
    console.log('🔍 Scanning for React.memo usage...');

    try {
      const allComponents = execSync(`find ${dir} -name "*.tsx" | xargs grep -l "export.*function\\|export.*const.*=" | wc -l`, { encoding: 'utf8' });
      const memoizedComponents = execSync(`grep -r "React.memo\\|memo(" ${dir} --include="*.tsx" --include="*.ts" | wc -l`, { encoding: 'utf8' });

      const totalComponents = parseInt(allComponents.trim());
      const memoized = parseInt(memoizedComponents.trim());
      const memoizationRate = totalComponents > 0 ? (memoized / totalComponents * 100).toFixed(1) : 0;

      this.results.details.memoization = {
        totalComponents,
        memoizedComponents: memoized,
        memoizationRate: `${memoizationRate}%`,
        status: memoizationRate > 70 ? 'GOOD' : 'NEEDS_ATTENTION'
      };

      if (memoizationRate < 50) {
        this.results.recommendations.push(`Only ${memoizationRate}% of components are memoized. Consider applying React.memo to frequently rendering components.`);
      }

      console.log(`   ${memoized}/${totalComponents} components memoized (${memoizationRate}%)`);
    } catch (error) {
      console.warn('   Could not scan memoization:', error.message);
      this.results.details.memoization = { error: error.message };
    }
  }

  // Scan for useCallback usage
  scanCallbackOptimization(dir = AUDIT_CONFIG.srcDir) {
    console.log('🔍 Scanning for callback optimization...');

    try {
      const inlineCallbacks = execSync(`grep -r "onClick={() =>" ${dir} --include="*.tsx" | wc -l`, { encoding: 'utf8' });
      const optimizedCallbacks = execSync(`grep -r "useCallback\\|useStableCallback" ${dir} --include="*.tsx" --include="*.ts" | wc -l`, { encoding: 'utf8' });

      const inlineCount = parseInt(inlineCallbacks.trim());
      const optimizedCount = parseInt(optimizedCallbacks.trim());

      this.results.details.callbacks = {
        inlineCallbacks: inlineCount,
        optimizedCallbacks: optimizedCount,
        optimizationRatio: optimizedCount > 0 ? (optimizedCount / (inlineCount + optimizedCount) * 100).toFixed(1) : 0,
        status: inlineCount > AUDIT_CONFIG.thresholds.unstableCallbacks ? 'NEEDS_ATTENTION' : 'GOOD'
      };

      if (inlineCount > AUDIT_CONFIG.thresholds.unstableCallbacks) {
        this.results.recommendations.push(`Found ${inlineCount} inline callbacks. Consider using useCallback or useStableCallback.`);
      }

      console.log(`   ${inlineCount} inline callbacks, ${optimizedCount} optimized callbacks`);
    } catch (error) {
      console.warn('   Could not scan callbacks:', error.message);
      this.results.details.callbacks = { error: error.message };
    }
  }

  // Check for performance infrastructure usage
  scanPerformanceInfrastructure(dir = AUDIT_CONFIG.srcDir) {
    console.log('🔍 Scanning for performance infrastructure usage...');

    const infrastructure = {
      hotLeafMemoization: 0,
      stableLiterals: 0,
      enhancedCallbacks: 0,
      profilerIntegration: 0,
      guardedState: 0,
    };

    try {
      infrastructure.hotLeafMemoization = parseInt(execSync(`grep -r "hotLeafMemoization\\|createCanvasNodeComponent" ${dir} --include="*.tsx" --include="*.ts" | wc -l`, { encoding: 'utf8' }).trim());
      infrastructure.stableLiterals = parseInt(execSync(`grep -r "useStableLiterals\\|useStableStyle" ${dir} --include="*.tsx" --include="*.ts" | wc -l`, { encoding: 'utf8' }).trim());
      infrastructure.enhancedCallbacks = parseInt(execSync(`grep -r "useEnhancedCallbacks\\|useIntelligentCallbacks" ${dir} --include="*.tsx" --include="*.ts" | wc -l`, { encoding: 'utf8' }).trim());
      infrastructure.profilerIntegration = parseInt(execSync(`grep -r "ReactProfilerIntegration\\|withHotLeafProfiling" ${dir} --include="*.tsx" --include="*.ts" | wc -l`, { encoding: 'utf8' }).trim());
      infrastructure.guardedState = parseInt(execSync(`grep -r "useGuardedState" ${dir} --include="*.tsx" --include="*.ts" | wc -l`, { encoding: 'utf8' }).trim());

      const totalUsage = Object.values(infrastructure).reduce((sum, count) => sum + count, 0);

      this.results.details.infrastructure = {
        ...infrastructure,
        totalUsage,
        adoptionLevel: totalUsage > 10 ? 'HIGH' : totalUsage > 5 ? 'MEDIUM' : 'LOW'
      };

      console.log(`   Performance infrastructure usage: ${totalUsage} instances`);
      Object.entries(infrastructure).forEach(([key, count]) => {
        if (count > 0) console.log(`     ${key}: ${count}`);
      });

    } catch (error) {
      console.warn('   Could not scan infrastructure:', error.message);
      this.results.details.infrastructure = { error: error.message };
    }
  }

  // Generate performance score
  calculateScore() {
    console.log('📊 Calculating performance score...');

    let score = 100;
    const details = this.results.details;

    // Deduct for inline styles
    if (details.inlineStyles?.count > AUDIT_CONFIG.thresholds.inlineStyles) {
      score -= Math.min(30, details.inlineStyles.count - AUDIT_CONFIG.thresholds.inlineStyles);
    }

    // Deduct for poor memoization
    if (details.memoization?.memoizationRate) {
      const rate = parseFloat(details.memoization.memoizationRate);
      if (rate < 50) score -= 25;
      else if (rate < 70) score -= 10;
    }

    // Deduct for inline callbacks
    if (details.callbacks?.inlineCallbacks > AUDIT_CONFIG.thresholds.unstableCallbacks) {
      score -= Math.min(20, details.callbacks.inlineCallbacks - AUDIT_CONFIG.thresholds.unstableCallbacks);
    }

    // Bonus for infrastructure adoption
    if (details.infrastructure?.adoptionLevel === 'HIGH') score += 10;
    else if (details.infrastructure?.adoptionLevel === 'MEDIUM') score += 5;

    this.results.summary.performanceScore = Math.max(0, Math.round(score));

    console.log(`   Performance Score: ${this.results.summary.performanceScore}/100`);
  }

  // Run complete audit
  async runAudit() {
    console.log('🚀 Starting Performance Refactor Audit...\n');

    this.scanInlineStyles();
    this.scanMemoization();
    this.scanCallbackOptimization();
    this.scanPerformanceInfrastructure();
    this.calculateScore();

    // Generate summary
    this.results.summary = {
      ...this.results.summary,
      totalRecommendations: this.results.recommendations.length,
      auditDate: new Date().toLocaleDateString(),
      status: this.results.summary.performanceScore > 80 ? 'EXCELLENT' :
              this.results.summary.performanceScore > 60 ? 'GOOD' :
              this.results.summary.performanceScore > 40 ? 'NEEDS_IMPROVEMENT' : 'CRITICAL'
    };

    console.log('\n📋 Audit Summary:');
    console.log(`   Overall Status: ${this.results.summary.status}`);
    console.log(`   Performance Score: ${this.results.summary.performanceScore}/100`);
    console.log(`   Recommendations: ${this.results.recommendations.length}`);

    return this.results;
  }

  // Save audit results
  saveResults(filename = 'performance-audit-results.json') {
    if (!fs.existsSync(AUDIT_CONFIG.outputDir)) {
      fs.mkdirSync(AUDIT_CONFIG.outputDir, { recursive: true });
    }

    const filepath = path.join(AUDIT_CONFIG.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));

    console.log(`\n💾 Results saved to: ${filepath}`);
    return filepath;
  }

  // Generate markdown report
  generateMarkdownReport() {
    const report = `# Performance Refactor Audit Report

**Generated**: ${this.results.timestamp}
**Status**: ${this.results.summary.status}
**Score**: ${this.results.summary.performanceScore}/100

## Summary

${this.results.recommendations.length > 0 ?
  `### Recommendations (${this.results.recommendations.length})
${this.results.recommendations.map(r => `- ${r}`).join('\n')}` :
  '✅ No critical recommendations found.'}

## Detailed Analysis

### Inline Styles
- **Count**: ${this.results.details.inlineStyles?.count || 'N/A'}
- **Status**: ${this.results.details.inlineStyles?.status || 'N/A'}
- **Threshold**: ${AUDIT_CONFIG.thresholds.inlineStyles}

### Component Memoization
- **Total Components**: ${this.results.details.memoization?.totalComponents || 'N/A'}
- **Memoized**: ${this.results.details.memoization?.memoizedComponents || 'N/A'}
- **Rate**: ${this.results.details.memoization?.memoizationRate || 'N/A'}

### Callback Optimization
- **Inline Callbacks**: ${this.results.details.callbacks?.inlineCallbacks || 'N/A'}
- **Optimized Callbacks**: ${this.results.details.callbacks?.optimizedCallbacks || 'N/A'}

### Performance Infrastructure Adoption
- **Adoption Level**: ${this.results.details.infrastructure?.adoptionLevel || 'N/A'}
- **Total Usage**: ${this.results.details.infrastructure?.totalUsage || 'N/A'}

## Next Steps

${this.results.summary.performanceScore < 70 ?
  '1. Address high-priority recommendations above\n2. Apply systematic performance optimizations\n3. Re-run audit to measure improvements' :
  '1. Monitor performance metrics\n2. Continue applying best practices\n3. Schedule regular audits'}
`;

    const reportPath = path.join(AUDIT_CONFIG.outputDir, 'performance-audit-report.md');
    fs.writeFileSync(reportPath, report);

    console.log(`📄 Markdown report saved to: ${reportPath}`);
    return reportPath;
  }
}

// CLI interface
if (require.main === module) {
  const auditor = new PerformanceAuditor();

  auditor.runAudit()
    .then(results => {
      auditor.saveResults();
      auditor.generateMarkdownReport();

      console.log('\n✅ Performance audit completed successfully!');
      process.exit(results.summary.performanceScore > 70 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    });
}

module.exports = { PerformanceAuditor, AUDIT_CONFIG };