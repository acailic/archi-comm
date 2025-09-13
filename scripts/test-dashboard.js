#!/usr/bin/env node

// scripts/test-dashboard.js
// Test reporting and metrics dashboard generator
// Creates HTML dashboard from test results and performance data
// RELEVANT FILES: .github/workflows/*.yml, e2e/test-results/

const fs = require('fs');
const path = require('path');

class TestDashboard {
  constructor() {
    this.resultsDir = path.join(__dirname, '../e2e/test-results');
    this.outputDir = path.join(__dirname, '../e2e/dashboard');
    this.templateDir = path.join(__dirname, 'templates');

    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.outputDir, this.templateDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateDashboard() {
    console.log('🚀 Generating E2E Test Dashboard...');

    try {
      // Collect test results
      const testResults = await this.collectTestResults();
      const performanceMetrics = await this.collectPerformanceMetrics();
      const visualResults = await this.collectVisualResults();
      const coverageData = await this.collectCoverageData();

      // Generate dashboard components
      const dashboard = {
        timestamp: new Date().toISOString(),
        summary: this.generateSummary(testResults, performanceMetrics),
        testResults,
        performanceMetrics,
        visualResults,
        coverageData,
        charts: this.generateChartData(testResults, performanceMetrics),
      };

      // Create HTML dashboard
      const htmlContent = this.generateHTML(dashboard);
      const cssContent = this.generateCSS();
      const jsContent = this.generateJS();

      // Write files
      fs.writeFileSync(path.join(this.outputDir, 'index.html'), htmlContent);
      fs.writeFileSync(path.join(this.outputDir, 'dashboard.css'), cssContent);
      fs.writeFileSync(path.join(this.outputDir, 'dashboard.js'), jsContent);
      fs.writeFileSync(path.join(this.outputDir, 'data.json'), JSON.stringify(dashboard, null, 2));

      console.log('✅ Dashboard generated successfully!');
      console.log(`📊 View at: file://${path.join(this.outputDir, 'index.html')}`);

      return dashboard;
    } catch (error) {
      console.error('❌ Dashboard generation failed:', error);
      throw error;
    }
  }

  async collectTestResults() {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
    };

    if (!fs.existsSync(this.resultsDir)) {
      return results;
    }

    // Scan for JSON result files
    const files = fs
      .readdirSync(this.resultsDir)
      .filter(file => file.endsWith('.json'))
      .filter(file => file.includes('results') || file.includes('report'));

    for (const file of files) {
      try {
        const filePath = path.join(this.resultsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (data.suites) {
          // Playwright format
          results.suites.push({
            name: path.basename(file, '.json'),
            file: file,
            ...this.processPlaywrightResults(data),
          });
        }
      } catch (error) {
        console.warn(`Failed to parse ${file}:`, error.message);
      }
    }

    // Calculate totals
    results.suites.forEach(suite => {
      results.total += suite.total;
      results.passed += suite.passed;
      results.failed += suite.failed;
      results.skipped += suite.skipped;
    });

    return results;
  }

  processPlaywrightResults(data) {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: [],
    };

    if (data.suites) {
      data.suites.forEach(suite => {
        this.processSuite(suite, results);
      });
    }

    return results;
  }

  processSuite(suite, results) {
    if (suite.specs) {
      suite.specs.forEach(spec => {
        spec.tests.forEach(test => {
          results.total++;
          results.duration += test.duration || 0;

          const testInfo = {
            title: test.title,
            status: this.getTestStatus(test),
            duration: test.duration || 0,
            file: suite.file || 'unknown',
            line: test.line || 0,
          };

          switch (testInfo.status) {
            case 'passed':
              results.passed++;
              break;
            case 'failed':
              results.failed++;
              testInfo.error = this.extractError(test);
              break;
            case 'skipped':
              results.skipped++;
              break;
          }

          results.tests.push(testInfo);
        });
      });
    }

    if (suite.suites) {
      suite.suites.forEach(nestedSuite => {
        this.processSuite(nestedSuite, results);
      });
    }
  }

  getTestStatus(test) {
    if (test.outcome === 'skipped') return 'skipped';
    if (test.outcome === 'unexpected') return 'failed';
    if (test.outcome === 'expected') return 'passed';
    if (test.status === 'passed') return 'passed';
    if (test.status === 'failed') return 'failed';
    return 'unknown';
  }

  extractError(test) {
    if (test.results && test.results[0] && test.results[0].error) {
      return test.results[0].error.message || 'Unknown error';
    }
    return null;
  }

  async collectPerformanceMetrics() {
    const metrics = {
      scenarios: [],
      benchmarks: [],
    };

    const performanceFiles = fs
      .readdirSync(this.resultsDir)
      .filter(file => file.includes('performance') && file.endsWith('.json'));

    for (const file of performanceFiles) {
      try {
        const filePath = path.join(this.resultsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (data.scenario) {
          metrics.scenarios.push(data);
        } else if (data.benchmarks) {
          metrics.benchmarks.push(...data.benchmarks);
        }
      } catch (error) {
        console.warn(`Failed to parse performance file ${file}:`, error.message);
      }
    }

    return metrics;
  }

  async collectVisualResults() {
    const visual = {
      screenshots: [],
      comparisons: [],
      regressions: [],
    };

    const screenshotsDir = path.join(this.resultsDir, 'screenshots');

    if (fs.existsSync(screenshotsDir)) {
      const screenshots = fs.readdirSync(screenshotsDir).filter(file => file.endsWith('.png'));

      screenshots.forEach(screenshot => {
        const filePath = path.join(screenshotsDir, screenshot);
        const stats = fs.statSync(filePath);

        visual.screenshots.push({
          name: screenshot,
          path: path.relative(this.outputDir, filePath),
          size: stats.size,
          modified: stats.mtime,
        });
      });
    }

    return visual;
  }

  async collectCoverageData() {
    // Placeholder for coverage data
    // This would integrate with actual coverage tools
    return {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    };
  }

  generateSummary(testResults, performanceMetrics) {
    const passRate =
      testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;

    const avgPerformance =
      performanceMetrics.scenarios.length > 0
        ? performanceMetrics.scenarios.reduce((acc, s) => acc + (s.totalDuration || 0), 0) /
          performanceMetrics.scenarios.length
        : 0;

    return {
      passRate: parseFloat(passRate),
      totalTests: testResults.total,
      performanceScore: this.calculatePerformanceScore(performanceMetrics),
      avgTestDuration:
        testResults.suites.length > 0
          ? testResults.suites.reduce((acc, s) => acc + (s.duration || 0), 0) /
            testResults.suites.length
          : 0,
      lastRun: new Date().toISOString(),
    };
  }

  calculatePerformanceScore(metrics) {
    // Simple performance scoring algorithm
    if (metrics.scenarios.length === 0) return 100;

    const scores = metrics.scenarios.map(scenario => {
      if (!scenario.totalDuration) return 100;

      // Score based on duration thresholds
      if (scenario.totalDuration < 1000) return 100;
      if (scenario.totalDuration < 5000) return 80;
      if (scenario.totalDuration < 10000) return 60;
      if (scenario.totalDuration < 20000) return 40;
      return 20;
    });

    return scores.reduce((acc, score) => acc + score, 0) / scores.length;
  }

  generateChartData(testResults, performanceMetrics) {
    return {
      testStatusPie: {
        labels: ['Passed', 'Failed', 'Skipped'],
        data: [testResults.passed, testResults.failed, testResults.skipped],
        colors: ['#28a745', '#dc3545', '#ffc107'],
      },
      performanceTrend: {
        labels: performanceMetrics.scenarios.map(s => s.scenario || 'Unknown'),
        data: performanceMetrics.scenarios.map(s => s.totalDuration || 0),
        colors: ['#007bff'],
      },
      testDurationBar: {
        labels: testResults.suites.map(s => s.name),
        data: testResults.suites.map(s => s.duration || 0),
        colors: ['#17a2b8'],
      },
    };
  }

  generateHTML(dashboard) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ArchiComm E2E Test Dashboard</title>
    <link rel="stylesheet" href="dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <header class="dashboard-header">
        <h1>🧪 ArchiComm E2E Test Dashboard</h1>
        <div class="header-info">
            <span class="last-updated">Last Updated: ${new Date(dashboard.timestamp).toLocaleString()}</span>
        </div>
    </header>

    <main class="dashboard-main">
        <section class="summary-cards">
            <div class="card success">
                <h3>Pass Rate</h3>
                <div class="metric">${dashboard.summary.passRate}%</div>
                <div class="sub-metric">${dashboard.testResults.passed}/${dashboard.testResults.total} tests</div>
            </div>
            
            <div class="card info">
                <h3>Performance Score</h3>
                <div class="metric">${dashboard.summary.performanceScore.toFixed(0)}</div>
                <div class="sub-metric">Based on ${dashboard.performanceMetrics.scenarios.length} scenarios</div>
            </div>
            
            <div class="card warning">
                <h3>Avg Duration</h3>
                <div class="metric">${(dashboard.summary.avgTestDuration / 1000).toFixed(1)}s</div>
                <div class="sub-metric">Per test suite</div>
            </div>
            
            <div class="card primary">
                <h3>Screenshots</h3>
                <div class="metric">${dashboard.visualResults.screenshots.length}</div>
                <div class="sub-metric">Visual test artifacts</div>
            </div>
        </section>

        <section class="charts-grid">
            <div class="chart-container">
                <h3>Test Results Overview</h3>
                <canvas id="testStatusChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h3>Performance by Scenario</h3>
                <canvas id="performanceChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h3>Test Suite Duration</h3>
                <canvas id="durationChart"></canvas>
            </div>
        </section>

        <section class="test-results">
            <h2>Test Results Detail</h2>
            <div class="test-grid">
                ${this.generateTestResultsHTML(dashboard.testResults)}
            </div>
        </section>

        <section class="performance-results">
            <h2>Performance Results</h2>
            <div class="performance-grid">
                ${this.generatePerformanceHTML(dashboard.performanceMetrics)}
            </div>
        </section>

        <section class="visual-results">
            <h2>Visual Test Results</h2>
            <div class="screenshot-gallery">
                ${this.generateVisualHTML(dashboard.visualResults)}
            </div>
        </section>
    </main>

    <script src="dashboard.js"></script>
    <script>
        window.dashboardData = ${JSON.stringify(dashboard)};
        initializeDashboard();
    </script>
</body>
</html>`;
  }

  generateTestResultsHTML(testResults) {
    return testResults.suites
      .map(
        suite => `
      <div class="test-suite ${suite.failed > 0 ? 'has-failures' : 'success'}">
        <h3>${suite.name}</h3>
        <div class="suite-stats">
          <span class="stat passed">${suite.passed} passed</span>
          <span class="stat failed">${suite.failed} failed</span>
          <span class="stat skipped">${suite.skipped} skipped</span>
          <span class="stat duration">${(suite.duration / 1000).toFixed(1)}s</span>
        </div>
        <div class="test-list">
          ${suite.tests
            .map(
              test => `
            <div class="test-item ${test.status}">
              <span class="test-title">${test.title}</span>
              <span class="test-duration">${test.duration}ms</span>
              ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
      )
      .join('');
  }

  generatePerformanceHTML(performanceMetrics) {
    return performanceMetrics.scenarios
      .map(
        scenario => `
      <div class="performance-scenario">
        <h3>${scenario.scenario}</h3>
        <div class="scenario-stats">
          <span class="stat">Components: ${scenario.componentCount || 'N/A'}</span>
          <span class="stat">Annotations: ${scenario.annotationCount || 'N/A'}</span>
          <span class="stat">Duration: ${(scenario.totalDuration / 1000).toFixed(1)}s</span>
          <span class="stat">Pass Rate: ${(scenario.passRate * 100).toFixed(1)}%</span>
        </div>
      </div>
    `
      )
      .join('');
  }

  generateVisualHTML(visualResults) {
    return visualResults.screenshots
      .slice(0, 12)
      .map(
        screenshot => `
      <div class="screenshot-item">
        <img src="${screenshot.path}" alt="${screenshot.name}" loading="lazy">
        <div class="screenshot-info">
          <span class="screenshot-name">${screenshot.name}</span>
          <span class="screenshot-size">${(screenshot.size / 1024).toFixed(1)}KB</span>
        </div>
      </div>
    `
      )
      .join('');
  }

  generateCSS() {
    return `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f8f9fa;
    color: #333;
    line-height: 1.6;
}

.dashboard-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    text-align: center;
}

.dashboard-header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
}

.last-updated {
    opacity: 0.9;
    font-size: 0.9rem;
}

.dashboard-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
}

.card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    border-left: 4px solid;
}

.card.success { border-left-color: #28a745; }
.card.info { border-left-color: #17a2b8; }
.card.warning { border-left-color: #ffc107; }
.card.primary { border-left-color: #007bff; }

.card h3 {
    color: #666;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
}

.card .metric {
    font-size: 3rem;
    font-weight: bold;
    color: #333;
    margin-bottom: 0.5rem;
}

.card .sub-metric {
    color: #888;
    font-size: 0.9rem;
}

.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
}

.chart-container {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
    margin-bottom: 1rem;
    color: #333;
}

.chart-container canvas {
    max-height: 300px;
}

section {
    margin-bottom: 3rem;
}

section h2 {
    margin-bottom: 1.5rem;
    color: #333;
    font-size: 1.8rem;
}

.test-grid, .performance-grid {
    display: grid;
    gap: 1.5rem;
}

.test-suite, .performance-scenario {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #28a745;
}

.test-suite.has-failures {
    border-left-color: #dc3545;
}

.test-suite h3, .performance-scenario h3 {
    margin-bottom: 1rem;
    color: #333;
}

.suite-stats, .scenario-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.stat {
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
}

.stat.passed { background: #d4edda; color: #155724; }
.stat.failed { background: #f8d7da; color: #721c24; }
.stat.skipped { background: #fff3cd; color: #856404; }
.stat.duration { background: #e2e3e5; color: #383d41; }

.test-list {
    margin-top: 1rem;
}

.test-item {
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.test-item:last-child {
    border-bottom: none;
}

.test-item.passed .test-title { color: #28a745; }
.test-item.failed .test-title { color: #dc3545; }
.test-item.skipped .test-title { color: #ffc107; }

.test-duration {
    color: #666;
    font-size: 0.8rem;
}

.test-error {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #f8d7da;
    color: #721c24;
    border-radius: 4px;
    font-size: 0.8rem;
    font-family: monospace;
}

.screenshot-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
}

.screenshot-item {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.screenshot-item img {
    width: 100%;
    height: 150px;
    object-fit: cover;
}

.screenshot-info {
    padding: 1rem;
}

.screenshot-name {
    display: block;
    font-weight: 500;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
}

.screenshot-size {
    color: #666;
    font-size: 0.8rem;
}

@media (max-width: 768px) {
    .dashboard-main {
        padding: 1rem;
    }
    
    .charts-grid {
        grid-template-columns: 1fr;
    }
    
    .suite-stats, .scenario-stats {
        flex-direction: column;
        gap: 0.5rem;
    }
}
`;
  }

  generateJS() {
    return `
function initializeDashboard() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
    }

    const data = window.dashboardData;
    
    // Test Status Pie Chart
    const testStatusCtx = document.getElementById('testStatusChart');
    if (testStatusCtx) {
        new Chart(testStatusCtx, {
            type: 'doughnut',
            data: {
                labels: data.charts.testStatusPie.labels,
                datasets: [{
                    data: data.charts.testStatusPie.data,
                    backgroundColor: data.charts.testStatusPie.colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Performance Chart
    const performanceCtx = document.getElementById('performanceChart');
    if (performanceCtx) {
        new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: data.charts.performanceTrend.labels,
                datasets: [{
                    label: 'Duration (ms)',
                    data: data.charts.performanceTrend.data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Duration (ms)'
                        }
                    }
                }
            }
        });
    }

    // Duration Bar Chart
    const durationCtx = document.getElementById('durationChart');
    if (durationCtx) {
        new Chart(durationCtx, {
            type: 'bar',
            data: {
                labels: data.charts.testDurationBar.labels,
                datasets: [{
                    label: 'Duration (ms)',
                    data: data.charts.testDurationBar.data,
                    backgroundColor: '#17a2b8',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Duration (ms)'
                        }
                    }
                }
            }
        });
    }

    // Add interactive features
    addInteractivity();
}

function addInteractivity() {
    // Add click handlers for test items
    document.querySelectorAll('.test-item').forEach(item => {
        item.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });
    });

    // Add auto-refresh functionality
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Data';
    refreshButton.className = 'refresh-btn';
    refreshButton.style.cssText = \`
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        font-weight: 500;
    \`;
    
    refreshButton.addEventListener('click', () => {
        window.location.reload();
    });
    
    document.body.appendChild(refreshButton);
}

// Export for external use
window.DashboardAPI = {
    refresh: () => window.location.reload(),
    exportData: () => window.dashboardData,
    getTestResults: () => window.dashboardData.testResults,
    getPerformanceMetrics: () => window.dashboardData.performanceMetrics
};
`;
  }
}

// Command line interface
if (require.main === module) {
  const dashboard = new TestDashboard();

  dashboard
    .generateDashboard()
    .then(data => {
      console.log('📈 Dashboard Summary:');
      console.log(`   Pass Rate: ${data.summary.passRate}%`);
      console.log(`   Total Tests: ${data.summary.totalTests}`);
      console.log(`   Performance Score: ${data.summary.performanceScore.toFixed(0)}`);
      console.log(`   Screenshots: ${data.visualResults.screenshots.length}`);
    })
    .catch(error => {
      console.error('Dashboard generation failed:', error);
      process.exit(1);
    });
}

module.exports = TestDashboard;
