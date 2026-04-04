#!/usr/bin/env node

/**
 * Vercel Deployment Monitor
 * Automated monitoring of cloudpipe-macao-app deployment status
 * Supports:
 * - Direct API endpoint health checks
 * - Git commit tracking
 * - Response time measurement
 * - Build status inference
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VercelMonitor {
  constructor() {
    this.projectName = 'cloudpipe-macao-app';
    this.productionUrl = 'https://cloudpipe-macao-app.vercel.app';
    this.report = {
      timestamp: new Date().toISOString(),
      project: this.projectName,
      status: 'Unknown',
      details: {}
    };
  }

  async checkEndpoint() {
    console.log('[Step 1/5] Checking production endpoint...');

    try {
      const start = Date.now();
      const response = await fetch(this.productionUrl, {
        timeout: 15000,
        headers: { 'User-Agent': 'VercelMonitor/1.0' }
      });
      const duration = Date.now() - start;

      this.report.details.endpoint = {
        url: this.productionUrl,
        status: response.status,
        statusText: response.statusText,
        responseTime: duration,
        healthy: response.ok && duration < 5000
      };

      console.log(`  Status: HTTP ${response.status} in ${duration}ms`);
      return response.ok;
    } catch (error) {
      this.report.details.endpoint = {
        url: this.productionUrl,
        status: 'Unknown',
        error: error.message,
        healthy: false
      };

      console.log(`  Error: ${error.message}`);
      return false;
    }
  }

  async getGitInfo() {
    console.log('[Step 2/5] Fetching git commit information...');

    try {
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

      this.report.details.commit = {
        hash: shortHash,
        fullHash: latestCommit,
        message: commitMessage,
        timestamp: commitTime,
        author: authorName,
        url: `https://github.com/Inari-Kira-Isla/cloudpipe-macao-app/commit/${latestCommit}`
      };

      console.log(`  Commit: ${shortHash}`);
      console.log(`  Message: ${commitMessage}`);
      console.log(`  Author: ${authorName}`);

      return true;
    } catch (error) {
      this.report.details.commit = { error: error.message };
      console.log(`  Error: ${error.message}`);
      return false;
    }
  }

  async getRecentActivity() {
    console.log('[Step 3/5] Retrieving recent deployment history...');

    try {
      const recentCommits = execSync('git log --oneline -10', {
        cwd: __dirname,
        encoding: 'utf-8'
      })
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, ...msgParts] = line.split(' ');
          return {
            hash: hash.substring(0, 7),
            message: msgParts.join(' ')
          };
        });

      this.report.details.recentCommits = recentCommits;
      console.log(`  Found ${recentCommits.length} recent commits`);

      // Count commits by day
      const commitsPerDay = {};
      try {
        const logWithDate = execSync('git log --format=%ai --oneline', {
          cwd: __dirname,
          encoding: 'utf-8'
        })
          .split('\n')
          .filter(Boolean);

        logWithDate.forEach((line) => {
          const date = line.split(' ')[0];
          commitsPerDay[date] = (commitsPerDay[date] || 0) + 1;
        });
      } catch (e) {
        // Ignore
      }

      this.report.details.activityTrend = commitsPerDay;
      return true;
    } catch (error) {
      this.report.details.recentCommits = { error: error.message };
      console.log(`  Error: ${error.message}`);
      return false;
    }
  }

  async checkWorkingDirectory() {
    console.log('[Step 4/5] Checking repository status...');

    try {
      const branch = execSync('git branch --show-current', {
        cwd: __dirname,
        encoding: 'utf-8'
      }).trim();

      const status = execSync('git status --porcelain', {
        cwd: __dirname,
        encoding: 'utf-8'
      });

      const changes = status.split('\n').filter(Boolean).length;

      this.report.details.repository = {
        branch: branch,
        uncommittedChanges: changes,
        clean: changes === 0
      };

      console.log(`  Branch: ${branch}`);
      console.log(`  Changes: ${changes} file(s)`);

      return changes === 0;
    } catch (error) {
      this.report.details.repository = { error: error.message };
      console.log(`  Error: ${error.message}`);
      return false;
    }
  }

  async determineDeploymentStatus() {
    console.log('[Step 5/5] Determining deployment status...');

    const endpoint = this.report.details.endpoint;
    const isEndpointHealthy = endpoint && endpoint.healthy;

    let status = 'Unknown';

    if (isEndpointHealthy) {
      status = 'Ready';
    } else if (endpoint && endpoint.status === 'Unknown') {
      status = 'Building';
    } else if (endpoint && endpoint.status >= 500) {
      status = 'Failed';
    } else if (endpoint && endpoint.status >= 400) {
      status = 'Error';
    }

    this.report.status = status;
    console.log(`  Status: ${status}`);

    return status;
  }

  displayReport() {
    console.log('\n' + '='.repeat(70));
    console.log('CLOUDPIPE-MACAO-APP DEPLOYMENT STATUS');
    console.log('='.repeat(70));

    console.log(`\nProject: ${this.report.project}`);
    console.log(`Timestamp: ${this.report.timestamp}`);
    console.log(`Overall Status: ${this.report.status}`);

    // Endpoint status
    if (this.report.details.endpoint) {
      console.log(
        `\nEndpoint Status:`
      );
      console.log(
        `  URL: ${this.report.details.endpoint.url}`
      );
      console.log(
        `  HTTP Status: ${this.report.details.endpoint.status} ${this.report.details.endpoint.statusText || ''}`
      );
      console.log(
        `  Response Time: ${this.report.details.endpoint.responseTime}ms`
      );
      console.log(
        `  Healthy: ${this.report.details.endpoint.healthy ? 'Yes' : 'No'}`
      );
    }

    // Commit info
    if (this.report.details.commit && !this.report.details.commit.error) {
      console.log(
        `\nLatest Deployment:`
      );
      console.log(
        `  Commit: ${this.report.details.commit.hash}`
      );
      console.log(
        `  Message: ${this.report.details.commit.message}`
      );
      console.log(
        `  Author: ${this.report.details.commit.author}`
      );
      console.log(
        `  Time: ${new Date(this.report.details.commit.timestamp).toLocaleString()}`
      );
      console.log(
        `  URL: ${this.report.details.commit.url}`
      );
    }

    // Repository status
    if (this.report.details.repository && !this.report.details.repository.error) {
      console.log(
        `\nRepository:`
      );
      console.log(
        `  Branch: ${this.report.details.repository.branch}`
      );
      console.log(
        `  Uncommitted Changes: ${this.report.details.repository.uncommittedChanges}`
      );
    }

    // Recent activity
    if (
      this.report.details.recentCommits &&
      Array.isArray(this.report.details.recentCommits)
    ) {
      console.log(
        `\nRecent Commits (Last 5):`
      );
      this.report.details.recentCommits.slice(0, 5).forEach((commit, i) => {
        console.log(`  ${i + 1}. ${commit.hash} - ${commit.message}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Summary: ${this.getSummary()}`);
    console.log('='.repeat(70));
  }

  getSummary() {
    const status = this.report.status;
    const responseTime = this.report.details.endpoint?.responseTime || 0;
    const isClean = this.report.details.repository?.clean;

    let summary = `Status is ${status}.`;

    if (status === 'Ready') {
      summary += ` Website is live and responsive (${responseTime}ms).`;
      if (isClean) {
        summary += ' Working directory is clean.';
      }
    } else if (status === 'Building') {
      summary += ' Deployment may be in progress.';
    } else if (status === 'Failed') {
      summary += ' There may be an issue with the deployment.';
    } else {
      summary += ' Unable to determine deployment status.';
    }

    return summary;
  }

  async run() {
    console.log('Vercel Deployment Monitor for cloudpipe-macao-app\n');

    await this.checkEndpoint();
    await this.getGitInfo();
    await this.getRecentActivity();
    await this.checkWorkingDirectory();
    await this.determineDeploymentStatus();

    this.displayReport();

    // Write report to JSON
    const reportPath = path.join(__dirname, '/tmp/deployment-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);

    return this.report.status === 'Ready' ? 0 : 1;
  }
}

// Run
(async () => {
  const monitor = new VercelMonitor();
  const exitCode = await monitor.run();
  process.exit(exitCode);
})();
