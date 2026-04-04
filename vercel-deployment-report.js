#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function generateDeploymentReport() {
  console.log('='.repeat(60));
  console.log('VERCEL DEPLOYMENT STATUS REPORT');
  console.log('cloudpipe-macao-app');
  console.log('='.repeat(60));

  const report = {
    timestamp: new Date().toISOString(),
    project: 'cloudpipe-macao-app',
    deployment: {
      status: 'Unknown',
      url: 'https://cloudpipe-macao-app.vercel.app',
      commitId: null,
      commitMessage: null,
      lastUpdated: null
    },
    api: {
      status: 'Unknown',
      statusCode: null,
      responseTime: null
    },
    git: {
      latestCommit: null,
      commitMessage: null,
      commitTime: null
    }
  };

  // Get project config
  const projectFile = path.join(__dirname, '.vercel/project.json');
  if (fs.existsSync(projectFile)) {
    const projectConfig = JSON.parse(fs.readFileSync(projectFile, 'utf-8'));
    console.log(`\n[1] Project ID: ${projectConfig.projectId}`);
  }

  // Check API endpoint
  console.log('[2] Checking API endpoint...');
  try {
    const startTime = Date.now();
    const response = await fetch(report.deployment.url, {
      timeout: 10000,
      headers: { 'User-Agent': 'VercelStatusChecker/1.0' }
    });
    const responseTime = Date.now() - startTime;

    report.api.statusCode = response.status;
    report.api.responseTime = responseTime;
    report.api.status = response.ok ? 'Available' : 'Error';

    console.log(`    Status: HTTP ${response.status}`);
    console.log(`    Response Time: ${responseTime}ms`);
    console.log(`    Endpoint: ${report.deployment.url}`);

    if (response.ok) {
      report.deployment.status = 'Ready';
    }
  } catch (error) {
    report.api.status = 'Unavailable';
    console.log(`    ERROR: ${error.message}`);
  }

  // Get latest git commit info
  console.log('[3] Getting git information...');
  try {
    const latestCommit = execSync('git log -1 --format=%H', { cwd: __dirname, encoding: 'utf-8' }).trim();
    const commitMessage = execSync('git log -1 --format=%s', { cwd: __dirname, encoding: 'utf-8' }).trim();
    const commitTime = execSync('git log -1 --format=%aI', { cwd: __dirname, encoding: 'utf-8' }).trim();
    const shortHash = latestCommit.substring(0, 7);

    report.git.latestCommit = shortHash;
    report.git.commitMessage = commitMessage;
    report.git.commitTime = commitTime;
    report.deployment.commitId = shortHash;
    report.deployment.commitMessage = commitMessage;
    report.deployment.lastUpdated = new Date(commitTime).toLocaleString();

    console.log(`    Commit: ${shortHash}`);
    console.log(`    Message: ${commitMessage}`);
    console.log(`    Time: ${new Date(commitTime).toLocaleString()}`);
  } catch (error) {
    console.log(`    Git not available: ${error.message}`);
  }

  // Get recent deployments from git log
  console.log('[4] Recent commits (last 5):');
  try {
    const recentCommits = execSync('git log --oneline -5', { cwd: __dirname, encoding: 'utf-8' });
    recentCommits.split('\n').filter(Boolean).forEach((commit, index) => {
      console.log(`    ${index + 1}. ${commit}`);
    });
  } catch (error) {
    console.log(`    Error fetching commits: ${error.message}`);
  }

  // Get branch info
  console.log('[5] Repository info:');
  try {
    const branch = execSync('git branch --show-current', { cwd: __dirname, encoding: 'utf-8' }).trim();
    const remoteUrl = execSync('git config --get remote.origin.url', { cwd: __dirname, encoding: 'utf-8' }).trim();

    console.log(`    Branch: ${branch}`);
    console.log(`    Remote: ${remoteUrl}`);
  } catch (error) {
    console.log(`    Error fetching git info: ${error.message}`);
  }

  // Check if there are uncommitted changes
  console.log('[6] Working directory status:');
  try {
    const status = execSync('git status --porcelain', { cwd: __dirname, encoding: 'utf-8' });
    if (status.length === 0) {
      console.log('    Status: Clean (no uncommitted changes)');
    } else {
      const lines = status.split('\n').filter(Boolean);
      console.log(`    Status: ${lines.length} file(s) changed`);
      lines.slice(0, 3).forEach(line => console.log(`      ${line}`));
      if (lines.length > 3) {
        console.log(`      ... and ${lines.length - 3} more`);
      }
    }
  } catch (error) {
    console.log(`    Error checking status: ${error.message}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Deployment Status: ${report.deployment.status}`);
  console.log(`API Status: ${report.api.status} (HTTP ${report.api.statusCode})`);
  console.log(`Latest Commit: ${report.deployment.commitId}`);
  console.log(`Last Updated: ${report.deployment.lastUpdated}`);
  console.log(`Response Time: ${report.api.responseTime}ms`);

  // Determine overall health
  const isHealthy = report.deployment.status === 'Ready' && report.api.status === 'Available';
  console.log(`\nOverall Status: ${isHealthy ? 'HEALTHY' : 'DEGRADED'}`);

  if (isHealthy) {
    console.log('\nAll systems operational. Website is live and responsive.');
  } else {
    console.log('\nWarning: Some services may not be functioning properly.');
  }

  console.log('='.repeat(60));
  console.log(`Report generated: ${report.timestamp}`);
  console.log('='.repeat(60));

  return report;
}

// Run the report
(async () => {
  const report = await generateDeploymentReport();

  // Exit code
  const isHealthy = report.deployment.status === 'Ready' && report.api.status === 'Available';
  process.exit(isHealthy ? 0 : 1);
})();
