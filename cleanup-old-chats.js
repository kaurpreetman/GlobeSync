// Run this with: node cleanup-old-chats.js
// This will delete all existing chats so you can start fresh with the new schema

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://preetkaurpawar8_db_user:cgHndcuK5RlqTSSb@cluster0.nhvlyqr.mongodb.net/';

async function cleanup() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const chats = db.collection('chats');
    
    // Show current chats
    const count = await chats.countDocuments();
    console.log(`Found ${count} existing chats`);
    
    // Delete all chats
    const result = await chats.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} chats`);
    
    console.log('\nAll old chats removed! You can now create new chats with the updated schema.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

cleanup();
