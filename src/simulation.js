/**
 * Main Simulation Logic for WagerWire Betting Simulation
 * Orchestrates character management, bet processing, and real-time updates
 */

export class BettingSimulation {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.updateInterval = null;
        this.updateFrequency = 15000; // 15 seconds instead of 30
        this.lastUpdateTime = new Date().toISOString();
        
        // Character management
        this.characters = {
            'Benny': this.createCharacter('Benny'),
            'Max': this.createCharacter('Max'),
            'Ellie': this.createCharacter('Ellie')
        };
        
        // Active bets tracking
        this.activeBets = new Map();
        
        // Bet queue for feeding existing bets
        this.betQueue = [];
        this.currentBetIndex = 0;
        
        // Renderer
        this.renderer = null;
        
        // Conversation system
        this.conversationHistory = [];
        this.conversationCooldowns = new Map(); // Character pairs and their cooldown timers
        this.conversationChance = 1; // 100% chance per check for nearby characters to talk
        this.conversationRange = 100; // Distance for characters to interact (3D units) - increased from 25
        this.conversationInterval = null; // Separate timer for conversation checking
        
        // Event API endpoint
        this.eventApiEndpoint = 'https://us-central1-pachira-betform.cloudfunctions.net/sofascoreProxy/sofascore-event';
        
        // Audio system
        this.audioEnabled = true;
        this.audioContext = null;
        
        // Initialize
        this.init();
    }

    /**
     * Initialize simulation
     */
    init() {
        this.setupEventListeners();
        this.setupRenderer();
        this.setupLogging();
        this.setupAudio();
        this.updateUI();
        
        this.log('Simulation initialized', 'info');
    }

    /**
     * Create a character object
     * @param {string} name - Character name
     * @returns {Object} Character object
     */
    createCharacter(name) {
        const startingPosition = this.renderer ? 
            this.renderer.getStartingPosition(name) : 
            { x: 100, y: 100 };
            
        return {
            name: name,
            bankroll: 10000,
            state: 'idle',
            position: { ...startingPosition },
            targetPosition: null,
            emotion: { emoji: '😐', state: 'neutral', description: 'Ready to bet' },
            activeBets: [],
            stats: {
                totalBets: 0,
                totalWins: 0,
                totalLosses: 0,
                totalStaked: 0,
                totalPayout: 0,
                netProfit: 0
            }
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Control buttons
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // Supabase connection
        document.getElementById('connectBtn').addEventListener('click', () => this.connectToSupabase());
        document.getElementById('clearCredentialsBtn').addEventListener('click', () => this.clearCredentials());
        
        // Credential input handling
        document.getElementById('supabaseKey').addEventListener('focus', (e) => {
            if (e.target.dataset.actualKey) {
                e.target.value = e.target.dataset.actualKey;
                e.target.type = 'text';
            }
        });
        
        document.getElementById('supabaseKey').addEventListener('blur', (e) => {
            if (e.target.value && e.target.value !== '••••••••••••••••') {
                e.target.dataset.actualKey = e.target.value;
                e.target.value = '••••••••••••••••';
                e.target.type = 'password';
            }
        });
        
        // Show/hide clear button based on saved credentials
        this.updateCredentialUI();
        
        // Supabase logging
        window.addEventListener('supabase-log', (event) => {
            this.log(event.detail.message, event.detail.level);
        });
    }

    /**
     * Setup renderer (Three.js or fallback)
     */
    setupRenderer() {
        // Ensure DOM is ready
        const initRenderer = () => {
            try {
                // Check if the container exists
                const container = document.getElementById('threeContainer');
                if (!container) {
                    throw new Error('threeContainer element not found');
                }
                
                // Try Three.js first
                if (typeof THREE !== 'undefined' && typeof ThreeRenderer !== 'undefined') {
                    console.log('Attempting to initialize Three.js renderer...');
                    
                    // Wait a moment for Three.js to fully load
                    setTimeout(() => {
                        try {
                            this.renderer = new ThreeRenderer('threeContainer');
                            this.rendererType = '3D';
                            this.log('Three.js 3D renderer initialized successfully', 'success');
                            
                            window.simulation = this; // Make simulation accessible to renderer
                            
                            // Create characters in the scene
                            Object.keys(this.characters).forEach(name => {
                                this.renderer.createCharacter(name);
                            });
                            
                            // Update UI to show renderer type
                            this.updateRendererStatus();
                        } catch (threeError) {
                            console.warn('Three.js initialization failed:', threeError.message);
                            this.initFallbackRenderer();
                        }
                    }, 100);
                    
                } else {
                    throw new Error('Three.js or ThreeRenderer not available');
                }
                
            } catch (error) {
                console.warn('Three.js setup failed:', error.message);
                this.initFallbackRenderer();
            }
        };
        
        // Initialize renderer when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initRenderer);
        } else {
            initRenderer();
        }
    }

    /**
     * Initialize fallback renderer
     */
    initFallbackRenderer() {
        this.log('Three.js failed, using fallback 2D renderer', 'warning');
        
        try {
            // Use fallback 2D renderer
            if (typeof FallbackRenderer !== 'undefined') {
                this.renderer = new FallbackRenderer('threeContainer');
                this.rendererType = '2D';
                this.log('2D fallback renderer initialized successfully', 'success');
                
                window.simulation = this; // Make simulation accessible to renderer
                
                // Create 2D characters
                Object.keys(this.characters).forEach(name => {
                    this.renderer.createCharacter(name);
                });
                
                // Update UI to show renderer type
                this.updateRendererStatus();
            } else {
                throw new Error('FallbackRenderer not available');
            }
        } catch (fallbackError) {
            console.error('Fallback renderer also failed:', fallbackError);
            this.log(`Both renderers failed: ${fallbackError.message}`, 'error');
            
            // Last resort: minimal renderer
            this.renderer = {
                getStartingPosition: (name) => ({ x: 0, y: 0, z: 0 }),
                getBookiePosition: () => ({ x: 0, y: 0, z: 0 }),
                getRandomPosition: () => ({ x: Math.random() * 100, y: 0, z: Math.random() * 100 }),
                updateCharacter: () => console.log(`Update character: ${arguments[0]} - ${arguments[1]}`),
                createCharacter: () => console.log(`Create character: ${arguments[0]}`),
                startRoaming: () => console.log('Start roaming'),
                startWalkingFromBookie: () => console.log('Walking from bookie'),
                addBetToTicker: (betText) => console.log(`Ticker: ${betText}`),
                clearTicker: () => console.log('Ticker cleared'),
                reset: () => console.log('Minimal renderer reset'),
                destroy: () => {}
            };
            this.rendererType = 'minimal';
            this.log('Using minimal console-only renderer', 'warning');
            
            // Update UI to show renderer type
            this.updateRendererStatus();
        }
    }

    /**
     * Setup logging system
     */
    setupLogging() {
        this.logsContainer = document.getElementById('logs');
    }

    /**
     * Setup simple audio system
     */
    setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.log('Audio system ready', 'info');
        } catch (error) {
            this.log('Audio not available', 'warning');
            this.audioEnabled = false;
        }
    }

    /**
     * Connect to Supabase
     */
    async connectToSupabase() {
        let url = document.getElementById('supabaseUrl').value.trim();
        let key = document.getElementById('supabaseKey').value.trim();
        
        // If inputs are masked, get actual values
        const keyInput = document.getElementById('supabaseKey');
        if (keyInput.dataset.actualKey) {
            key = keyInput.dataset.actualKey;
        }
        
        // Try to get from config if not provided
        if ((!url || !key) && window.wagerwireConfig) {
            const configCreds = window.wagerwireConfig.getCredentials();
            url = url || configCreds.url;
            key = key || configCreds.key;
        }
        
        if (!url || !key) {
            this.log('Please enter both Supabase URL and key', 'error');
            return;
        }
        
        // Validate credentials format
        const validation = window.wagerwireConfig.validateCredentials(url, key);
        if (!validation.valid) {
            validation.errors.forEach(error => this.log(error, 'error'));
            return;
        }
        
        const connectBtn = document.getElementById('connectBtn');
        const statusEl = document.getElementById('connectionStatus');
        
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        
        try {
            const success = await supabaseClient.connect(url, key);
            
            if (success) {
                statusEl.textContent = 'Connected';
                statusEl.className = 'connection-status connected';
                connectBtn.textContent = 'Connected';
                
                // Save credentials if remember is checked
                const rememberCheckbox = document.getElementById('rememberCredentials');
                if (rememberCheckbox.checked) {
                    window.wagerwireConfig.saveCredentials(url, key, true);
                    this.log('Credentials saved for future sessions', 'info');
                }
                
                this.updateCredentialUI();
                this.log('Successfully connected to Supabase', 'success');
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            statusEl.textContent = 'Connection failed';
            statusEl.className = 'connection-status disconnected';
            connectBtn.textContent = 'Connect to Supabase';
            connectBtn.disabled = false;
            this.log(`Connection failed: ${error.message}`, 'error');
        }
    }

    /**
     * Clear saved credentials
     */
    clearCredentials() {
        if (window.wagerwireConfig) {
            window.wagerwireConfig.clearCredentials();
        }
        
        // Clear UI
        document.getElementById('supabaseUrl').value = '';
        document.getElementById('supabaseKey').value = '';
        document.getElementById('supabaseKey').dataset.actualKey = '';
        document.getElementById('rememberCredentials').checked = false;
        
        // Update UI
        this.updateCredentialUI();
        
        // Disconnect if connected
        if (supabaseClient.isConnected()) {
            supabaseClient.disconnect();
            document.getElementById('connectionStatus').textContent = 'Not connected';
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
            document.getElementById('connectBtn').textContent = 'Connect to Supabase';
            document.getElementById('connectBtn').disabled = false;
        }
        
        this.log('Saved credentials cleared', 'info');
    }

    /**
     * Update credential UI based on saved state
     */
    updateCredentialUI() {
        const clearBtn = document.getElementById('clearCredentialsBtn');
        const hasCredentials = window.wagerwireConfig && window.wagerwireConfig.hasCredentials();
        
        if (hasCredentials) {
            clearBtn.style.display = 'inline-block';
            document.getElementById('rememberCredentials').checked = true;
        } else {
            clearBtn.style.display = 'none';
        }
    }

    /**
     * Start the simulation
     */
    async start() {
        if (this.isRunning) {
            this.log('Simulation is already running', 'warning');
            return;
        }
        
        if (!supabaseClient.isConnected()) {
            this.log('Please connect to Supabase first', 'error');
            return;
        }
        
        try {
            this.log('Starting simulation...', 'info');
            
            // Load existing bets into queue
            const betCount = await this.loadExistingBets();
            if (betCount === 0) {
                this.log('No bets found to simulate', 'warning');
                return;
            }
            
            this.isRunning = true;
            this.isPaused = false;
            
            // Update UI
            this.updateUI();
            
            // Start the update loop
            this.startUpdateLoop();
            
            // Start conversation checking (more frequent than main loop)
            this.startConversationChecking();
            
            // Do an immediate conversation check to test the system
            setTimeout(() => {
                this.log('🧪 Running initial conversation check...', 'info');
                this.checkForConversations();
            }, 2000);
            
            // Populate ticker with actual upcoming bets from database
            this.populateTickerWithUpcomingBets();
            
            this.log(`Simulation started! Will process ${betCount} bets at 15-second intervals`, 'success');
            
        } catch (error) {
            this.log(`Failed to start simulation: ${error.message}`, 'error');
        }
    }

    /**
     * Pause simulation
     */
    pause() {
        this.isPaused = !this.isPaused;
        
        const pauseBtn = document.getElementById('pauseBtn');
        const statusText = document.getElementById('statusText');
        
        if (this.isPaused) {
            pauseBtn.textContent = 'Resume';
            statusText.textContent = 'Paused';
            this.log('Simulation paused', 'warning');
        } else {
            pauseBtn.textContent = 'Pause';
            statusText.textContent = 'Running';
            this.log('Simulation resumed', 'info');
        }
    }

    /**
     * Reset simulation
     */
    reset() {
        this.log('Resetting simulation...', 'info');
        
        // Stop simulation
        this.isRunning = false;
        this.isPaused = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.conversationInterval) {
            clearInterval(this.conversationInterval);
            this.conversationInterval = null;
        }
        
        // Reset characters
        Object.keys(this.characters).forEach(name => {
            this.characters[name] = this.createCharacter(name);
        });
        
        // Clear active bets
        this.activeBets.clear();
        
        // Clear bet queue
        this.betQueue = [];
        this.currentBetIndex = 0;
        
        // Clear conversation history
        this.conversationHistory = [];
        this.conversationCooldowns.clear();
        
        // Clear conversation UI
        const conversationArea = document.getElementById('conversationArea');
        if (conversationArea) {
            conversationArea.innerHTML = '<div class="no-conversations">Characters will chat between bets...</div>';
        }
        
        // Reset renderer
        if (this.renderer) {
            this.renderer.reset();
        }
        
        // Update UI
        this.updateUI();
        
        this.log('Simulation reset', 'success');
    }

    /**
     * Stop simulation
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.conversationInterval) {
            clearInterval(this.conversationInterval);
            this.conversationInterval = null;
        }
        
        // Update UI
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        document.getElementById('statusText').textContent = 'Stopped';
        document.getElementById('nextUpdate').textContent = 'Next update in: --';
    }

    /**
     * Start update loop
     */
    startUpdateLoop() {
        let countdown = this.updateFrequency / 1000;
        
        const updateCountdown = () => {
            if (!this.isRunning) return;
            
            document.getElementById('nextUpdate').textContent = 
                `Next update in: ${countdown}s`;
            
            countdown--;
            
            if (countdown < 0) {
                countdown = this.updateFrequency / 1000;
                if (!this.isPaused) {
                    this.checkForBets();
                }
            }
        };
        
        this.updateInterval = setInterval(updateCountdown, 1000);
        
        // Also set up the main update interval
        setInterval(() => {
            if (this.isRunning && !this.isPaused) {
                this.checkForBets();
            }
        }, this.updateFrequency);
    }

    /**
     * Start conversation checking (more frequent than main betting loop)
     */
    startConversationChecking() {
        // Check for conversations every 5 seconds (much more frequent than betting updates)
        this.conversationInterval = setInterval(() => {
            if (this.isRunning && !this.isPaused) {
                this.checkForConversations();
            }
        }, 5000);
        
        this.log('💬 Conversation checking started (every 5 seconds)', 'info');
    }

    /**
     * Insert test betting data into the characters table
     */
    async insertTestData() {
        if (!supabaseClient.isConnected()) {
            this.log('Please connect to Supabase first', 'error');
            return;
        }

        try {
            this.log('Inserting test betting data...', 'info');
            
            const testBets = [
                {
                    character: "Max 'Stacks' Romano",
                    stake: "200",
                    eventid: 12528892,
                    recommendation: "Back Galatasaray on Asian Handicap -0.5",
                    price: 1.86,
                    selection_combo: "Asian Handicap",
                    selection_line: -0.5,
                    bet_time_score: "0-0"
                },
                {
                    character: "Benny 'the Bankrupt' Doyle",
                    stake: "100",
                    eventid: 13635070,
                    recommendation: "Back Over 2.75 Goals at 1.86",
                    price: 1.86,
                    selection_combo: "Over",
                    selection_line: 2.75,
                    bet_time_score: "0-0"
                },
                {
                    character: "Ellie 'EV' Tanaka",
                    stake: "150",
                    eventid: 12465926,
                    recommendation: "Back Over 4.75 Goals at 2.02",
                    price: 2.02,
                    selection_combo: "Over",
                    selection_line: 4.75,
                    bet_time_score: "0-0"
                },
                {
                    character: "Max 'Stacks' Romano",
                    stake: "250",
                    eventid: 13139248,
                    recommendation: "Back Austria (Women) on Asian Handicap +1.25",
                    price: 1.78,
                    selection_combo: "Asian Handicap",
                    selection_line: 1.25,
                    bet_time_score: "0-0"
                },
                {
                    character: "Benny 'the Bankrupt' Doyle",
                    stake: "75",
                    eventid: 13366862,
                    recommendation: "Back Kerry FC on Asian Handicap -0.75",
                    price: 1.92,
                    selection_combo: "Asian Handicap",
                    selection_line: -0.75,
                    bet_time_score: "0-0"
                }
            ];

            const { data, error } = await supabaseClient.client
                .from('characters')
                .insert(testBets)
                .select();

            if (error) {
                throw error;
            }

            this.log(`Successfully inserted ${data.length} test bets`, 'success');
            return data.length;
        } catch (error) {
            this.log(`Error inserting test data: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Load all existing bets and queue them for simulation
     */
    async loadExistingBets() {
        if (!supabaseClient.isConnected()) {
            this.log('Please connect to Supabase first', 'error');
            return;
        }

        try {
            this.log('Loading existing bets...', 'info');
            
            // Direct query to characters table
            const { data, error, count } = await supabaseClient.client
                .from('characters')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            this.log(`Characters table returned ${count} rows`, 'info');
            
            if (!data || data.length === 0) {
                this.log('Characters table is empty. Would you like to insert test data?', 'warning');
                this.log('Run: simulation.insertTestData() then simulation.start()', 'info');
                return 0;
            }

            // Transform and queue the bets
            this.betQueue = data.map((bet, index) => {
                // Extract simple character name from full name
                let characterName = 'Benny'; // default
                if (bet.character) {
                    if (bet.character.includes('Max') || bet.character.includes('Stacks')) {
                        characterName = 'Max';
                    } else if (bet.character.includes('Ellie') || bet.character.includes('EV')) {
                        characterName = 'Ellie';
                    } else if (bet.character.includes('Benny') || bet.character.includes('Bankrupt')) {
                        characterName = 'Benny';
                    }
                }

                return {
                    id: bet.id,
                    created_at: bet.created_at,
                    character: characterName,
                    stake: bet.stake || '100',
                    eventid: bet.eventid,
                    price: bet.price,
                    selection_combo: bet.recommendation || bet.selection_combo || 'Unknown',
                    selection_line: bet.selection_line || 0,
                    bet_time_score: bet.bet_time_score || '0-0',
                    result: null,
                    originalData: bet
                };
            });

            this.currentBetIndex = 0;
            this.log(`Loaded ${this.betQueue.length} bets for simulation`, 'success');
            
            return this.betQueue.length;
        } catch (error) {
            this.log(`Error loading existing bets: ${error.message}`, 'error');
            console.error('Full error:', error);
            throw error;
        }
    }

    /**
     * Get the next bet from the queue
     * @returns {Object|null} Next bet or null if queue is empty
     */
    getNextQueuedBet() {
        if (this.currentBetIndex >= this.betQueue.length) {
            this.log('All queued bets have been processed', 'info');
            return null;
        }

        const bet = this.betQueue[this.currentBetIndex];
        this.currentBetIndex++;
        
        this.log(`Feeding bet ${this.currentBetIndex}/${this.betQueue.length}: ${bet.character} - ${bet.selection_combo} ${bet.selection_line}`, 'info');
        
        return bet;
    }

    /**
     * Check for new bets and process existing ones
     */
    async checkForBets() {
        if (!supabaseClient.isConnected()) {
            this.log('Not connected to Supabase', 'error');
            return;
        }
        
        try {
            this.log('Checking for bets...', 'info');
            
            // Instead of fetching new bets, get the next queued bet
            const nextBet = this.getNextQueuedBet();
            
            if (nextBet) {
                await this.processNewBet(nextBet);
                this.log(`Processed 1 queued bet`, 'info');
            } else {
                this.log(`No more queued bets to process`, 'info');
            }
            
            // Check status of active bets
            await this.checkActiveBets();
            
            // Update last check time
            this.lastUpdateTime = new Date().toISOString();
            
        } catch (error) {
            this.log(`Error checking bets: ${error.message}`, 'error');
        }
    }

    /**
     * Process a new bet
     * @param {Object} bet - Bet object from database
     */
    async processNewBet(bet) {
        const character = this.characters[bet.character];
        if (!character) {
            this.log(`Unknown character: ${bet.character}`, 'error');
            return;
        }
        
        this.log(`New bet for ${character.name}: ${bet.selection_combo} ${bet.selection_line}`, 'info');
        
        // Add bet to ticker tape
        this.addBetToTicker(bet);
        
        // Add bet to active bets
        this.activeBets.set(bet.id, bet);
        character.activeBets.push(bet.id);
        
        // Start character walking to bookie
        this.startWalkingToBookie(character, bet);
        
        // Update UI to show the new active bet
        this.updateActiveBetsUI();
    }

    /**
     * Add bet information to ticker tape
     * @param {Object} bet - Bet object
     */
    addBetToTicker(bet) {
        // Use the formatted ticker function (not upcoming since this is a live bet)
        this.addBetToTickerFormatted(bet, false);
    }

    /**
     * Populate ticker with actual upcoming bets from database
     */
    populateTickerWithUpcomingBets() {
        if (!this.renderer || !this.renderer.addBetToTicker) return;
        if (!this.betQueue || this.betQueue.length === 0) return;
        
        // Get upcoming bets (next 8-10 bets that haven't been processed yet)
        const upcomingBets = this.betQueue.slice(this.currentBetIndex, this.currentBetIndex + 10);
        
        this.log(`Populating ticker with ${upcomingBets.length} upcoming bets from database`, 'info');
        
        // Clear existing ticker first
        if (this.renderer.clearTicker) {
            this.renderer.clearTicker();
        }
        
        // Add upcoming bets with delays to make it look more realistic
        upcomingBets.forEach((bet, index) => {
            setTimeout(() => {
                this.addBetToTickerFormatted(bet, true);
            }, index * 1000); // 1 second intervals (faster initial population)
        });
    }

    /**
     * Format and add bet to ticker (separate from processNewBet to avoid duplication)
     */
    addBetToTickerFormatted(bet, isUpcoming = false) {
        if (!this.renderer || !this.renderer.addBetToTicker) return;
        
        // Format bet for ticker display
        let tickerText = '';
        
        // Add character emoji
        const characterEmojis = {
            'Benny': '🅱️',
            'Max': '🅜️',
            'Ellie': '🅴️'
        };
        tickerText += characterEmojis[bet.character] || '⚡';
        
        // Add upcoming indicator
        if (isUpcoming) {
            tickerText += ' UPCOMING: ';
        } else {
            tickerText += ' LIVE: ';
        }
        
        // Add character name
        tickerText += `${bet.character} - `;
        
        // Add selection info
        if (bet.selection_combo && bet.selection_line !== undefined && bet.selection_line !== null) {
            if (bet.selection_combo.toLowerCase().includes('over')) {
                tickerText += `Over ${bet.selection_line} Goals`;
            } else if (bet.selection_combo.toLowerCase().includes('under')) {
                tickerText += `Under ${bet.selection_line} Goals`;
            } else if (bet.selection_combo.toLowerCase().includes('handicap') || bet.selection_combo.toLowerCase().includes('asian')) {
                const line = bet.selection_line >= 0 ? `+${bet.selection_line}` : bet.selection_line;
                tickerText += `Handicap ${line}`;
            } else if (bet.selection_combo.toLowerCase().includes('home')) {
                const line = bet.selection_line >= 0 ? `+${bet.selection_line}` : bet.selection_line;
                tickerText += `Home Team ${line}`;
            } else if (bet.selection_combo.toLowerCase().includes('away')) {
                const line = bet.selection_line >= 0 ? `+${bet.selection_line}` : bet.selection_line;
                tickerText += `Away Team ${line}`;
            } else {
                tickerText += `${bet.selection_combo} ${bet.selection_line}`;
            }
        } else if (bet.recommendation) {
            // Use recommendation if available
            tickerText += bet.recommendation.substring(0, 30) + (bet.recommendation.length > 30 ? '...' : '');
        } else {
            tickerText += 'Special Bet';
        }
        
        // Add odds
        if (bet.price) {
            tickerText += ` @ ${bet.price}`;
        }
        
        // Add stake
        if (bet.stake) {
            const stake = typeof bet.stake === 'string' ? 
                parseFloat(bet.stake.replace(/[£$€,]/g, '')) : bet.stake;
            tickerText += ` (£${stake})`;
        }
        
        // Add to ticker
        this.renderer.addBetToTicker(tickerText);
        
        if (isUpcoming) {
            this.log(`Added upcoming bet to ticker: ${tickerText}`, 'info');
        } else {
            this.log(`Added live bet to ticker: ${tickerText}`, 'info');
        }
    }

    /**
     * Start character walking to bookie
     * @param {Object} character - Character object
     * @param {Object} bet - Bet object
     */
    startWalkingToBookie(character, bet) {
        character.state = 'walking_to_bookie';
        character.targetPosition = this.renderer.getBookiePosition();
        character.emotion = { emoji: '🚶', state: 'walking', description: 'Walking to bookie' };
        
        // Update 3D character animation
        this.renderer.updateCharacter(character.name, 'walking_to_bookie', character.emotion, character.position);
        
        // Simulate walking time (2-5 seconds)
        const walkTime = 2000 + Math.random() * 3000;
        
        setTimeout(async () => {
            await this.placeBet(character, bet);
        }, walkTime);
        
        this.updateCharacterUI(character);
    }

    /**
     * Place bet at bookie
     * @param {Object} character - Character object
     * @param {Object} bet - Bet object
     */
    async placeBet(character, bet) {
        character.state = 'placing_bet';
        character.emotion = { emoji: '💰', state: 'placing', description: 'Placing bet' };
        
        // Update 3D character animation
        this.renderer.updateCharacter(character.name, 'placing_bet', character.emotion, character.position);
        
        // Deduct stake from bankroll - fix stake parsing
        let stake = 0;
        if (typeof bet.stake === 'string') {
            // Remove any currency symbols and parse
            stake = parseFloat(bet.stake.replace(/[£$€,]/g, '')) || 100;
        } else if (typeof bet.stake === 'number') {
            stake = bet.stake;
        } else {
            stake = 100; // Default stake
        }
        
        // Store the parsed stake back in the bet object for later use
        bet.parsedStake = stake;
        
        character.bankroll -= stake;
        character.stats.totalStaked += stake;
        character.stats.totalBets++;
        
        this.log(`${character.name} placed bet of £${stake}`, 'success');
        
        // Play bet placed sound
        this.playBeep(600, 150);
        
        // Mark bet as placed in database (this now just logs)
        try {
            await supabaseClient.markBetPlaced(bet.id);
        } catch (error) {
            this.log(`Error marking bet as placed: ${error.message}`, 'error');
        }
        
        // Return to starting position and wait for event to finish
        setTimeout(() => {
            character.state = 'idle';
            character.position = this.renderer.getStartingPosition(character.name);
            character.targetPosition = null;
            character.emotion = { emoji: '🤞', state: 'waiting', description: 'Waiting for result' };
            // Update 3D character to waiting state
            this.renderer.updateCharacter(character.name, 'idle', character.emotion, character.position);
            this.updateCharacterUI(character);
        }, 1000);
        
        this.updateCharacterUI(character);
    }

    /**
     * Check status of active bets
     */
    async checkActiveBets() {
        if (this.activeBets.size === 0) {
            return; // No active bets to check
        }
        
        this.log(`Checking ${this.activeBets.size} active bets...`, 'info');
        
        for (const [betId, bet] of this.activeBets) {
            try {
                await this.checkBetStatus(bet);
            } catch (error) {
                this.log(`Error checking bet ${betId}: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Check individual bet status
     * @param {Object} bet - Bet object
     */
    async checkBetStatus(bet) {
        if (!bet.eventid) {
            this.log(`No event ID for bet ${bet.id}`, 'warning');
            return;
        }
        
        try {
            // Fetch event status from API
            this.log(`Checking event ${bet.eventid} status...`, 'info');
            const response = await fetch(`${this.eventApiEndpoint}?eventId=${bet.eventid}`);
            
            if (!response.ok) {
                this.log(`API request failed for event ${bet.eventid}: ${response.status}`, 'warning');
                return;
            }
            
            const eventData = await response.json();
            
            if (!eventData || eventData.length === 0) {
                this.log(`No event data for event ${bet.eventid}`, 'warning');
                return;
            }
            
            const event = eventData[0];
            const character = this.characters[bet.character];
            
            // Debug: Log the actual API response structure
            console.log(`Event ${bet.eventid} data:`, event);
            this.log(`Event ${bet.eventid} status: ${event.status}`, 'info');
            
            // Debug: Log score information for troubleshooting
            if (event.score) {
                this.log(`Event ${bet.eventid} has score field: "${event.score}"`, 'info');
            } else if (event.homeScore !== undefined || event.awayScore !== undefined) {
                this.log(`Event ${bet.eventid} has individual scores: ${event.homeScore}-${event.awayScore}`, 'info');
            } else {
                this.log(`Event ${bet.eventid} has no score information available`, 'warning');
            }
            
            if (
                (event.status === 'finished' && (event.score || event.homeScore !== undefined)) ||
                event.status === 'canceled'
            ) {
                // Bet is finished, settle it
                this.log(`Event ${bet.eventid} is finished, settling bet...`, 'info');
                await this.settleBet(bet, event, character);
            } else if (event.status === 'inprogress' && (event.score || event.homeScore !== undefined)) {
                // Bet is in progress, update character emotion based on current prediction
                this.log(`Event ${bet.eventid} is in progress, updating emotions...`, 'info');
                this.updateInProgressBet(bet, event, character);
            } else {
                // Event hasn't started yet or no score available
                this.log(`Event ${bet.eventid} hasn't started yet (status: ${event.status})`, 'info');
                character.emotion = { emoji: '⏳', state: 'waiting', description: 'Waiting for match to start' };
                this.updateCharacterUI(character);
            }
            
        } catch (error) {
            this.log(`Error fetching event data for ${bet.eventid}: ${error.message}`, 'error');
        }
    }

    /**
     * Settle a finished bet
     * @param {Object} bet - Bet object
     * @param {Object} event - Event data from API
     * @param {Object} character - Character object
     */
    async settleBet(bet, event, character) {
        // Use parsed stake if available
        const stake = bet.parsedStake || 100;
    
        // 🛑 Handle canceled event as Push
        if (event.status === 'canceled') {
            this.log(`Event ${bet.eventid} was canceled. Marking bet as Push`, 'warning');
    
            const result = 'Push - Canceled Event';
            const payout = stake;
    
            character.bankroll += payout;
            character.stats.totalPayout += payout;
            character.stats.totalBets++;
    
            character.emotion = getEmotionFromResult(result);
            character.state = character.emotion.state;
    
            this.renderer.updateCharacter(character.name, character.state, character.emotion, character.position);
    
            this.activeBets.delete(bet.id);
            character.activeBets = character.activeBets.filter(id => id !== bet.id);
    
            await supabaseClient.settleBet(bet.id, result, payout);
    
            // UI refresh
            this.updateCharacterUI(character);
            this.updateActiveBetsUI();
    
            return;
        }
    
        // ✅ Regular settlement for finished event
        let finalScore;
        if (event.score) {
            // API returns score as "5 - 0" format, normalize it to "5-0"
            finalScore = event.score.replace(/\s+/g, '');
        } else if (event.homeScore !== undefined && event.awayScore !== undefined) {
            // Fallback to individual score fields
            finalScore = `${event.homeScore}-${event.awayScore}`;
        } else {
            // Last resort fallback
            finalScore = `${event.homeScore || 0}-${event.awayScore || 0}`;
        }
        this.log(`Settling bet for event ${bet.eventid}: Final score ${finalScore}`, 'info');
    
        // Extract selectionCombo (fallback if undefined)
        let selectionCombo = bet.Bet_Selection || bet.bet_selection;
        if (!selectionCombo) {
            const rec = (bet.selection_combo || bet.recommendation || '').toLowerCase();
            if (rec.includes('over')) selectionCombo = 'Over';
            else if (rec.includes('under')) selectionCombo = 'Under';
            else if (rec.includes('handicap') || rec.includes('home')) selectionCombo = bet.selection_line >= 0 ? 'Away Team' : 'Home Team';
            else selectionCombo = 'Home Team';
        }
    
        // Normalize common variants
        if (selectionCombo === 'Home') selectionCombo = 'Home Team';
        if (selectionCombo === 'Away') selectionCombo = 'Away Team';
    
        this.log(`Using selection: ${selectionCombo} with line ${bet.selection_line}`, 'info');
    
        const result = calculateEnhancedPredictedResult(
            selectionCombo,
            bet.selection_line,
            bet.bet_time_score,
            finalScore
        );
    
        this.log(`Bet result calculated: ${result}`, 'info');
    
        const payout = calculatePayout(result, stake, bet.price);
        this.log(`Payout: £${payout} from stake £${stake} @ ${bet.price}`, 'info');
    
        character.bankroll += payout;
        character.stats.totalPayout += payout;
        character.stats.totalBets++;
        character.stats.netProfit = character.stats.totalPayout - character.stats.totalStaked;
    
        if (result.startsWith('Win')) character.stats.totalWins++;
        if (result.startsWith('Loss')) character.stats.totalLosses++;
    
        character.emotion = getEmotionFromResult(result);
        character.state = character.emotion.state;
    
        this.renderer.updateCharacter(character.name, character.state, character.emotion, character.position);
    
        // Audio cues
        if (result.startsWith('Win')) this.playBeep(800, 200);
        else if (result.startsWith('Loss')) this.playBeep(300, 300);
        else this.playBeep(500, 150);
    
        // Cleanup
        this.activeBets.delete(bet.id);
        character.activeBets = character.activeBets.filter(id => id !== bet.id);
    
        await supabaseClient.settleBet(bet.id, result, payout);
    
        setTimeout(() => {
            character.state = 'idle';
            character.emotion = { emoji: '😐', state: 'neutral', description: 'Ready for next bet' };
            this.renderer.updateCharacter(character.name, 'idle', character.emotion, character.position);
            this.updateCharacterUI(character);
        }, 5000);
    
        this.updateCharacterUI(character);
        this.updateActiveBetsUI();
    }

    /**
     * Update in-progress bet
     * @param {Object} bet - Bet object
     * @param {Object} event - Event data from API
     * @param {Object} character - Character object
     */
    updateInProgressBet(bet, event, character) {
        // Use YOUR betting engine to calculate current prediction
        let currentScore;
        if (event.score) {
            // API returns score as "5 - 0" format, normalize it to "5-0"
            currentScore = event.score.replace(/\s+/g, '');
        } else if (event.homeScore !== undefined && event.awayScore !== undefined) {
            // Fallback to individual score fields
            currentScore = `${event.homeScore}-${event.awayScore}`;
        } else {
            // Last resort fallback
            currentScore = `${event.homeScore || 0}-${event.awayScore || 0}`;
        }
        
        this.log(`In-progress bet for event ${bet.eventid}: Current score ${currentScore}`, 'info');
        
        // Use the Bet_Selection field if available, otherwise try to map selection_combo
        let selectionCombo = bet.Bet_Selection || bet.bet_selection;
        
        if (!selectionCombo) {
            // Fallback: try to extract from selection_combo or recommendation
            const rec = (bet.selection_combo || bet.recommendation || '').toLowerCase();
            if (rec.includes('over')) {
                selectionCombo = 'Over';
            } else if (rec.includes('under')) {
                selectionCombo = 'Under';
            } else if (rec.includes('home') || rec.includes('handicap')) {
                // For handicap bets, we need to determine home vs away
                selectionCombo = bet.selection_line >= 0 ? 'Away Team' : 'Home Team';
            } else {
                selectionCombo = 'Home Team'; // Default fallback
            }
        }
        
        // Map common variations to expected format
        if (selectionCombo === 'Home') selectionCombo = 'Home Team';
        if (selectionCombo === 'Away') selectionCombo = 'Away Team';
        
        const prediction = calculateEnhancedPredictedResult(
            selectionCombo,
            bet.selection_line,
            bet.bet_time_score,
            currentScore
        );
        
        this.log(`In-progress prediction: ${prediction}`, 'info');
        
        // Update character emotion based on prediction using YOUR emotion system
        const emotion = getInProgressEmotion(prediction);
        character.emotion = emotion;
        character.state = emotion.state;
        
        // Update 3D character animation for in-progress state
        this.renderer.updateCharacter(character.name, emotion.state, emotion, character.position);
        
        this.log(`${character.name} bet in progress: ${prediction}`, 'info');
        
        this.updateCharacterUI(character);
    }

    /**
     * Update character UI
     * @param {Object} character - Character object
     */
    updateCharacterUI(character) {
        const card = document.querySelector(`[data-character="${character.name}"]`);
        if (!card) return;
        
        // Update bankroll
        const bankrollEl = card.querySelector('.bankroll');
        if (bankrollEl) {
            bankrollEl.textContent = `£${character.bankroll.toLocaleString()}`;
        }
        
        // Update status
        const statusEl = card.querySelector('.status');
        if (statusEl) {
            statusEl.textContent = this.getStatusText(character.state);
        }
        
        // Update emotion
        const emotionEl = card.querySelector('.emotion');
        if (emotionEl) {
            emotionEl.textContent = character.emotion.emoji || '😐';
        }
        
        // Add animation class based on state
        card.className = `character-card ${character.state}`;
    }

    /**
     * Get status text for character state
     * @param {string} state - Character state
     * @returns {string} Status text
     */
    getStatusText(state) {
        const statusMap = {
            'idle': 'Idle',
            'walking_to_bookie': 'Walking to bookie',
            'placing_bet': 'Placing bet',
            'joy': 'Celebrating win!',
            'anger': 'Lost bet',
            'hopeful': 'Feeling hopeful',
            'worried': 'Feeling worried',
            'neutral': 'Neutral'
        };
        
        return statusMap[state] || 'Unknown';
    }

    /**
     * Update active bets UI
     */
    updateActiveBetsUI() {
        const container = document.getElementById('activeBets');
        
        if (this.activeBets.size === 0) {
            container.innerHTML = '<div class="no-bets">No active bets</div>';
            return;
        }
        
        this.log(`Updating Active Bets UI with ${this.activeBets.size} bets`, 'info');
        
        const betsHtml = Array.from(this.activeBets.values()).map(bet => {
            const stake = bet.parsedStake || bet.stake || '100';
            return `
                <div class="bet-item">
                    <div class="bet-header">
                        <strong>${bet.character}</strong>
                        <span>£${stake}</span>
                    </div>
                    <div class="bet-details">
                        ${bet.selection_combo} ${bet.selection_line} @ ${bet.price}
                    </div>
                    <div class="bet-event">
                        Event ID: ${bet.eventid}
                    </div>
                    <div class="bet-status">
                        Status: Waiting for result...
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = betsHtml;
    }

    /**
     * Update renderer status in UI
     */
    updateRendererStatus() {
        const statusText = document.getElementById('statusText');
        if (statusText && this.rendererType) {
            const rendererInfo = {
                '3D': '🌐 3D Mode (Three.js)',
                '2D': '🎨 2D Mode (Canvas)',
                'minimal': '📱 Text Mode Only'
            };
            
            const currentText = statusText.textContent;
            const rendererStatus = rendererInfo[this.rendererType] || '❓ Unknown';
            
            // Only update if not already showing
            if (!currentText.includes('Mode')) {
                statusText.textContent = `${currentText} - ${rendererStatus}`;
            }
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update control buttons
        document.getElementById('startBtn').disabled = this.isRunning;
        document.getElementById('pauseBtn').disabled = !this.isRunning || this.isPaused;
        document.getElementById('resetBtn').disabled = false;
        
        // Update status
        let status = 'Stopped';
        if (this.isRunning && this.isPaused) {
            status = 'Paused';
        } else if (this.isRunning) {
            status = 'Running';
        }
        document.getElementById('statusText').textContent = status;
        
        // Update queue status
        if (this.betQueue.length > 0) {
            const remaining = this.betQueue.length - this.currentBetIndex;
            document.getElementById('statusText').textContent = 
                `${status} - ${remaining}/${this.betQueue.length} bets remaining`;
        }
        
        // Update character cards
        Object.keys(this.characters).forEach(name => {
            const character = this.characters[name];
            const card = document.querySelector(`[data-character="${name}"]`);
            if (card) {
                // Fix the bankroll display
                const bankrollEl = card.querySelector('.bankroll');
                if (bankrollEl) {
                    bankrollEl.textContent = `£${character.bankroll.toLocaleString()}`;
                }
                
                // Fix the status display
                const statusEl = card.querySelector('.status');
                if (statusEl) {
                    statusEl.textContent = this.getStatusText(character.state);
                }
                
                // Fix the emotion display
                const emotionEl = card.querySelector('.emotion');
                if (emotionEl) {
                    emotionEl.textContent = character.emotion.emoji || '😐';
                }
            }
        });
        
        // Update active bets
        this.updateActiveBetsUI();
    }

    /**
     * Log message to console and UI
     * @param {string} message - Log message
     * @param {string} level - Log level
     */
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
        
        // Add to UI logs
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${level}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            ${message}
        `;
        
        this.logsContainer.appendChild(logEntry);
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        
        // Keep only last 100 log entries
        while (this.logsContainer.children.length > 100) {
            this.logsContainer.removeChild(this.logsContainer.firstChild);
        }
    }

    /**
     * Cleanup simulation
     */
    destroy() {
        this.stop();
        if (this.renderer) {
            this.renderer.destroy();
        }
        if (supabaseClient.isConnected()) {
            supabaseClient.disconnect();
        }
    }

    /**
     * Manual method to load bets (can be called from console)
     */
    async loadBetsManually() {
        try {
            const count = await this.loadExistingBets();
            console.log(`Loaded ${count} bets into queue`);
            console.log('Preview of first 5 bets:', this.betQueue.slice(0, 5));
            console.log('Call simulation.start() to begin feeding bets every 15 seconds');
            return count;
        } catch (error) {
            console.error('Error loading bets:', error);
            throw error;
        }
    }

    /**
     * Get queue status (can be called from console)
     */
    getQueueStatus() {
        return {
            totalBets: this.betQueue.length,
            processed: this.currentBetIndex,
            remaining: this.betQueue.length - this.currentBetIndex,
            nextBet: this.currentBetIndex < this.betQueue.length ? this.betQueue[this.currentBetIndex] : null
        };
    }

    /**
     * Find which table contains the betting data
     */
    async findDataTable() {
        if (!supabaseClient.isConnected()) {
            this.log('Please connect to Supabase first', 'error');
            return;
        }

        const tablesToCheck = ['characters', 'bets', 'betting_data', 'predictions', 'wagers', 'matches', 'events'];
        
        for (const tableName of tablesToCheck) {
            try {
                console.log(`Checking table: ${tableName}`);
                const { data, error, count } = await supabaseClient.client
                    .from(tableName)
                    .select('*', { count: 'exact' })
                    .limit(5);
                
                if (!error && data && data.length > 0) {
                    console.log(`✅ Found data in table '${tableName}':`, {
                        rowCount: count,
                        sampleData: data[0],
                        columns: Object.keys(data[0])
                    });
                } else if (!error) {
                    console.log(`⚪ Table '${tableName}' exists but is empty (${count} rows)`);
                } else {
                    console.log(`❌ Table '${tableName}' doesn't exist or error:`, error.message);
                }
            } catch (err) {
                console.log(`❌ Error checking table '${tableName}':`, err.message);
            }
        }
    }

    /**
     * Play a simple beep sound
     * @param {number} frequency - Frequency in Hz
     * @param {number} duration - Duration in milliseconds
     */
    playBeep(frequency = 800, duration = 100) {
        if (!this.audioEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        } catch (error) {
            // Silently fail if audio doesn't work
        }
    }

    // ===========================================
    // CONVERSATION SYSTEM
    // ===========================================

    /**
     * Conversation topics and dialogue
     */
    getConversationTopics() {
        return {
            general: {
                title: "General Chat",
                class: "general",
                dialogues: [
                    { 
                        starter: "{character1}", 
                        text: "Beautiful day for some betting, eh {character2}?",
                        response: "Absolutely! Though I hope my luck is better today than yesterday."
                    },
                    { 
                        starter: "{character1}", 
                        text: "How's your bankroll looking, {character2}?",
                        response: "Could be better, but I'm still in the game. You?"
                    },
                    { 
                        starter: "{character1}", 
                        text: "Seen any good odds lately?",
                        response: "I've been watching the Asian Handicap markets. Some real value there."
                    },
                    {
                        starter: "{character1}",
                        text: "This weather is perfect for outdoor matches!",
                        response: "True! I always feel like over bets hit more on sunny days."
                    }
                ]
            },
            betting: {
                title: "Betting Strategy",
                class: "betting",
                dialogues: [
                    {
                        starter: "{character1}",
                        text: "I'm thinking of backing the underdog today. What do you think?",
                        response: "Risky move! But sometimes the biggest upsets come from nowhere."
                    },
                    {
                        starter: "{character1}",
                        text: "Asian Handicap or straight win? I can't decide...",
                        response: "Handicap gives you better value, but straight wins are easier to predict."
                    },
                    {
                        starter: "{character1}",
                        text: "Over/Under markets are looking juicy today!",
                        response: "I love totals betting! Much easier than picking winners sometimes."
                    },
                    {
                        starter: "{character1}",
                        text: "Should I hedge my position or let it ride?",
                        response: "Depends on your risk tolerance. I usually let winners run!"
                    }
                ]
            },
            celebration: {
                title: "Celebrating Wins",
                class: "celebration",
                dialogues: [
                    {
                        starter: "{character1}",
                        text: "Yes! That Over 2.5 just hit in the 89th minute!",
                        response: "Nice one! Those late goals are the best feeling in the world!"
                    },
                    {
                        starter: "{character1}",
                        text: "My handicap bet is looking great so far!",
                        response: "Nothing beats that feeling when your pick is ahead early!"
                    },
                    {
                        starter: "{character1}",
                        text: "Three wins in a row! I'm on fire today!",
                        response: "Keep that momentum going! Though don't get too cocky..."
                    },
                    {
                        starter: "{character1}",
                        text: "The odds were against me but I knew it would hit!",
                        response: "That's the beauty of betting - sometimes gut feelings pay off big!"
                    }
                ]
            },
            commiseration: {
                title: "Bad Luck",
                class: "commiseration",
                dialogues: [
                    {
                        starter: "{character1}",
                        text: "Can you believe that? Lost by half a goal...",
                        response: "Oof, that's the worst! Asian Handicap losses sting the most."
                    },
                    {
                        starter: "{character1}",
                        text: "My Over bet would have hit if not for that red card!",
                        response: "Red cards kill so many Over bets. Just bad luck, mate."
                    },
                    {
                        starter: "{character1}",
                        text: "I'm having the worst run of luck this week...",
                        response: "We've all been there. Sometimes you just have to ride out the storm."
                    },
                    {
                        starter: "{character1}",
                        text: "That was such an obvious fix! No way that was natural!",
                        response: "Ha! We all blame corruption when our bets don't hit. It happens!"
                    }
                ]
            }
        };
    }

    /**
     * Check for nearby characters and potentially start conversations
     */
    checkForConversations() {
        if (!this.renderer) {
            this.log('No renderer available for conversation checking', 'warning');
            return;
        }

        const characterNames = Object.keys(this.characters);
        const now = Date.now();

        this.log(`🔍 Checking conversations for ${characterNames.length} characters...`, 'info');

        // Check all character pairs
        for (let i = 0; i < characterNames.length; i++) {
            for (let j = i + 1; j < characterNames.length; j++) {
                const char1Name = characterNames[i];
                const char2Name = characterNames[j];
                const char1 = this.characters[char1Name];
                const char2 = this.characters[char2Name];

                // Debug: Log character positions and states
                this.log(`📍 ${char1Name}: pos(${char1.position.x.toFixed(1)}, ${char1.position.z || 0}) state: ${char1.state}`, 'info');
                this.log(`📍 ${char2Name}: pos(${char2.position.x.toFixed(1)}, ${char2.position.z || 0}) state: ${char2.state}`, 'info');

                // Skip if either character is busy with betting activities
                if (this.isCharacterBusy(char1) || this.isCharacterBusy(char2)) {
                    this.log(`⏸️ ${char1Name} or ${char2Name} is busy (${char1.state}, ${char2.state})`, 'info');
                    continue;
                }

                // Check cooldown (characters can't chat too frequently)
                const pairKey = [char1Name, char2Name].sort().join('-');
                const lastConversation = this.conversationCooldowns.get(pairKey) || 0;
                const timeSinceLastChat = now - lastConversation;
                if (timeSinceLastChat < 10000) { // 10 second cooldown (reduced from 30)
                    this.log(`🕒 ${char1Name}-${char2Name} still on cooldown (${(10000 - timeSinceLastChat)/1000}s remaining)`, 'info');
                    continue;
                }

                // Check if characters are close enough to chat
                const distance = this.getCharacterDistance(char1, char2);
                this.log(`📏 Distance between ${char1Name} and ${char2Name}: ${distance.toFixed(1)} units (max: ${this.conversationRange})`, 'info');
                
                if (this.areCharactersNearby(char1, char2)) {
                    this.log(`✅ ${char1Name} and ${char2Name} are close enough to chat!`, 'success');
                    // Random chance for conversation
                    if (Math.random() < this.conversationChance) {
                        this.log(`🎲 Conversation chance hit! Starting conversation...`, 'success');
                        this.startConversation(char1Name, char2Name);
                        this.conversationCooldowns.set(pairKey, now);
                    } else {
                        this.log(`🎲 Conversation chance missed (${(this.conversationChance * 100)}%)`, 'info');
                    }
                } else {
                    this.log(`❌ ${char1Name} and ${char2Name} are too far apart for conversation`, 'info');
                }
            }
        }
    }

    /**
     * Check if character is busy with betting activities
     */
    isCharacterBusy(character) {
        // Only consider characters busy if they're actively betting - allow conversations during emotions
        const busyStates = ['walking_to_bookie', 'placing_bet'];
        const isBusy = busyStates.includes(character.state);
        
        // Debug log for troubleshooting
        if (isBusy) {
            this.log(`🚫 ${character.name} is busy: ${character.state}`, 'info');
        }
        
        return isBusy;
    }

    /**
     * Get distance between two characters
     */
    getCharacterDistance(char1, char2) {
        if (!char1.position || !char2.position) return Infinity;

        const dx = char1.position.x - char2.position.x;
        const dz = (char1.position.z || 0) - (char2.position.z || 0);
        return Math.sqrt(dx * dx + dz * dz);
    }

    /**
     * Check if two characters are close enough to have a conversation
     */
    areCharactersNearby(char1, char2) {
        const distance = this.getCharacterDistance(char1, char2);
        return distance <= this.conversationRange;
    }

    /**
     * Start a conversation between two characters
     */
    startConversation(char1Name, char2Name) {
        const char1 = this.characters[char1Name];
        const char2 = this.characters[char2Name];

        // Determine conversation topic based on character states and recent history
        const topic = this.selectConversationTopic(char1, char2);
        const topicData = this.getConversationTopics()[topic];
        
        // Select random dialogue from topic
        const dialogue = topicData.dialogues[Math.floor(Math.random() * topicData.dialogues.length)];
        
        // Replace placeholders with character names
        let starter = dialogue.starter.replace('{character1}', char1Name).replace('{character2}', char2Name);
        let text = dialogue.text.replace('{character1}', char1Name).replace('{character2}', char2Name);
        let response = dialogue.response.replace('{character1}', char1Name).replace('{character2}', char2Name);

        // Determine who starts the conversation
        let starterName, responderName;
        if (starter.includes(char1Name) || Math.random() < 0.5) {
            starterName = char1Name;
            responderName = char2Name;
        } else {
            starterName = char2Name;
            responderName = char1Name;
        }

        // Create conversation object
        const conversation = {
            id: Date.now(),
            participants: [starterName, responderName],
            topic: topic,
            topicTitle: topicData.title,
            topicClass: topicData.class,
            starter: starterName,
            text: text,
            response: response,
            timestamp: new Date()
        };

        // Add to conversation history
        this.conversationHistory.push(conversation);

        // Keep only last 10 conversations
        if (this.conversationHistory.length > 10) {
            this.conversationHistory.shift();
        }

        // Display conversation in UI
        this.displayConversation(conversation);

        // Log the conversation
        this.log(`💬 ${starterName} & ${responderName} chatting about ${topicData.title.toLowerCase()}`, 'info');
    }

    /**
     * Select appropriate conversation topic based on character states
     */
    selectConversationTopic(char1, char2) {
        // Check recent bet outcomes for celebration/commiseration topics
        const char1RecentWin = char1.emotion.state === 'joy' || char1.emotion.state === 'relief';
        const char2RecentWin = char2.emotion.state === 'joy' || char2.emotion.state === 'relief';
        const char1RecentLoss = char1.emotion.state === 'anger' || char1.emotion.state === 'annoyed';
        const char2RecentLoss = char2.emotion.state === 'anger' || char2.emotion.state === 'annoyed';

        // If both won recently, celebrate together
        if (char1RecentWin && char2RecentWin) {
            return 'celebration';
        }

        // If both lost recently, commiserate together
        if (char1RecentLoss && char2RecentLoss) {
            return 'commiseration';
        }

        // If one won and one lost, maybe general chat or betting talk
        if ((char1RecentWin && char2RecentLoss) || (char1RecentLoss && char2RecentWin)) {
            return Math.random() < 0.7 ? 'general' : 'betting';
        }

        // If characters are waiting or thinking, betting talk is more likely
        if (char1.emotion.state === 'thinking' || char2.emotion.state === 'thinking' ||
            char1.emotion.state === 'hopeful' || char2.emotion.state === 'hopeful' ||
            char1.emotion.state === 'worried' || char2.emotion.state === 'worried') {
            return Math.random() < 0.6 ? 'betting' : 'general';
        }

        // Default to general conversation or betting strategy
        return Math.random() < 0.5 ? 'general' : 'betting';
    }

    /**
     * Display conversation in UI
     */
    displayConversation(conversation) {
        const conversationArea = document.getElementById('conversationArea');
        if (!conversationArea) return;

        // Remove "no conversations" message if it exists
        const noConversations = conversationArea.querySelector('.no-conversations');
        if (noConversations) {
            noConversations.remove();
        }

        // Create conversation element
        const conversationEl = document.createElement('div');
        conversationEl.className = 'conversation-item';
        conversationEl.innerHTML = `
            <div class="conversation-avatars">
                <div class="conversation-avatar ${conversation.participants[0].toLowerCase()}">${conversation.participants[0][0]}</div>
                <div class="conversation-avatar ${conversation.participants[1].toLowerCase()}">${conversation.participants[1][0]}</div>
            </div>
            <div class="conversation-content">
                <div class="conversation-topic ${conversation.topicClass}">${conversation.topicTitle}</div>
                <div class="conversation-participants">${conversation.participants.join(' & ')}</div>
                <div class="conversation-text">
                    <strong>${conversation.starter}:</strong> "${conversation.text}"<br>
                    <strong>${conversation.participants.find(p => p !== conversation.starter)}:</strong> "${conversation.response}"
                </div>
            </div>
        `;

        // Add to conversation area (newest first)
        conversationArea.insertBefore(conversationEl, conversationArea.firstChild);

        // Remove old conversations if too many
        const conversations = conversationArea.querySelectorAll('.conversation-item');
        if (conversations.length > 5) {
            conversations[conversations.length - 1].remove();
        }

        // Auto-scroll to show new conversation
        conversationArea.scrollTop = 0;
    }

    /**
     * Manual conversation test (can be called from console)
     */
    testConversation() {
        this.log('🧪 Manual conversation test initiated...', 'info');
        
        // Clear cooldowns for testing
        this.conversationCooldowns.clear();
        
        // Force a conversation between first two characters
        const characterNames = Object.keys(this.characters);
        if (characterNames.length >= 2) {
            this.log(`🧪 Forcing conversation between ${characterNames[0]} and ${characterNames[1]}`, 'info');
            this.startConversation(characterNames[0], characterNames[1]);
        } else {
            this.log('🧪 Not enough characters for conversation test', 'warning');
        }
    }

    /**
     * Debug character positions and states
     */
    debugCharacters() {
        Object.keys(this.characters).forEach(name => {
            const char = this.characters[name];
            this.log(`🔍 ${name}: pos(${char.position.x.toFixed(1)}, ${char.position.z || 0}) state: ${char.state} emotion: ${char.emotion.state}`, 'info');
        });
    }
}

// Initialize simulation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure all scripts are loaded
    setTimeout(() => {
        try {
            console.log('Initializing BettingSimulation...');
            console.log('THREE available:', typeof THREE !== 'undefined');
            console.log('ThreeRenderer available:', typeof ThreeRenderer !== 'undefined');
            
            window.simulation = new BettingSimulation();
            console.log('BettingSimulation initialized successfully');
        } catch (error) {
            console.error('Error initializing simulation:', error);
            
            // Show error in UI
            const statusText = document.getElementById('statusText');
            if (statusText) {
                statusText.textContent = 'Initialization failed - check console';
                statusText.style.color = 'red';
            }
        }
    }, 200);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.simulation) {
        window.simulation.destroy();
    }
}); 
