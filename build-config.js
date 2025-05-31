#!/usr/bin/env node

/**
 * Build Configuration Script
 * Reads .env file and generates js/config.js for the browser
 */

const fs = require('fs');
const path = require('path');

// Read .env file if it exists
function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(envPath)) {
        console.log('No .env file found. Using manual configuration mode.');
        return {};
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return env;
}

// Generate config.js file
function generateConfigFile(env) {
    const configTemplate = `/**
 * Auto-generated Configuration for WagerWire Simulation
 * Generated from .env file - DO NOT EDIT MANUALLY
 * Run 'npm run build-config' to regenerate
 */

class Config {
    constructor() {
        this.supabaseUrl = null;
        this.supabaseKey = null;
        this.autoConnect = false;
        
        // Load from environment or localStorage
        this.loadConfig();
    }

    /**
     * Load configuration from various sources
     */
    loadConfig() {
        // Option 1: From .env file (auto-generated)
        ${env.SUPABASE_URL ? `this.supabaseUrl = '${env.SUPABASE_URL}';` : '// No SUPABASE_URL in .env'}
        ${env.SUPABASE_ANON_KEY ? `this.supabaseKey = '${env.SUPABASE_ANON_KEY}';` : '// No SUPABASE_ANON_KEY in .env'}
        ${env.AUTO_CONNECT ? `this.autoConnect = ${env.AUTO_CONNECT === 'true'};` : '// AUTO_CONNECT not set'}

        // Option 2: Check for global config override (can be set in HTML)
        if (typeof window !== 'undefined' && window.WAGERWIRE_CONFIG) {
            this.supabaseUrl = window.WAGERWIRE_CONFIG.SUPABASE_URL || this.supabaseUrl;
            this.supabaseKey = window.WAGERWIRE_CONFIG.SUPABASE_ANON_KEY || this.supabaseKey;
            this.autoConnect = window.WAGERWIRE_CONFIG.AUTO_CONNECT || this.autoConnect;
        }

        // Option 3: Load from localStorage (previous session)
        if (typeof localStorage !== 'undefined') {
            const savedUrl = localStorage.getItem('wagerwire_supabase_url');
            const savedKey = localStorage.getItem('wagerwire_supabase_key');
            
            if (savedUrl && savedKey && !this.supabaseUrl) {
                this.supabaseUrl = savedUrl;
                this.supabaseKey = savedKey;
            }
        }

        // Pre-fill UI if credentials are available
        if (this.supabaseUrl && this.supabaseKey) {
            this.prefillUI();
        }
    }

    /**
     * Pre-fill UI with available credentials
     */
    prefillUI() {
        if (typeof document !== 'undefined') {
            const urlInput = document.getElementById('supabaseUrl');
            const keyInput = document.getElementById('supabaseKey');
            
            if (urlInput && this.supabaseUrl) {
                urlInput.value = this.supabaseUrl;
            }
            
            if (keyInput && this.supabaseKey) {
                keyInput.value = '••••••••••••••••'; // Masked for security
                keyInput.dataset.actualKey = this.supabaseKey;
            }

            // Auto-connect if enabled
            if (this.autoConnect) {
                setTimeout(() => {
                    const connectBtn = document.getElementById('connectBtn');
                    if (connectBtn) {
                        connectBtn.click();
                    }
                }, 1000);
            }
        }
    }

    /**
     * Save credentials to localStorage
     * @param {string} url - Supabase URL
     * @param {string} key - Supabase anon key
     * @param {boolean} remember - Whether to remember credentials
     */
    saveCredentials(url, key, remember = false) {
        this.supabaseUrl = url;
        this.supabaseKey = key;

        if (remember && typeof localStorage !== 'undefined') {
            localStorage.setItem('wagerwire_supabase_url', url);
            localStorage.setItem('wagerwire_supabase_key', key);
        }
    }

    /**
     * Clear saved credentials
     */
    clearCredentials() {
        this.supabaseUrl = null;
        this.supabaseKey = null;

        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('wagerwire_supabase_url');
            localStorage.removeItem('wagerwire_supabase_key');
        }
    }

    /**
     * Get current credentials
     * @returns {Object} Credentials object
     */
    getCredentials() {
        return {
            url: this.supabaseUrl,
            key: this.supabaseKey
        };
    }

    /**
     * Check if credentials are available
     * @returns {boolean} Whether credentials are set
     */
    hasCredentials() {
        return !!(this.supabaseUrl && this.supabaseKey);
    }

    /**
     * Validate credentials format
     * @param {string} url - Supabase URL
     * @param {string} key - Supabase anon key
     * @returns {Object} Validation result
     */
    validateCredentials(url, key) {
        const errors = [];

        // Validate URL format
        if (!url) {
            errors.push('Supabase URL is required');
        } else if (!url.match(/^https:\\/\\/[a-zA-Z0-9-]+\\.supabase\\.co$/)) {
            errors.push('Invalid Supabase URL format. Should be: https://your-project.supabase.co');
        }

        // Validate key format
        if (!key) {
            errors.push('Supabase anon key is required');
        } else if (key.length < 100) {
            errors.push('Supabase anon key appears to be too short');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// Create global config instance
const config = new Config();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.wagerwireConfig = config;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}`;

    return configTemplate;
}

// Main execution
function main() {
    console.log('🔧 Building configuration...');
    
    const env = loadEnvFile();
    const configContent = generateConfigFile(env);
    
    // Ensure js directory exists
    const jsDir = path.join(__dirname, 'js');
    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir, { recursive: true });
    }
    
    // Write config file
    const configPath = path.join(jsDir, 'config.js');
    fs.writeFileSync(configPath, configContent);
    
    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
        console.log('✅ Configuration built successfully with credentials from .env');
        console.log(`   URL: ${env.SUPABASE_URL}`);
        console.log(`   Key: ${env.SUPABASE_ANON_KEY.substring(0, 20)}...`);
        console.log(`   Auto-connect: ${env.AUTO_CONNECT || 'false'}`);
    } else {
        console.log('⚠️  Configuration built without credentials');
        console.log('   Create .env file with SUPABASE_URL and SUPABASE_ANON_KEY');
        console.log('   Or use manual configuration in the UI');
    }
}

if (require.main === module) {
    main();
}

module.exports = { loadEnvFile, generateConfigFile }; 