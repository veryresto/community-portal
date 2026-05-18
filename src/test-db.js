import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env manually
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1].trim()] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function testFetch() {
  // Fetch user_permissions
  const resPerms = await fetch(`${supabaseUrl}/rest/v1/user_permissions?user_id=eq.12f5c93e-2523-4d23-9e09-56b7e26dd40e`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  if (resPerms.ok) {
    const perms = await resPerms.json();
    console.log('User permissions:', perms);
  } else {
    console.error('Failed to fetch user permissions:', await resPerms.text());
  }

  // Fetch governance_events
  const resEvents = await fetch(`${supabaseUrl}/rest/v1/governance_events?target_user_id=eq.12f5c93e-2523-4d23-9e09-56b7e26dd40e`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (resEvents.ok) {
    const events = await resEvents.json();
    console.log('Governance events for target:', events);
  } else {
    console.error('Failed to fetch governance events:', await resEvents.text());
  }
}

testFetch().catch(console.error);
