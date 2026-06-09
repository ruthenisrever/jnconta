const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to VPS...');
    await ssh.connect({
      host: '187.77.24.105',
      username: 'root',
      password: 'eUKDr.N9eVvQsQYl',
      readyTimeout: 20000
    });
    console.log('✅ Connected to VPS!');

    // Since I can't upload a massive node_modules zip easily and pack_for_vps failed earlier due to missing archiver,
    // I will push code via git if possible, or I will use an alternative.
    // Wait, since the user wants me to do it, I can just install git on VPS, clone it from a public repo, OR use ssh.putDirectory
    // ssh.putDirectory is part of node-ssh but it might be slow for a whole NextJS project.
    console.log('Setting up VPS...');

    // 1. Initial updates
    console.log('Running apt update...');
    await ssh.execCommand('apt-get update -y');
    
    // Check if we can execute simple commands
    const check = await ssh.execCommand('node -v');
    console.log('Node version on VPS:', check.stdout);

    // Let's create the folder
    await ssh.execCommand('mkdir -p /var/www/jnconta');

    console.log('Closing connection...');
    ssh.dispose();
  } catch (error) {
    console.error('Deployment error:', error);
  }
}

deploy();
