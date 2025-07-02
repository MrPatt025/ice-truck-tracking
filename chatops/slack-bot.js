const { App } = require('@slack/bolt');
const { exec } = require('child_process');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Health check command
app.command('/ice-health', async ({ command, ack, respond }) => {
  await ack();
  
  exec('curl -s http://localhost:5000/api/v1/health', (error, stdout) => {
    if (error) {
      respond(`❌ Health check failed: ${error.message}`);
    } else {
      const health = JSON.parse(stdout);
      respond(`✅ System healthy! Uptime: ${Math.floor(health.uptime)}s, WebSocket clients: ${health.websocket_clients}`);
    }
  });
});

// Deploy command
app.command('/ice-deploy', async ({ command, ack, respond }) => {
  await ack();
  respond('🚀 Starting deployment...');
  
  exec('cd /app && docker-compose up -d --build', (error, stdout, stderr) => {
    if (error) {
      respond(`❌ Deployment failed: ${error.message}`);
    } else {
      respond('✅ Deployment completed successfully!');
    }
  });
});

// System stats command
app.command('/ice-stats', async ({ command, ack, respond }) => {
  await ack();
  
  exec('docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"', (error, stdout) => {
    if (error) {
      respond(`❌ Stats unavailable: ${error.message}`);
    } else {
      respond(`📊 System Stats:\n\`\`\`${stdout}\`\`\``);
    }
  });
});

// Runbook lookup
app.command('/ice-runbook', async ({ command, ack, respond }) => {
  await ack();
  
  const runbooks = {
    'service-down': '🚨 Service Down: 1) Check `docker-compose ps` 2) Restart with `docker-compose restart` 3) Check logs',
    'high-latency': '⚡ High Latency: 1) Check `docker stats` 2) Scale services 3) Clear Redis cache',
    'db-issues': '🗄️ DB Issues: 1) Backup DB 2) Check connections 3) Restart if needed'
  };
  
  const issue = command.text.toLowerCase();
  const solution = runbooks[issue] || 'Available runbooks: service-down, high-latency, db-issues';
  
  respond(solution);
});

// Truck status command
app.command('/ice-trucks', async ({ command, ack, respond }) => {
  await ack();
  
  exec('curl -s http://localhost:5000/api/v1/tracking/trucks', (error, stdout) => {
    if (error) {
      respond(`❌ Cannot fetch trucks: ${error.message}`);
    } else {
      const data = JSON.parse(stdout);
      if (data.success) {
        const active = data.data.filter(t => t.status === 'active').length;
        const total = data.data.length;
        respond(`🚚 Trucks: ${active}/${total} active`);
      } else {
        respond('❌ Failed to fetch truck data');
      }
    }
  });
});

// Start the app
(async () => {
  await app.start(process.env.PORT || 3003);
  console.log('⚡️ Ice Truck ChatOps bot is running!');
})();