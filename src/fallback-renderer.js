/**
 * Fallback 2D Canvas Renderer for WagerWire Simulation
 * Used when Three.js is not available
 */

export class FallbackRenderer {
    constructor(containerId) {
        console.log('Initializing fallback 2D renderer...');
        
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found.`);
        }
        
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.border = '2px solid #ddd';
        this.canvas.style.borderRadius = '10px';
        this.canvas.style.background = 'linear-gradient(45deg, #87CEEB, #98FB98)';
        
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        
        // World setup
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.bookiePosition = { x: this.width / 2, y: this.height / 2 };
        
        // Character positions
        this.characterStartingPositions = {
            'Benny': { x: 100, y: 100 },
            'Max': { x: this.width - 100, y: 100 },
            'Ellie': { x: this.width / 2, y: this.height - 100 }
        };
        
        this.characters = {};
        
        // Ticker tape system
        this.tickerTexts = [
            "🏈 MANCHESTER UTD vs LIVERPOOL - Over 2.5 Goals @ 1.85",
            "⚽ REAL MADRID vs BARCELONA - Real Madrid -0.5 @ 2.10", 
            "🏀 LAKERS vs WARRIORS - Under 220.5 Points @ 1.92",
            "🎾 DJOKOVIC vs NADAL - Djokovic -1.5 Sets @ 1.78",
            "🏈 CHELSEA vs ARSENAL - Over 3.5 Goals @ 2.45",
            "⚽ PSG vs BAYERN - PSG +0.25 @ 1.95"
        ];
        this.tickerOffset = 0;
        this.tickerSpeed = 0.1;  // Reduced from 0.5 to 0.1 (5x slower)
        this.tickerRadius = 90;
        
        // Start rendering
        this.startRendering();
        
        console.log('Fallback 2D renderer initialized successfully!');
    }

    /**
     * Create a 2D character representation
     */
    createCharacter(name) {
        console.log(`Creating 2D character: ${name}`);
        
        const startPos = this.characterStartingPositions[name];
        this.characters[name] = {
            name: name,
            position: { ...startPos },
            state: 'idle',
            emotion: { emoji: '😐', state: 'neutral' },
            color: this.getCharacterColor(name),
            isWalking: false,
            targetPosition: null,
            isRoaming: true,
            roamingTimer: Math.random() * 5000,
            lastRoamTime: Date.now()
        };
        
        // Start initial roaming after a short delay
        setTimeout(() => {
            this.startRoaming(this.characters[name]);
        }, 1000 + Math.random() * 2000);
    }

    /**
     * Get character color
     */
    getCharacterColor(name) {
        const colors = {
            'Benny': '#e74c3c',
            'Max': '#3498db',
            'Ellie': '#9b59b6'
        };
        return colors[name] || '#95a5a6';
    }

    /**
     * Update character state
     */
    updateCharacter(characterName, state, emotion, position) {
        if (this.characters[characterName]) {
            const character = this.characters[characterName];
            const previousState = character.state;
            
            character.state = state;
            character.emotion = emotion;
            
            // Stop roaming when character has a specific task
            if (state !== 'idle' && state !== 'waiting' && state !== 'neutral') {
                character.isRoaming = false;
            }
            
            // Handle different states
            switch (state) {
                case 'walking_to_bookie':
                    character.isRoaming = false;
                    character.isWalking = true;
                    character.targetPosition = { ...this.bookiePosition };
                    break;
                case 'placing_bet':
                    character.isWalking = false;
                    character.position = { ...this.bookiePosition };
                    break;
                case 'joy':
                    // First walk out from bookie, then celebrate
                    this.startWalkingFromBookie(character, () => {
                        character.isWalking = false;
                        // After celebrating, resume roaming
                        setTimeout(() => {
                            character.isRoaming = true;
                            character.state = 'idle';
                            this.startRoaming(character);
                        }, 3000);
                    });
                    break;
                case 'anger':
                    // First walk out from bookie, then show anger
                    this.startWalkingFromBookie(character, () => {
                        character.isWalking = false;
                        // After being angry, resume roaming
                        setTimeout(() => {
                            character.isRoaming = true;
                            character.state = 'idle';
                            this.startRoaming(character);
                        }, 3000);
                    });
                    break;
                case 'idle':
                    // Resume roaming if not already roaming
                    if (!character.isRoaming) {
                        character.isRoaming = true;
                        this.startRoaming(character);
                    }
                    break;
                case 'waiting':
                case 'neutral':
                    // Character is waiting for next bet or result - roam while waiting
                    if (!character.isRoaming) {
                        character.isRoaming = true;
                        this.startRoaming(character);
                    }
                    break;
            }
        }
    }

    /**
     * Start walking away from bookie hub before reacting (2D version)
     */
    startWalkingFromBookie(character, callback) {
        // Get a position away from bookie hub but not too far
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 40; // 80-120 pixels from bookie
        const walkOutPosition = {
            x: this.bookiePosition.x + Math.cos(angle) * distance,
            y: this.bookiePosition.y + Math.sin(angle) * distance
        };
        
        // Keep within canvas bounds
        walkOutPosition.x = Math.max(50, Math.min(this.width - 50, walkOutPosition.x));
        walkOutPosition.y = Math.max(50, Math.min(this.height - 50, walkOutPosition.y));
        
        // Start walking to that position
        character.isWalking = true;
        character.targetPosition = walkOutPosition;
        character.isRoaming = false;
        
        console.log(`2D: ${character.name} walking out from bookie to react at (${walkOutPosition.x.toFixed(1)}, ${walkOutPosition.y.toFixed(1)})`);
        
        // Set up a check to call callback when reached
        const checkArrival = setInterval(() => {
            if (!character.isWalking || !character.targetPosition) {
                clearInterval(checkArrival);
                if (callback) callback();
                return;
            }
            
            const dx = character.targetPosition.x - character.position.x;
            const dy = character.targetPosition.y - character.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 10) {
                clearInterval(checkArrival);
                character.isWalking = false;
                character.targetPosition = null;
                if (callback) callback();
            }
        }, 100);
    }

    /**
     * Start roaming behavior for idle characters (2D version)
     */
    startRoaming(character) {
        if (!character.isRoaming) return;
        
        // Make roaming targets closer to current position for more natural movement
        const currentPos = character.position;
        const maxRoamDistance = 100;
        
        let roamPosition = {
            x: currentPos.x + (Math.random() - 0.5) * maxRoamDistance,
            y: currentPos.y + (Math.random() - 0.5) * maxRoamDistance
        };
        
        // Keep within canvas bounds
        roamPosition.x = Math.max(50, Math.min(this.width - 50, roamPosition.x));
        roamPosition.y = Math.max(50, Math.min(this.height - 50, roamPosition.y));
        
        character.isWalking = true;
        character.targetPosition = roamPosition;
        character.lastRoamTime = Date.now();
        
        console.log(`2D: ${character.name} roaming to (${roamPosition.x.toFixed(1)}, ${roamPosition.y.toFixed(1)})`);
    }

    /**
     * Start the rendering loop
     */
    startRendering() {
        const render = () => {
            this.render();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    /**
     * Main render function
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw bookie
        this.drawBookie();
        
        // Draw ticker tape
        this.drawTickerTape();
        
        // Draw characters
        this.drawCharacters();
        
        // Update walking characters
        this.updateWalkingCharacters();
        
        // Update ticker tape animation
        this.updateTickerTape();
    }

    /**
     * Draw the background
     */
    drawBackground() {
        // Ground
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#e8f5e8');
        gradient.addColorStop(1, '#d4f1d4');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Simple roads
        this.ctx.strokeStyle = '#bdc3c7';
        this.ctx.lineWidth = 8;
        
        // Horizontal road
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
        
        // Vertical road
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        
        // Road markings
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    /**
     * Draw the bookie hub
     */
    drawBookie() {
        const { x, y } = this.bookiePosition;
        const size = 60;
        
        // Building shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(x - size/2 + 3, y - size/2 + 3, size, size);
        
        // Building
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillRect(x - size/2, y - size/2, size, size);
        
        // Building outline
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x - size/2, y - size/2, size, size);
        
        // Sign
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('BOOKIE HUB', x, y - size/2 - 10);
        
        // Spinning money symbols
        const time = Date.now() / 1000;
        this.ctx.font = '20px Arial';
        for (let i = 0; i < 4; i++) {
            const angle = (time + i * Math.PI / 2) % (Math.PI * 2);
            const radius = size;
            const symbolX = x + Math.cos(angle) * radius;
            const symbolY = y + Math.sin(angle) * radius;
            this.ctx.fillText('💰', symbolX - 10, symbolY + 10);
        }
    }

    /**
     * Draw ticker tape around bookie hub
     */
    drawTickerTape() {
        const { x, y } = this.bookiePosition;
        
        // Save context
        this.ctx.save();
        
        // Draw ticker tape background circle
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 8;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.tickerRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw inner circle for contrast
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.tickerRadius - 2, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw ticker text with improved readability
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 14px Arial, sans-serif';  // Increased from 11px
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add text shadow for better readability
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        // Draw each ticker text around the circle
        this.tickerTexts.forEach((text, index) => {
            // Calculate position on circle
            const totalTexts = this.tickerTexts.length;
            const anglePerText = (Math.PI * 2) / totalTexts;
            const baseAngle = index * anglePerText + this.tickerOffset;
            
            // Position on the circle
            const textRadius = this.tickerRadius + 20;  // Increased from 15
            const textX = x + Math.cos(baseAngle) * textRadius;
            const textY = y + Math.sin(baseAngle) * textRadius;
            
            // Save context for rotation
            this.ctx.save();
            
            // Move to text position and rotate
            this.ctx.translate(textX, textY);
            this.ctx.rotate(baseAngle + Math.PI / 2); // Rotate to follow circle
            
            // Draw background for text with improved contrast
            const textWidth = this.ctx.measureText(text).width;
            const textHeight = 18;  // Increased from 14
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';  // Darker background
            this.ctx.fillRect(-textWidth / 2 - 8, -textHeight / 2 - 3, textWidth + 16, textHeight + 6);
            
            // Draw double border for better visibility
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 2;  // Increased from 1
            this.ctx.strokeRect(-textWidth / 2 - 8, -textHeight / 2 - 3, textWidth + 16, textHeight + 6);
            
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(-textWidth / 2 - 6, -textHeight / 2 - 1, textWidth + 12, textHeight + 2);
            
            // Draw text with shadow
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText(text, 0, 0);
            
            // Restore context
            this.ctx.restore();
        });
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Restore context
        this.ctx.restore();
    }

    /**
     * Update ticker tape animation
     */
    updateTickerTape() {
        // Update ticker offset for smooth scrolling
        this.tickerOffset += this.tickerSpeed * 0.01;
        if (this.tickerOffset > Math.PI * 2) {
            this.tickerOffset -= Math.PI * 2;
        }
    }

    /**
     * Add new bet to ticker tape
     */
    addBetToTicker(betText) {
        // Remove oldest bet if we have too many
        if (this.tickerTexts.length >= 8) {
            this.tickerTexts.shift();
        }
        
        // Add new bet
        this.tickerTexts.push(betText);
        console.log(`2D: Added new bet to ticker: ${betText}`);
    }

    /**
     * Clear all ticker content
     */
    clearTicker() {
        this.tickerTexts = [];
        console.log('2D ticker cleared');
    }

    /**
     * Draw all characters
     */
    drawCharacters() {
        Object.values(this.characters).forEach(character => {
            this.drawCharacter(character);
        });
    }

    /**
     * Draw a single character
     */
    drawCharacter(character) {
        const { x, y } = character.position;
        const radius = 25;
        
        // Character shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 2, y + radius + 2, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Character body
        this.ctx.fillStyle = character.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Character outline
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Character initial
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(character.name[0], x, y);
        
        // Character name
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(character.name, x, y + radius + 15);
        
        // Emotion
        if (character.emotion && character.emotion.emoji) {
            this.ctx.font = '16px Arial';
            this.ctx.fillText(character.emotion.emoji, x + radius + 5, y - radius);
        }
        
        // State indicator
        this.drawStateIndicator(character, x, y, radius);
    }

    /**
     * Draw state indicator
     */
    drawStateIndicator(character, x, y, radius) {
        let color = '#95a5a6';
        let symbol = '💤';
        
        switch (character.state) {
            case 'walking_to_bookie':
                color = '#f39c12';
                symbol = '🚶';
                break;
            case 'placing_bet':
                color = '#e67e22';
                symbol = '💰';
                break;
            case 'joy':
                color = '#2ecc71';
                symbol = '🎉';
                break;
            case 'anger':
                color = '#e74c3c';
                symbol = '😡';
                break;
            case 'hopeful':
                color = '#3498db';
                symbol = '🤞';
                break;
            case 'worried':
                color = '#f39c12';
                symbol = '😰';
                break;
        }
        
        // State circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x - radius - 10, y - radius, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // State symbol
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(symbol, x - radius - 10, y - radius + 4);
    }

    /**
     * Update walking characters
     */
    updateWalkingCharacters() {
        Object.values(this.characters).forEach(character => {
            if (character.isWalking && character.targetPosition) {
                const dx = character.targetPosition.x - character.position.x;
                const dy = character.targetPosition.y - character.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Debug log for visibility
                console.log(`2D: ${character.name} walking: (${character.position.x.toFixed(1)}, ${character.position.y.toFixed(1)}) -> (${character.targetPosition.x}, ${character.targetPosition.y}), distance: ${distance.toFixed(1)}`);
                
                if (distance > 5) {  // Increased threshold from 2 to 5
                    const speed = 2;  // Increased speed from 1 to 2
                    character.position.x += (dx / distance) * speed;
                    character.position.y += (dy / distance) * speed;
                } else {
                    console.log(`2D: ${character.name} reached target!`);
                    character.isWalking = false;
                    character.targetPosition = null;
                    
                    // Position exactly at target
                    character.position.x = character.targetPosition?.x || character.position.x;
                    character.position.y = character.targetPosition?.y || character.position.y;
                    
                    // Check if this was a roaming target
                    if (character.isRoaming && character.state === 'idle') {
                        // Set a timer for next roaming move
                        setTimeout(() => {
                            if (character.isRoaming && character.state === 'idle') {
                                this.startRoaming(character);
                            }
                        }, 2000 + Math.random() * 3000); // 2-5 second pause
                    }
                }
            }
        });
    }

    /**
     * Get starting position for character
     */
    getStartingPosition(characterName) {
        return this.characterStartingPositions[characterName] || { x: 50, y: 50 };
    }

    /**
     * Get bookie position
     */
    getBookiePosition() {
        return this.bookiePosition;
    }

    /**
     * Get random position on the canvas (avoiding obstacles)
     */
    getRandomPosition() {
        const margin = 50;
        const maxX = this.canvas.width - margin * 2;
        const maxY = this.canvas.height - margin * 2;
        
        // Define obstacle areas (scaled to 2D canvas)
        const obstacles = [
            // Bookie hub area
            { x: this.bookiePosition.x, y: this.bookiePosition.y, radius: 80 },
            
            // Road areas (approximate)
            { x: this.width / 2, y: this.height / 2, radius: 60 }, // Center intersection
        ];
        
        // Function to check if position conflicts with obstacles
        const isPositionClear = (x, y) => {
            // Check boundaries
            if (x < margin || x > this.width - margin || y < margin || y > this.height - margin) {
                return false;
            }
            
            // Check roads (avoid center lines)
            if ((Math.abs(x - this.width / 2) < 20) || (Math.abs(y - this.height / 2) < 20)) {
                return false;
            }
            
            // Check obstacles
            return !obstacles.some(obstacle => {
                const distance = Math.sqrt(
                    Math.pow(x - obstacle.x, 2) + Math.pow(y - obstacle.y, 2)
                );
                return distance < obstacle.radius;
            });
        };
        
        // Generate random position avoiding obstacles
        let x, y;
        let attempts = 0;
        const maxAttempts = 30;
        
        do {
            x = margin + Math.random() * maxX;
            y = margin + Math.random() * maxY;
            attempts++;
        } while (!isPositionClear(x, y) && attempts < maxAttempts);
        
        // If we couldn't find a clear position, use safe fallback positions
        if (attempts >= maxAttempts) {
            const fallbackPositions = [
                { x: 100, y: 100 }, { x: this.width - 100, y: 100 },
                { x: 100, y: this.height - 100 }, { x: this.width - 100, y: this.height - 100 },
                { x: this.width / 4, y: this.height / 4 }, { x: 3 * this.width / 4, y: 3 * this.height / 4 }
            ];
            const fallback = fallbackPositions[Math.floor(Math.random() * fallbackPositions.length)];
            console.log(`2D: Using fallback position: (${fallback.x}, ${fallback.y})`);
            return fallback;
        }
        
        console.log(`2D: Found clear position: (${x.toFixed(1)}, ${y.toFixed(1)}) after ${attempts} attempts`);
        return { x: x, y: y };
    }



    /**
     * Handle window resize
     */
    handleResize() {
        // Simple resize handling for fallback
        const rect = this.container.getBoundingClientRect();
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    /**
     * Reset the renderer to initial state
     */
    reset() {
        // Reset all characters to starting positions and idle state
        Object.keys(this.characters).forEach(name => {
            const character = this.characters[name];
            if (character) {
                const startPos = this.characterStartingPositions[name];
                character.position = { ...startPos };
                character.state = 'idle';
                character.emotion = { emoji: '😐', state: 'neutral', description: 'Ready to bet' };
                character.isWalking = false;
                character.targetPosition = null;
                character.isRoaming = true;
                
                // Start roaming again after reset
                setTimeout(() => {
                    this.startRoaming(character);
                }, 1000 + Math.random() * 2000);
            }
        });
        
        console.log('2D fallback renderer reset to initial state with roaming enabled');
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.canvas && this.container) {
            this.container.removeChild(this.canvas);
        }
    }
}

// Make FallbackRenderer available globally
if (typeof window !== 'undefined') {
    window.FallbackRenderer = FallbackRenderer;
    console.log("FallbackRenderer class defined and available globally");
} 