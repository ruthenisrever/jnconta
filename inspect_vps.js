const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '187.77.24.105',
      username: 'root',
      password: 'eUKDr.N9eVvQsQYl',
      readyTimeout: 20000
    });
    console.log('✅ Connected to VPS!');
    
    // Check files on VPS
    const check1 = await ssh.execCommand('cat /var/www/jnconta/frontend/app/ia/page.tsx');
    console.log('--- VPS ia/page.tsx ---');
    console.log(check1.stdout.slice(0, 1000));
    console.log('--- END VPS ia/page.tsx ---');
    
    const check2 = await ssh.execCommand('cat /var/www/jnconta/frontend/app/globals.css | grep -i "table" -A 10');
    console.log('--- VPS globals.css table section ---');
    console.log(check2.stdout);
    
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

run();
