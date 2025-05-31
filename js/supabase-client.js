/**
 * Supabase Client for WagerWire Betting Simulation
 * Handles database connections and bet data operations
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.connected = false;
        this.tableName = 'characters'; // Update this to your actual table name
    }

    /**
     * Set the table name to use
     * @param {string} tableName - Name of the table containing bet data
     */
    setTableName(tableName) {
        this.tableName = tableName;
        this.log(`Table name set to: ${tableName}`, 'info');
    }

    /**
     * Connect to Supabase
     * @param {string} url - Supabase URL
     * @param {string} anonKey - Supabase anon key
     * @returns {Promise<boolean>} Connection success
     */
    async connect(url, anonKey) {
        try {
            this.log('Connecting to Supabase...', 'info');
            
            // Create Supabase client
            this.client = window.supabase.createClient(url, anonKey);
            
            // Test connection by trying to fetch from the table
            const { data, error } = await this.client
                .from(this.tableName)
                .select('id')
                .limit(1);
            
            if (error) {
                throw error;
            }
            
            this.connected = true;
            this.log('Successfully connected to Supabase', 'success');
            return true;
            
        } catch (error) {
            this.connected = false;
            this.log(`Connection failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Check if connected to Supabase
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.connected && this.client !== null;
    }

    /**
     * Fetch open bets (for testing)
     * @returns {Promise<Array>} Array of open bet objects
     */
    async fetchOpenBets() {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            const { data, error } = await this.client
                .from(this.tableName)
                .select('*')
                .is('result', null)
                .order('timestamp', { ascending: false })
                .limit(10);

            if (error) {
                throw error;
            }

            this.log(`Found ${data.length} open bets`, 'info');
            return data || [];
        } catch (error) {
            this.log(`Error fetching open bets: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Fetch new bets since last check
     * @param {string} lastCheckTime - ISO timestamp of last check
     * @returns {Promise<Array>} Array of new bet objects
     */
    async fetchNewBets(lastCheckTime) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            const { data, error } = await this.client
                .from(this.tableName)
                .select('*')
                .gt('timestamp', lastCheckTime)
                .is('result', null)
                .in('extract_names', ['Benny', 'Max', 'Ellie']) // Map to character names
                .order('timestamp', { ascending: true });

            if (error) {
                throw error;
            }

            // Transform the data to match expected format
            const transformedData = data.map(bet => ({
                id: bet.id,
                created_at: bet.timestamp,
                character: bet.extract_names, // Map extract_names to character
                stake: bet.stake,
                eventid: bet.eventid,
                price: bet.price,
                selection_combo: bet.selection_combo,
                selection_line: bet.selection_line,
                bet_time_score: bet.bet_time_score,
                result: bet.result,
                placed_at: bet.placed_at || null,
                settled_at: bet.settled_at || null,
                payout: bet.payout || null,
                characterReaction: bet.characterReaction || null
            }));

            this.log(`Fetched ${transformedData.length} new bets since ${lastCheckTime}`, 'info');
            return transformedData || [];
        } catch (error) {
            this.log(`Error fetching new bets: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Mark a bet as placed (add placed timestamp)
     * @param {string} betId - Bet ID
     * @returns {Promise<boolean>} Success status
     */
    async markBetPlaced(betId) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            // Since 'placed_at' column doesn't exist in your table, we'll just log it
            this.log(`Bet ${betId} marked as placed (no database update needed)`, 'info');
            return true;
        } catch (error) {
            this.log(`Error marking bet as placed: ${error.message}`, 'error');
            return false; // Don't throw, just return false
        }
    }

    /**
     * Update bet result and settlement
     * @param {string} betId - Bet ID
     * @param {string} result - Bet result
     * @param {number} payout - Payout amount
     * @returns {Promise<boolean>} Success status
     */
    async settleBet(betId, result, payout = 0) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            // Only update the 'result' column since that exists in your table
            const { error } = await this.client
                .from(this.tableName)
                .update({ 
                    result: result
                })
                .eq('id', betId);

            if (error) {
                throw error;
            }

            this.log(`Settled bet ${betId} with result: ${result} (payout: £${payout})`, 'success');
            return true;
        } catch (error) {
            this.log(`Error settling bet: ${error.message}`, 'error');
            return false; // Don't throw, just return false
        }
    }

    /**
     * Update character reaction for in-progress bet
     * @param {string} betId - Bet ID
     * @param {string} reaction - Character reaction
     * @returns {Promise<boolean>} Success status
     */
    async updateCharacterReaction(betId, reaction) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            // Since characterReaction column might not exist, just log it
            this.log(`Character reaction for bet ${betId}: ${reaction} (no database update needed)`, 'info');
            return true;
        } catch (error) {
            this.log(`Error updating character reaction: ${error.message}`, 'error');
            return false; // Don't throw, just return false
        }
    }

    /**
     * Fetch bet statistics for a character
     * @param {string} characterName - Character name
     * @returns {Promise<Object>} Statistics object
     */
    async getCharacterStats(characterName) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            const { data, error } = await this.client
                .from(this.tableName)
                .select('stake, result, payout')
                .eq('extract_names', characterName) // Use extract_names instead of character
                .not('result', 'is', null);

            if (error) {
                throw error;
            }

            const stats = {
                totalBets: data.length,
                totalStaked: 0,
                totalPayout: 0,
                wins: 0,
                losses: 0,
                pushes: 0
            };

            data.forEach(bet => {
                stats.totalStaked += parseFloat(bet.stake || 0);
                stats.totalPayout += parseFloat(bet.payout || 0);
                
                if (bet.result && bet.result.startsWith('Win')) {
                    stats.wins++;
                } else if (bet.result && bet.result.startsWith('Loss')) {
                    stats.losses++;
                } else {
                    stats.pushes++;
                }
            });

            stats.netProfit = stats.totalPayout - stats.totalStaked;
            stats.winRate = stats.totalBets > 0 ? (stats.wins / stats.totalBets * 100).toFixed(1) : 0;

            return stats;
        } catch (error) {
            this.log(`Error fetching character stats: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Subscribe to real-time changes in the table
     * @param {Function} callback - Callback function for changes
     * @returns {Object} Subscription object
     */
    subscribeToChanges(callback) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        const subscription = this.client
            .channel('table-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: this.tableName 
                }, 
                callback
            )
            .subscribe();

        this.log('Subscribed to real-time changes', 'info');
        return subscription;
    }

    /**
     * Insert a test bet for development
     * @param {Object} betData - Bet data object
     * @returns {Promise<Object>} Inserted bet object
     */
    async insertTestBet(betData) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            const testBet = {
                timestamp: new Date().toISOString(),
                extract_names: betData.character || 'Benny',
                stake: betData.stake || '100',
                eventid: betData.eventid || 12345,
                price: betData.price || 1.90,
                selection_combo: betData.selection_combo || 'Over',
                selection_line: betData.selection_line || 2.5,
                bet_time_score: betData.bet_time_score || '0-0',
                result: null // Always null for new bets
            };

            const { data, error } = await this.client
                .from(this.tableName)
                .insert([testBet])
                .select();

            if (error) {
                throw error;
            }

            this.log(`Inserted test bet for ${testBet.extract_names}`, 'success');
            return data[0];
        } catch (error) {
            this.log(`Error inserting test bet: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Add multiple test bets for all characters
     * @returns {Promise<Array>} Array of inserted bets
     */
    async addTestBets() {
        const testBets = [
            {
                character: 'Benny',
                stake: '100',
                eventid: 13728901,
                price: 2.06,
                selection_combo: 'Home Team',
                selection_line: 0.25,
                bet_time_score: '0-0'
            },
            {
                character: 'Max',
                stake: '200',
                eventid: 13792038,
                price: 1.75,
                selection_combo: 'Under',
                selection_line: 2.50,
                bet_time_score: '0-0'
            },
            {
                character: 'Ellie',
                stake: '150',
                eventid: 13867659,
                price: 1.86,
                selection_combo: 'Home Team',
                selection_line: -1.50,
                bet_time_score: '0-0'
            }
        ];

        const results = [];
        for (const bet of testBets) {
            try {
                const result = await this.insertTestBet(bet);
                results.push(result);
            } catch (error) {
                this.log(`Failed to insert test bet for ${bet.character}: ${error.message}`, 'error');
            }
        }

        this.log(`Added ${results.length} test bets`, 'success');
        return results;
    }

    /**
     * Log message with timestamp
     * @param {string} message - Log message
     * @param {string} level - Log level
     */
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
        
        // Dispatch custom event for UI logging
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('supabase-log', {
                detail: { message, level, timestamp }
            }));
        }
    }

    /**
     * Disconnect from Supabase
     */
    disconnect() {
        if (this.client) {
            this.client = null;
        }
        this.connected = false;
        this.log('Disconnected from Supabase', 'info');
    }

    /**
     * List all tables in the database (for debugging)
     * @returns {Promise<Array>} Array of table names
     */
    async listTables() {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            // Query the information schema to get table names
            const { data, error } = await this.client
                .rpc('get_table_names');

            if (error) {
                // Fallback: try common table names
                const commonTables = ['characters', 'bets', 'betting_data', 'predictions', 'wagers'];
                const existingTables = [];
                
                for (const tableName of commonTables) {
                    try {
                        const { data: testData, error: testError } = await this.client
                            .from(tableName)
                            .select('id')
                            .limit(1);
                        
                        if (!testError) {
                            existingTables.push(tableName);
                        }
                    } catch (e) {
                        // Table doesn't exist, continue
                    }
                }
                
                this.log(`Found tables: ${existingTables.join(', ')}`, 'info');
                return existingTables;
            }

            this.log(`Found tables: ${data.map(t => t.table_name).join(', ')}`, 'info');
            return data.map(t => t.table_name);
        } catch (error) {
            this.log(`Error listing tables: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Check table contents and structure
     * @param {string} tableName - Table to check
     * @returns {Promise<Object>} Table info
     */
    async checkTable(tableName) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            // Get row count and sample data
            const { data, error, count } = await this.client
                .from(tableName)
                .select('*', { count: 'exact' })
                .limit(3);

            if (error) {
                throw error;
            }

            const tableInfo = {
                name: tableName,
                rowCount: count,
                sampleData: data,
                columns: data.length > 0 ? Object.keys(data[0]) : []
            };

            console.log(`Table: ${tableName}`);
            console.log(`Rows: ${count}`);
            console.log(`Columns: ${tableInfo.columns.join(', ')}`);
            console.log('Sample data:', data);

            return tableInfo;
        } catch (error) {
            this.log(`Error checking table ${tableName}: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Find tables with betting data
     * @returns {Promise<Array>} Tables that might contain bets
     */
    async findBettingTables() {
        if (!this.isConnected()) {
            throw new Error('Not connected to Supabase');
        }

        try {
            const tables = await this.listTables();
            const bettingTables = [];

            for (const tableName of tables) {
                try {
                    const tableInfo = await this.checkTable(tableName);
                    
                    // Check if table has betting-related columns
                    const bettingColumns = ['stake', 'price', 'selection_combo', 'eventid', 'extract_names'];
                    const hasBettingColumns = bettingColumns.some(col => 
                        tableInfo.columns.includes(col)
                    );

                    if (hasBettingColumns && tableInfo.rowCount > 0) {
                        bettingTables.push({
                            name: tableName,
                            rowCount: tableInfo.rowCount,
                            columns: tableInfo.columns,
                            sampleData: tableInfo.sampleData
                        });
                    }
                } catch (error) {
                    // Skip tables we can't access
                    continue;
                }
            }

            console.log('Tables with betting data:', bettingTables);
            return bettingTables;
        } catch (error) {
            this.log(`Error finding betting tables: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Create global instance
const supabaseClient = new SupabaseClient();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.supabaseClient = supabaseClient;
} 