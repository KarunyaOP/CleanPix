const fs = require('fs');

if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf8');
  const lines = content.split('\n');
  console.log('Email related lines in .env.local:');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    const keyTrimmed = key.trim();
    if (keyTrimmed.toLowerCase().includes('email') || keyTrimmed.toLowerCase().includes('smtp') || keyTrimmed.toLowerCase().includes('mail')) {
      const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
      console.log(`- Key: "${keyTrimmed}", isSet: ${Boolean(val)}, length: ${val.length}, isLocalhost: ${val.includes('localhost') || val.includes('127.0.0.1')}`);
    }
  });
} else {
  console.log('.env.local does not exist');
}
