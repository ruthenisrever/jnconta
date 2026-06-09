const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const passwords = ['eUKDr.N9eVvQsQYl', 'Ingeniero66', 'JnConta_Secr3t_2026!', 'ADMIN123!'];

async function run() {
  for (const password of passwords) {
    try {
      console.log(`Trying password: ${password}...`);
      await ssh.connect({
        host: '187.77.24.105',
        username: 'root',
        password: password,
        readyTimeout: 10000
      });
      console.log(`✅ SUCCESS with password: ${password}`);
      ssh.dispose();
      return;
    } catch (err) {
      console.log(`❌ FAILED with password: ${password} (${err.message})`);
    }
  }
}

run();
