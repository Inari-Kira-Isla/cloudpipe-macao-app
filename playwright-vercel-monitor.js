#!/usr/bin/env node

/**
 * Playwright-based Vercel Dashboard Monitor
 * Demonstrates full browser automation for Vercel deployment monitoring
 *
 * Features:
 * - Dashboard navigation and screenshots
 * - Deployment status detection
 * - Commit information extraction
 * - API endpoint health checks
 * - HTML report generation
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class PlaywrightVercelMonitor {
  constructor() {
    this.projectName = 'cloudpipe-macao-app';
    this.productionUrl = 'https://cloudpipe-macao-app.vercel.app';
    this.screenshotDir = path.join(__dirname, 'screenshots');
    this.ensureScreenshotDir();
  }

  ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async checkProductionEndpoint() {
    console.log('[Step 1] Checking production endpoint...');

    try {
      const startTime = Date.now();
      const response = await fetch(this.productionUrl);
      const responseTime = Date.now() - startTime;

      console.log(`  Status: HTTP ${response.status} in ${responseTime}ms`);
      return {
        status: response.status,
        responseTime: responseTime,
        healthy: response.ok
      };
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      return {
        status: 'Unknown',
        error: error.message,
        healthy: false
      };
    }
  }

  async runBrowserAutomation() {
    console.log('[Step 2] Launching browser for Vercel Dashboard inspection...');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const result = {
      dashboard: null,
      project: null,
      screenshots: []
    };

    try {
      // Try to access Vercel dashboard
      console.log('[Step 3] Navigating to Vercel Dashboard...');

      try {
        await page.goto('https://vercel.com/dashboard', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // Take screenshot
        const dashboardScreenshot = path.join(
          this.screenshotDir,
          `dashboard-${Date.now()}.png`
        );
        await page.screenshot({ path: dashboardScreenshot });
        result.screenshots.push(dashboardScreenshot);

        console.log(`  Dashboard screenshot: ${dashboardScreenshot}`);

        // Check for authenticated state
        const pageContent = await page.content();
        const isAuthenticated = pageContent.includes('cloudpipe') ||
          pageContent.includes('project') ||
          pageContent.includes('deployment');

        result.dashboard = {
          accessible: true,
          authenticated: isAuthenticated,
          url: page.url(),
          screenshot: dashboardScreenshot
        };

        if (!isAuthenticated) {
          console.log('[Step 4] Dashboard accessible but user not authenticated');
          console.log('  (This is expected if Vercel session is not active)');
        } else {
          console.log('[Step 4] Dashboard is authenticated');

          // Try to find and click project
          const projectElements = await page.locator('text=cloudpipe').count();
          if (projectElements > 0) {
            console.log('[Step 5] Found project reference in dashboard');
          }
        }
      } catch (dashboardError) {
        console.log(
          `[Step 3] Could not access dashboard: ${dashboardError.message}`
        );
        result.dashboard = {
          accessible: false,
          error: dashboardError.message
        };
      }

      // Check production domain
      console.log('[Step 6] Testing production endpoint via browser...');

      try {
        const prodResponse = await page.context().request.get(this.productionUrl, {
          timeout: 10000
        });

        console.log(`  Production URL: HTTP ${prodResponse.status()}`);

        result.project = {
          url: this.productionUrl,
          status: prodResponse.status(),
          accessible: prodResponse.ok()
        };
      } catch (prodError) {
        console.log(`  Error accessing production: ${prodError.message}`);
        result.project = {
          url: this.productionUrl,
          error: prodError.message,
          accessible: false
        };
      }

    } finally {
      await browser.close();
    }

    return result;
  }

  generateHTMLReport(data) {
    console.log('[Step 7] Generating HTML report...');

    const timestamp = new Date().toISOString();
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vercel Deployment Monitor - ${this.projectName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header {
            background: linear-gradient(135deg, #000 0%, #222 100%);
            color: white;
            padding: 40px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        header h1 { font-size: 28px; margin-bottom: 10px; }
        header p { opacity: 0.9; font-size: 14px; }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .status-card h3 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #666;
        }
        .status-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
        }
        .status-card .details {
            font-size: 13px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
        .status-card .detail-item {
            margin: 8px 0;
            display: flex;
            justify-content: space-between;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge.success { background: #d4edda; color: #155724; }
        .badge.error { background: #f8d7da; color: #721c24; }
        .badge.warning { background: #fff3cd; color: #856404; }
        .section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        .section p { margin: 8px 0; }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
        .footer {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Vercel Deployment Monitor</h1>
            <p>cloudpipe-macao-app | Generated: ${timestamp}</p>
        </header>

        <div class="status-grid">
            <div class="status-card">
                <h3>Production Endpoint</h3>
                <div class="value">
                    <span class="badge ${data.endpoint.healthy ? 'success' : 'error'}">
                        ${data.endpoint.healthy ? 'READY' : 'DOWN'}
                    </span>
                </div>
                <div class="details">
                    <div class="detail-item">
                        <span>Status Code:</span>
                        <strong>${data.endpoint.status}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Response Time:</span>
                        <strong>${data.endpoint.responseTime}ms</strong>
                    </div>
                </div>
            </div>

            <div class="status-card">
                <h3>Dashboard Access</h3>
                <div class="value">
                    <span class="badge ${data.dashboard.accessible ? 'success' : 'warning'}">
                        ${data.dashboard.accessible ? 'ACCESSIBLE' : 'UNAVAILABLE'}
                    </span>
                </div>
                <div class="details">
                    <div class="detail-item">
                        <span>URL:</span>
                        <strong>${data.dashboard.authenticated ? 'Authenticated' : 'Not Auth'}</strong>
                    </div>
                </div>
            </div>

            <div class="status-card">
                <h3>Latest Status</h3>
                <div class="value">${data.latestCommit.hash}</div>
                <div class="details">
                    <div class="detail-item">
                        <span>Author:</span>
                        <strong>${data.latestCommit.author}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Time:</span>
                        <strong>${new Date(data.latestCommit.timestamp).toLocaleString()}</strong>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Endpoint Details</h2>
            <p><strong>URL:</strong> <code>${data.endpoint.url}</code></p>
            <p><strong>HTTP Status:</strong> ${data.endpoint.status}</p>
            <p><strong>Response Time:</strong> ${data.endpoint.responseTime}ms</p>
            <p><strong>Health Status:</strong> ${data.endpoint.healthy ? '✓ Healthy' : '✗ Unhealthy'}</p>
        </div>

        <div class="section">
            <h2>Latest Deployment</h2>
            <p><strong>Commit:</strong> <code>${data.latestCommit.hash}</code></p>
            <p><strong>Message:</strong> ${data.latestCommit.message}</p>
            <p><strong>Author:</strong> ${data.latestCommit.author}</p>
            <p><strong>Timestamp:</strong> ${new Date(data.latestCommit.timestamp).toLocaleString()}</p>
            <p><strong>Full URL:</strong> <a href="${data.latestCommit.url}" target="_blank">${data.latestCommit.url}</a></p>
        </div>

        <div class="section">
            <h2>Recent Commits</h2>
            <ol>
                ${data.recentCommits.slice(0, 10).map(c => `<li><code>${c.hash}</code> - ${c.message}</li>`).join('')}
            </ol>
        </div>

        <div class="section">
            <h2>Automated Checks Performed</h2>
            <ul>
                <li>Production endpoint HTTP status and response time</li>
                <li>Vercel Dashboard accessibility and authentication state</li>
                <li>Git commit history and deployment tracking</li>
                <li>Browser automation for comprehensive monitoring</li>
            </ul>
        </div>

        <div class="footer">
            <p>Vercel Deployment Monitor | Generated: ${timestamp}</p>
        </div>
    </div>
</body>
</html>
    `;

    const reportPath = path.join(__dirname, 'deployment-report.html');
    fs.writeFileSync(reportPath, html);
    console.log(`  Report saved: ${reportPath}`);
    return reportPath;
  }

  async run() {
    console.log('Playwright-based Vercel Deployment Monitor\n');
    console.log('='.repeat(70));

    try {
      // Step 1: Check endpoint
      const endpoint = await this.checkProductionEndpoint();

      // Step 2: Get git info
      const { execSync } = require('child_process');
      const latestCommit = execSync('git log -1 --format=%H', {
        cwd: __dirname,
        encoding: 'utf-8'
      }).trim();
      const shortHash = latestCommit.substring(0, 7);
      const commitMessage = execSync('git log -1 --format=%s', {
        cwd: __dirname,
        encoding: 'utf-8'
      }).trim();
      const commitTime = execSync('git log -1 --format=%aI', {
        cwd: __dirname,
        encoding: 'utf-8'
      }).trim();
      const authorName = execSync('git log -1 --format=%an', {
        cwd: __dirname,
        encoding: 'utf-8'
      }).trim();

      const recentCommits = execSync('git log --oneline -10', {
        cwd: __dirname,
        encoding: 'utf-8'
      })
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, ...msgParts] = line.split(' ');
          return { hash: hash.substring(0, 7), message: msgParts.join(' ') };
        });

      // Step 3: Run browser automation
      const browserResult = await this.runBrowserAutomation();

      // Step 4: Prepare report data
      const reportData = {
        timestamp: new Date().toISOString(),
        endpoint: {
          url: this.productionUrl,
          ...endpoint
        },
        dashboard: browserResult.dashboard,
        latestCommit: {
          hash: shortHash,
          message: commitMessage,
          author: authorName,
          timestamp: commitTime,
          url: `https://github.com/Inari-Kira-Isla/cloudpipe-macao-app/commit/${latestCommit}`
        },
        recentCommits: recentCommits
      };

      // Step 5: Generate report
      const reportPath = this.generateHTMLReport(reportData);

      // Summary
      console.log('\n' + '='.repeat(70));
      console.log('SUMMARY');
      console.log('='.repeat(70));
      console.log(`Project: ${this.projectName}`);
      console.log(`Status: ${endpoint.healthy ? 'READY' : 'DOWN'}`);
      console.log(`Latest Commit: ${shortHash} (${authorName})`);
      console.log(`Response Time: ${endpoint.responseTime}ms`);
      console.log(`Report: ${reportPath}`);
      console.log('='.repeat(70));

      return endpoint.healthy ? 0 : 1;
    } catch (error) {
      console.error('Error:', error.message);
      return 1;
    }
  }
}

// Run
(async () => {
  const monitor = new PlaywrightVercelMonitor();
  const exitCode = await monitor.run();
  process.exit(exitCode);
})();
