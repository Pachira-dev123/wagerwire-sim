/**
 * Main Simulation Logic for WagerWire Betting Simulation
 * Orchestrates character management, bet processing, and real-time updates
 */

class BettingSimulation {
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
     * Setup canvas renderer
     */
    setupRenderer() {
        this.renderer = new CanvasRenderer('cityCanvas');
        window.simulation = this; // Make simulation accessible to renderer
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
        
        // Reset characters
        Object.keys(this.characters).forEach(name => {
            this.characters[name] = this.createCharacter(name);
        });
        
        // Clear active bets
        this.activeBets.clear();
        
        // Clear bet queue
        this.betQueue = [];
        this.currentBetIndex = 0;
        
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
        
        // Add bet to active bets
        this.activeBets.set(bet.id, bet);
        character.activeBets.push(bet.id);
        
        // Start character walking to bookie
        this.startWalkingToBookie(character, bet);
        
        // Update UI to show the new active bet
        this.updateActiveBetsUI();
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
            
            if (event.status === 'finished' && (event.score || event.homeScore !== undefined)) {
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
        // Use YOUR betting engine to calculate the result
        const finalScore = `${event.homeScore || 0}-${event.awayScore || 0}`;
        
        this.log(`Settling bet for event ${bet.eventid}: Final score ${finalScore}`, 'info');
        
        // Debug: Log all available fields in the bet object
        this.log(`Available bet fields: ${Object.keys(bet.originalData || bet).join(', ')}`, 'info');
        this.log(`Bet data: ${JSON.stringify(bet.originalData || bet, null, 2)}`, 'info');
        
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
                // For now, let's check if the line is positive or negative as a hint
                selectionCombo = bet.selection_line >= 0 ? 'Away Team' : 'Home Team';
            } else {
                selectionCombo = 'Home Team'; // Default fallback
            }
        }
        
        // Map common variations to expected format
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
        
        // Use the pre-parsed stake
        const stake = bet.parsedStake || 100;
        
        // Calculate payout using YOUR betting engine
        const payout = calculatePayout(result, stake, bet.price);
        
        this.log(`Payout calculated: £${payout} for stake £${stake} at odds ${bet.price}`, 'info');
        
        // Update character bankroll
        character.bankroll += payout;
        character.stats.totalPayout += payout;
        
        // Update character emotion using YOUR emotion system
        const emotion = getEmotionFromResult(result);
        character.emotion = emotion;
        character.state = emotion.state;
        
        // Update stats
        if (result.startsWith('Win')) {
            character.stats.totalWins++;
        } else if (result.startsWith('Loss')) {
            character.stats.totalLosses++;
        }
        
        character.stats.netProfit = character.stats.totalPayout - character.stats.totalStaked;
        
        // Play result sound
        if (result.startsWith('Win')) {
            this.playBeep(800, 200); // Higher pitch for wins
        } else if (result.startsWith('Loss')) {
            this.playBeep(300, 300); // Lower pitch for losses
        } else {
            this.playBeep(500, 150); // Neutral for pushes
        }
        
        this.log(`${character.name} bet settled: ${result} - Payout: £${payout}`, 
                 result.startsWith('Win') ? 'success' : 'warning');
        
        // Remove from active bets
        this.activeBets.delete(bet.id);
        character.activeBets = character.activeBets.filter(id => id !== bet.id);
        
        // Update database with result
        try {
            await supabaseClient.settleBet(bet.id, result, payout);
        } catch (error) {
            this.log(`Error settling bet in database: ${error.message}`, 'error');
        }
        
        // Reset character state after emotion display
        setTimeout(() => {
            character.state = 'idle';
            character.emotion = { emoji: '😐', state: 'neutral', description: 'Ready for next bet' };
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
        const currentScore = `${event.homeScore || 0}-${event.awayScore || 0}`;
        
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
}

// Initialize simulation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.simulation = new BettingSimulation();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.simulation) {
        window.simulation.destroy();
    }
}); 