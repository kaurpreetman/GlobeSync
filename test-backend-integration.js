#!/usr/bin/env node

/**
 * Backend Integration Test Script
 * 
 * This script tests the integration between the frontend city comparison 
 * feature and the backend trip planning API.
 * 
 * Run with: node test-backend-integration.js
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function testBackendIntegration() {
  console.log('🚀 Starting Backend Integration Test');
  console.log(`🔗 Backend URL: ${BACKEND_URL}`);

  try {
    // Test 1: Check backend health
    console.log('\n📋 Test 1: Backend Health Check');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Backend is healthy:', healthData.status);

    // Test 2: Check system configuration
    console.log('\n📋 Test 2: System Configuration Check');
    const configResponse = await fetch(`${BACKEND_URL}/api/v1/system/config`);
    
    if (!configResponse.ok) {
      throw new Error(`Config check failed: ${configResponse.status}`);
    }
    
    const configData = await configResponse.json();
    console.log('✅ System ready:', configData.system_ready);
    console.log('📊 API Keys Status:', configData.api_keys);

    // Test 3: Start a trip planning request
    console.log('\n📋 Test 3: Trip Planning Request');
    const tripRequest = {
      user_id: `test_user_${Date.now()}`,
      destination: 'Paris',
      start_date: '2024-06-01',
      end_date: '2024-06-07',
      budget: 2500,
      preferences: {
        origin: 'New York',
        budgetLevel: 'medium',
        passengers: 2
      }
    };

    const tripResponse = await fetch(`${BACKEND_URL}/api/v1/trips/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripRequest)
    });

    if (!tripResponse.ok) {
      throw new Error(`Trip planning failed: ${tripResponse.status}`);
    }

    const tripData = await tripResponse.json();
    console.log('✅ Trip planning started:', tripData.trip_id);

    // Test 4: Check trip status
    console.log('\n📋 Test 4: Trip Status Check');
    const statusResponse = await fetch(`${BACKEND_URL}/api/v1/trips/${tripData.trip_id}/status`);
    
    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }
    
    const statusData = await statusResponse.json();
    console.log('✅ Trip status:', statusData.status);
    console.log('📈 Progress:', statusData.progress_percentage + '%');
    console.log('🔄 Current step:', statusData.current_step);
    
    console.log('\n🎉 All tests passed! Backend integration is working correctly.');
    console.log('\n📝 Next Steps:');
    console.log('1. Make sure your backend is running on http://localhost:8000');
    console.log('2. Configure your API keys (GEMINI_API_KEY, WEATHER_API_KEY)');
    console.log('3. Test the city comparison feature in your frontend');

  } catch (error) {
    console.error('\n❌ Backend Integration Test Failed:');
    console.error(error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('1. Make sure the backend server is running on http://localhost:8000');
    console.log('2. Check that all required API keys are configured');
    console.log('3. Verify network connectivity between frontend and backend');
    process.exit(1);
  }
}

// For Node.js environments that don't have fetch
if (typeof fetch === 'undefined') {
  console.log('📦 Installing fetch polyfill...');
  global.fetch = require('node-fetch');
}

testBackendIntegration();