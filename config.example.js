/**
 * Example Configuration for WagerWire Simulation
 * Copy this file to config.js and uncomment/modify as needed
 */

// Option 1: Set global config in HTML (recommended for development)
/*
window.WAGERWIRE_CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    AUTO_CONNECT: true  // Automatically connect on page load
};
*/

// Option 2: Environment variables (for Node.js/build tools)
/*
process.env.SUPABASE_URL = 'https://your-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'your-anon-key-here';
*/

// Option 3: Vite environment variables (for Vite build tool)
/*
process.env.VITE_SUPABASE_URL = 'https://your-project.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'your-anon-key-here';
*/

// Instructions:
// 1. Get your Supabase credentials from: https://app.supabase.com/project/your-project/settings/api
// 2. Choose one of the options above
// 3. Replace 'your-project' and 'your-anon-key-here' with actual values
// 4. For production, always use environment variables or secure credential storage 