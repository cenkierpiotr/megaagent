const { createClient } = require('redis');

async function test() {
  console.log("Testing process.env.REDIS_URL or default");
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379/0' });
  
  client.on('error', (err) => console.log('Redis Client Error', err));
  
  try {
    await client.connect();
    console.log("Connected successfully to Redis!");
    const pong = await client.ping();
    console.log("PING:", pong);
    await client.disconnect();
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

test();
