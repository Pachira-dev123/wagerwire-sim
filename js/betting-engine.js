/**
 * Complete Betting Engine for WagerWire Simulation
 * Handles Asian Handicap and Over/Under betting calculations
 */

/**
 * Evaluates Over/Under (Totals) bets
 * @param {string} bet - Bet string like "Over 2.5" or "Under 1.75"
 * @param {number} totalGoals - Total goals scored in the match
 * @returns {string} Result: "Win", "Loss", "Push", "Half Win", "Half Loss"
 */
const evaluateGoalLine = (bet, totalGoals) => {
    const match = bet.match(/(Under|Over)\s([0-9.]+)/);
    if (!match) return 'Invalid';

    const direction = match[1];
    const line = parseFloat(match[2]);
    const isQuarterLine = line % 1 === 0.25 || line % 1 === 0.75;

    if (direction === "Under") {
        if (totalGoals < line) {
            if (isQuarterLine && totalGoals === line - 0.25) {
                return "Half Win";
            } else {
                return "Win";
            }
        } else if (totalGoals === line) {
            return isQuarterLine ? "Half Loss" : "Push";
        } else if (isQuarterLine && totalGoals === line + 0.25) {
            return "Half Loss";
        } else {
            return "Loss";
        }
    } else { // Over
        if (totalGoals > line) {
            if (isQuarterLine && totalGoals === line + 0.25) {
                return "Half Win";
            } else {
                return "Win";
            }
        } else if (totalGoals === line) {
            return isQuarterLine ? "Half Loss" : "Push";
        } else if (isQuarterLine && totalGoals === line - 0.25) {
            return "Half Loss";
        } else {
            return "Loss";
        }
    }
};

/**
 * Evaluates Asian Handicap bets
 * @param {string} bet - Bet string like "Arsenal +1.25" or "Liverpool -0.5"
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @param {number} homeGoals - Home team goals
 * @param {number} awayGoals - Away team goals
 * @returns {string} Result: "Win", "Loss", "Push", "Half Win", "Half Loss"
 */
const evaluateHandicap = (bet, homeTeam, awayTeam, homeGoals, awayGoals) => {
    const match = bet.match(/^([A-Za-z\s]+?)\s([+-][0-9.]+)/);
    if (!match) return 'Invalid';

    const backedTeam = match[1].trim();
    const handicap = parseFloat(match[2]);
    
    // Determine if the backed team is home or away
    const isBackingHome = backedTeam === homeTeam;
    const isBackingAway = backedTeam === awayTeam;
    
    if (!isBackingHome && !isBackingAway) {
        // Try partial matching if exact match fails
        const backedTeamLower = backedTeam.toLowerCase();
        const homeTeamLower = homeTeam.toLowerCase();
        const awayTeamLower = awayTeam.toLowerCase();
        
        if (homeTeamLower.includes(backedTeamLower) || backedTeamLower.includes(homeTeamLower)) {
            // Backing home team
        } else if (awayTeamLower.includes(backedTeamLower) || backedTeamLower.includes(awayTeamLower)) {
            // Backing away team  
        } else {
            return 'Team Not Found';
        }
    }
    
    // Calculate net score relative to backed team
    let netScore;
    if (isBackingHome || (homeTeam.toLowerCase().includes(backedTeam.toLowerCase()))) {
        netScore = homeGoals - awayGoals;
    } else {
        netScore = awayGoals - homeGoals;
    }
    
    // Apply handicap to net score
    const adjustedScore = netScore + handicap;
    
    // Handicap result logic
    if (adjustedScore >= 0.5) {
        return "Win";
    } else if (adjustedScore === 0.25) {
        return "Half Win";
    } else if (adjustedScore === 0) {
        return "Push";
    } else if (adjustedScore === -0.25) {
        return "Half Loss";
    } else {
        return "Loss";
    }
};

/**
 * Enhanced prediction calculation using structured database fields
 * @param {string} selectionCombo - Bet type: "Home Team", "Away Team", "Over", "Under"
 * @param {number} selectionLine - Handicap/Total line value
 * @param {string|null} betTimeScore - Score when bet was placed (for progression analysis)
 * @param {string} currentScore - Current match score
 * @returns {string} Detailed prediction result with progression info
 */
function calculateEnhancedPredictedResult(selectionCombo, selectionLine, betTimeScore, currentScore) {
    const line = parseFloat(selectionLine.toString());
    
    const [currentHomeGoals, currentAwayGoals] = currentScore.split('-').map(Number);
    let adjustedHomeGoals = currentHomeGoals;
    let adjustedAwayGoals = currentAwayGoals;

    // Calculate goals scored since bet was placed (for progression analysis)
    if (betTimeScore && betTimeScore !== 'N/A') {
        const betScoreParts = betTimeScore.replace(/\s/g, '').split('-');
        if (betScoreParts.length === 2) {
            const betHomeGoals = parseInt(betScoreParts[0]);
            const betAwayGoals = parseInt(betScoreParts[1]);
            if (!isNaN(betHomeGoals) && !isNaN(betAwayGoals)) {
                adjustedHomeGoals -= betHomeGoals;
                adjustedAwayGoals -= betAwayGoals;
            }
        }
    }

    let result = 'Pending';

    // 🏠 Asian Handicap Bets (Home or Away Team)
    if (selectionCombo === 'Home Team' || selectionCombo === 'Away Team') {
        const goalDiff = selectionCombo === 'Home Team'
            ? adjustedHomeGoals - adjustedAwayGoals
            : adjustedAwayGoals - adjustedHomeGoals;

        const adjustedScore = goalDiff + line;
        const rounded = Math.round(adjustedScore * 100) / 100;

        if (rounded >= 0.5) {
            result = 'Win';
        } else if (rounded === 0.25) {
            result = 'Half Win';
        } else if (rounded === 0) {
            result = 'Push';
        } else if (rounded === -0.25) {
            result = 'Half Loss';
        } else {
            result = 'Loss';
        }

        result += ` - ${selectionCombo} (${line}) (${adjustedHomeGoals}-${adjustedAwayGoals})`;
    }

    // ⚽ Over/Under Totals Bets
    else if (selectionCombo === 'Over' || selectionCombo === 'Under') {
        const totalGoals = currentHomeGoals + currentAwayGoals;  // Use full-time score
        const diff = selectionCombo === 'Over'
            ? totalGoals - line
            : line - totalGoals;

        const rounded = Math.round(diff * 100) / 100;

        if (rounded >= 0.5) {
            result = 'Win';
        } else if (rounded === 0.25) {
            result = 'Half Win';
        } else if (rounded === 0) {
            result = 'Push';
        } else if (rounded === -0.25) {
            result = 'Half Loss';
        } else {
            result = 'Loss';
        }

        result += ` - ${selectionCombo} (${line}) (${totalGoals} goals)`;
    }

    return result;
}

/**
 * Legacy prediction calculation for text-based selections
 * @param {string} selection - Text selection like "Arsenal +1.25" or "Over 2.5"
 * @param {string} scoreText - Current score as text
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @returns {string} Basic prediction result
 */
const calculatePredictedResult = (selection, scoreText, homeTeam, awayTeam) => {
    if (!scoreText || scoreText === 'N/A' || !selection) {
        return 'N/A';
    }

    try {
        const scoreParts = scoreText.replace(/\s/g, '').split('-');
        if (scoreParts.length !== 2) return 'Invalid Score';

        const homeGoals = parseInt(scoreParts[0]);
        const awayGoals = parseInt(scoreParts[1]);
        
        if (isNaN(homeGoals) || isNaN(awayGoals)) return 'Invalid Score';

        const totalGoals = homeGoals + awayGoals;

        // Over/Under bets
        if (selection.includes('Under') || selection.includes('Over')) {
            return evaluateGoalLine(selection, totalGoals);
        }
        
        // Handicap bets
        if (selection.match(/[+-][0-9.]+/)) {
            if (!homeTeam || !awayTeam) {
                return 'Missing Team Info';
            }
            return evaluateHandicap(selection, homeTeam, awayTeam, homeGoals, awayGoals);
        }

        return 'Unknown Bet Type';
    } catch (error) {
        return 'Error';
    }
};

/**
 * Calculate payout based on bet result and odds
 * @param {string} result - Bet result ("Win", "Half Win", "Loss", "Half Loss", "Push")
 * @param {number} stake - Bet stake amount
 * @param {number} odds - Bet odds/price
 * @returns {number} Payout amount (including stake for wins)
 */
function calculatePayout(result, stake, odds) {
    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    
    if (result.startsWith('Win')) {
        return stakeNum * oddsNum; // Full win
    } else if (result.startsWith('Half Win')) {
        return stakeNum + (stakeNum * (oddsNum - 1) * 0.5); // Half win
    } else if (result.startsWith('Push')) {
        return stakeNum; // Stake returned
    } else if (result.startsWith('Half Loss')) {
        return stakeNum * 0.5; // Half stake returned
    } else {
        return 0; // Full loss
    }
}

/**
 * Get emotion based on bet result
 * @param {string} result - Bet result
 * @returns {object} Emotion data with emoji and state
 */
function getEmotionFromResult(result) {
    if (result.startsWith('Win')) {
        return { emoji: '🎉', state: 'joy', description: 'Celebrating win!' };
    } else if (result.startsWith('Half Win')) {
        return { emoji: '😊', state: 'relief', description: 'Half win - not bad!' };
    } else if (result.startsWith('Push')) {
        return { emoji: '😐', state: 'neutral', description: 'Push - stake returned' };
    } else if (result.startsWith('Half Loss')) {
        return { emoji: '😕', state: 'annoyed', description: 'Half loss - could be worse' };
    } else if (result.startsWith('Loss')) {
        return { emoji: '😡', state: 'anger', description: 'Lost the bet!' };
    } else {
        return { emoji: '🤔', state: 'thinking', description: 'Checking result...' };
    }
}

/**
 * Get emotion for in-progress bets based on current prediction
 * @param {string} prediction - Current prediction result
 * @returns {object} Emotion data
 */
function getInProgressEmotion(prediction) {
    if (prediction.startsWith('Win') || prediction.startsWith('Half Win')) {
        return { emoji: '🤞', state: 'hopeful', description: 'Looking good!' };
    } else if (prediction.startsWith('Loss') || prediction.startsWith('Half Loss')) {
        return { emoji: '😰', state: 'worried', description: 'Not looking good...' };
    } else {
        return { emoji: '😐', state: 'neutral', description: 'Too close to call' };
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        evaluateGoalLine,
        evaluateHandicap,
        calculateEnhancedPredictedResult,
        calculatePredictedResult,
        calculatePayout,
        getEmotionFromResult,
        getInProgressEmotion
    };
} 