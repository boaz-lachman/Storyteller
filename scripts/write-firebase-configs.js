#!/usr/bin/env node

/**
 * Build Hook Script for EAS
 * Writes Firebase configuration files from EAS environment variables during build
 * 
 * This script reads the Firebase configuration files from EAS environment variables
 * and writes them to the expected locations in the project root.
 */

const fs = require('fs');
const path = require('path');

const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON;
const GOOGLE_SERVICE_INFO_PLIST = process.env.GOOGLE_SERVICE_INFO_PLIST;

const GOOGLE_SERVICES_JSON_PATH = path.join(__dirname, '..', 'google-services.json');
const GOOGLE_SERVICE_INFO_PLIST_PATH = path.join(__dirname, '..', 'GoogleService-Info.plist');

console.log('Writing Firebase configuration files from EAS environment variables...');

// Helper function to decode base64 or return as-is
function decodeIfBase64(content) {
  if (!content) return null;
  
  // Check if content looks like base64 (only base64 characters and reasonable length)
  const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
  const isLikelyBase64 = base64Regex.test(content.trim()) && content.length > 50;
  
  if (isLikelyBase64) {
    try {
      // Try to decode as base64
      const decoded = Buffer.from(content.trim(), 'base64').toString('utf-8');
      // If decoding produces valid output, use it
      if (decoded.length > 0) {
        console.log('  Detected base64 encoding, decoding...');
        return decoded;
      }
    } catch (error) {
      // If base64 decode fails, it's not base64
      console.log('  Not base64 encoded, using as-is...');
    }
  }
  
  // Return content as-is (it's already plain text)
  return content;
}

// Write google-services.json for Android
if (GOOGLE_SERVICES_JSON) {
  try {
    console.log(`GOOGLE_SERVICES_JSON length: ${GOOGLE_SERVICES_JSON.length} characters`);
    
    // Decode if base64, otherwise use as-is
    let content = decodeIfBase64(GOOGLE_SERVICES_JSON);
    
    if (!content) {
      throw new Error('Content is empty after processing');
    }
    
    // Validate it's valid JSON before writing
    let jsonContent;
    try {
      jsonContent = JSON.parse(content);
      console.log('  ✓ Valid JSON detected');
    } catch (parseError) {
      console.error('  ✗ Invalid JSON detected!');
      console.error(`  Parse error: ${parseError.message}`);
      console.error(`  First 200 chars: ${content.substring(0, 200)}`);
      console.error(`  Last 200 chars: ${content.substring(Math.max(0, content.length - 200))}`);
      throw new Error(`Invalid JSON: ${parseError.message}`);
    }
    
    // Validate required fields
    if (!jsonContent.project_info || !jsonContent.client || !Array.isArray(jsonContent.client) || jsonContent.client.length === 0) {
      throw new Error('JSON is missing required fields (project_info or client array)');
    }
    
    // Write the file
    fs.writeFileSync(GOOGLE_SERVICES_JSON_PATH, JSON.stringify(jsonContent, null, 2), 'utf8');
    console.log('✓ Successfully wrote google-services.json');
  } catch (error) {
    console.error('✗ Error writing google-services.json:', error.message);
    console.error('  Please check that the GOOGLE_SERVICES_JSON environment variable contains the complete, valid JSON content.');
    process.exit(1);
  }
} else {
  console.warn('⚠ GOOGLE_SERVICES_JSON environment variable is not set');
  console.warn('  Android builds may fail without this file');
}

// Write GoogleService-Info.plist for iOS
if (GOOGLE_SERVICE_INFO_PLIST) {
  try {
    console.log(`GOOGLE_SERVICE_INFO_PLIST length: ${GOOGLE_SERVICE_INFO_PLIST.length} characters`);
    
    // Decode if base64, otherwise use as-is
    let content = decodeIfBase64(GOOGLE_SERVICE_INFO_PLIST);
    
    if (!content) {
      throw new Error('Content is empty after processing');
    }
    
    // Validate it looks like XML/PLIST
    if (!content.trim().startsWith('<?xml') && !content.trim().startsWith('<plist')) {
      console.warn('  ⚠ Warning: Content does not appear to be valid XML/PLIST');
      console.warn(`  First 100 chars: ${content.substring(0, 100)}`);
    } else {
      console.log('  ✓ Valid XML/PLIST structure detected');
    }
    
    // Write the file
    fs.writeFileSync(GOOGLE_SERVICE_INFO_PLIST_PATH, content, 'utf8');
    console.log('✓ Successfully wrote GoogleService-Info.plist');
  } catch (error) {
    console.error('✗ Error writing GoogleService-Info.plist:', error.message);
    console.error('  Please check that the GOOGLE_SERVICE_INFO_PLIST environment variable contains the complete, valid PLIST content.');
    process.exit(1);
  }
} else {
  console.warn('⚠ GOOGLE_SERVICE_INFO_PLIST environment variable is not set');
  console.warn('  iOS builds may fail without this file');
}

console.log('Firebase configuration files setup complete!');
