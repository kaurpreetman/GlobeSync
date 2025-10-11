/**
 * Migration Script: Convert Chat.user from ObjectId to String
 * 
 * This script migrates existing Chat documents in MongoDB to use
 * string user IDs instead of ObjectId references.
 * 
 * Run with: npx ts-node src/scripts/migrate-chat-user-field.ts
 */

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://preetkaurpawar8_db_user:cgHndcuK5RlqTSSb@cluster0.nhvlyqr.mongodb.net/';

async function migrateChatUserField() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const chatsCollection = db!.collection('chats');

    // Get all chats
    const chats = await chatsCollection.find({}).toArray();
    console.log(`📊 Found ${chats.length} chat documents\n`);

    if (chats.length === 0) {
      console.log('✅ No chats to migrate. Database is clean!');
      await mongoose.disconnect();
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const chat of chats) {
      try {
        // Check if user field is already a string
        if (typeof chat.user === 'string') {
          console.log(`⏭️  Skipping chat ${chat._id} - user field already string: ${chat.user}`);
          skipped++;
          continue;
        }

        // If user is ObjectId, convert to string
        if (chat.user && typeof chat.user === 'object') {
          const userIdString = chat.user.toString();
          
          await chatsCollection.updateOne(
            { _id: chat._id },
            { $set: { user: userIdString } }
          );
          
          console.log(`✅ Migrated chat ${chat._id}: ${chat.user} → ${userIdString}`);
          migrated++;
        }
      } catch (error) {
        console.error(`❌ Error migrating chat ${chat._id}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log(`   Total chats: ${chats.length}`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('\n✅ Migration complete! Disconnected from MongoDB.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateChatUserField();
