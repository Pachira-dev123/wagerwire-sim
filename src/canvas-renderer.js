/**
 * Canvas Renderer for WagerWire Simulation
 * Handles visual rendering of the city, characters, and animations
 */

class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // City layout
        this.bookiePosition = { x: this.width / 2, y: this.height / 2 };
        this.bookieRadius = 40;
        
        // Character starting positions
        this.startingPositions = {
            'Benny': { x: 100, y: 100 },
            'Max': { x: this.width - 100, y: 100 },
            'Ellie': { x: this.width / 2, y: this.height - 100 }
        };
        
        // Character colors
        this.characterColors = {
            'Benny': '#e74c3c',
            'Max': '#3498db',
            'Ellie': '#9b59b6'
        };
        
        // Animation properties
        this.animationFrame = null;
        this.lastFrameTime = 0;
        
        // Initialize canvas
        this.setupCanvas();
    }

    /**
     * Setup canvas properties and event listeners
     */
    setupCanvas() {
        // Set canvas style
        this.canvas.style.cursor = 'default';
        
        // Handle canvas resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Start animation loop
        this.startAnimation();
    }

    /**
     * Handle canvas resize
     */
    handleResize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Maintain aspect ratio
        const aspectRatio = 800 / 600;
        let newWidth = rect.width - 40; // Account for padding
        let newHeight = newWidth / aspectRatio;
        
        if (newHeight > rect.height - 40) {
            newHeight = rect.height - 40;
            newWidth = newHeight * aspectRatio;
        }
        
        this.canvas.style.width = `${newWidth}px`;
        this.canvas.style.height = `${newHeight}px`;
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        const animate = (currentTime) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            this.render(deltaTime);
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * Stop animation loop
     */
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Main render function
     * @param {number} deltaTime - Time since last frame
     */
    render(deltaTime) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw city background
        this.drawCityBackground();
        
        // Draw bookie
        this.drawBookie();
        
        // Draw characters
        this.drawCharacters(deltaTime);
        
        // Draw paths (if characters are walking)
        this.drawPaths();
    }

    /**
     * Draw city background with streets
     */
    drawCityBackground() {
        // Draw grass background
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#e8f5e8');
        gradient.addColorStop(1, '#d4f1d4');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw streets
        this.ctx.strokeStyle = '#bdc3c7';
        this.ctx.lineWidth = 8;
        this.ctx.lineCap = 'round';
        
        // Horizontal streets
        for (let y = 100; y < this.height; y += 150) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        
        // Vertical streets
        for (let x = 100; x < this.width; x += 150) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Draw street markings
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        
        // Center lines
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
     * Draw the bookie shop
     */
    drawBookie() {
        const { x, y } = this.bookiePosition;
        
        // Draw building shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(x - this.bookieRadius + 3, y - this.bookieRadius + 3, 
                         this.bookieRadius * 2, this.bookieRadius * 2);
        
        // Draw building
        const buildingGradient = this.ctx.createLinearGradient(
            x - this.bookieRadius, y - this.bookieRadius,
            x + this.bookieRadius, y + this.bookieRadius
        );
        buildingGradient.addColorStop(0, '#ff6b6b');
        buildingGradient.addColorStop(1, '#ee5a24');
        
        this.ctx.fillStyle = buildingGradient;
        this.ctx.fillRect(x - this.bookieRadius, y - this.bookieRadius, 
                         this.bookieRadius * 2, this.bookieRadius * 2);
        
        // Draw building outline
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x - this.bookieRadius, y - this.bookieRadius, 
                           this.bookieRadius * 2, this.bookieRadius * 2);
        
        // Draw door
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(x - 8, y + 10, 16, 25);
        
        // Draw windows
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillRect(x - 25, y - 15, 12, 12);
        this.ctx.fillRect(x + 13, y - 15, 12, 12);
        
        // Draw sign
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('BOOKIE', x, y - 45);
        
        // Draw money symbols around bookie
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = '16px Arial';
        const time = Date.now() / 1000;
        for (let i = 0; i < 4; i++) {
            const angle = (time + i * Math.PI / 2) % (Math.PI * 2);
            const symbolX = x + Math.cos(angle) * 60;
            const symbolY = y + Math.sin(angle) * 60;
            this.ctx.fillText('💰', symbolX - 8, symbolY + 8);
        }
    }

    /**
     * Draw all characters
     * @param {number} deltaTime - Time since last frame
     */
    drawCharacters(deltaTime) {
        if (!window.simulation || !window.simulation.characters) return;
        
        Object.values(window.simulation.characters).forEach(character => {
            this.drawCharacter(character, deltaTime);
        });
    }

    /**
     * Draw a single character
     * @param {Object} character - Character object
     * @param {number} deltaTime - Time since last frame
     */
    drawCharacter(character, deltaTime) {
        const { x, y } = character.position;
        const radius = 20;
        const color = this.characterColors[character.name] || '#95a5a6';
        
        // Update walking animation
        if (character.state === 'walking_to_bookie') {
            character.walkAnimation = (character.walkAnimation || 0) + deltaTime * 0.01;
        }
        
        // Calculate animation offset
        let offsetX = 0;
        let offsetY = 0;
        
        if (character.state === 'walking_to_bookie') {
            offsetX = Math.sin(character.walkAnimation || 0) * 2;
            offsetY = Math.cos(character.walkAnimation || 0) * 1;
        } else if (character.state === 'joy') {
            const bounce = Math.sin(Date.now() * 0.01) * 3;
            offsetY = bounce;
        } else if (character.state === 'anger') {
            offsetX = Math.sin(Date.now() * 0.02) * 2;
        }
        
        // Draw character shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 2, y + radius + 2, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw character body
        const bodyGradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        bodyGradient.addColorStop(0, this.lightenColor(color, 20));
        bodyGradient.addColorStop(1, color);
        
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw character outline
        this.ctx.strokeStyle = this.darkenColor(color, 20);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw character initial
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(character.name[0], x + offsetX, y + offsetY);
        
        // Draw character name
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(character.name, x, y + radius + 15);
        
        // Draw bankroll
        this.ctx.fillStyle = '#27ae60';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(`£${character.bankroll.toLocaleString()}`, x, y + radius + 28);
        
        // Draw emotion
        if (character.emotion) {
            this.ctx.font = '20px Arial';
            this.ctx.fillText(character.emotion.emoji, x + radius + 5, y - radius);
        }
        
        // Draw status indicator
        this.drawStatusIndicator(character, x, y, radius);
    }

    /**
     * Draw status indicator for character
     * @param {Object} character - Character object
     * @param {number} x - Character x position
     * @param {number} y - Character y position
     * @param {number} radius - Character radius
     */
    drawStatusIndicator(character, x, y, radius) {
        let indicatorColor = '#95a5a6';
        let indicatorText = '';
        
        switch (character.state) {
            case 'idle':
                indicatorColor = '#95a5a6';
                indicatorText = '💤';
                break;
            case 'walking_to_bookie':
                indicatorColor = '#f39c12';
                indicatorText = '🚶';
                break;
            case 'placing_bet':
                indicatorColor = '#e67e22';
                indicatorText = '💰';
                break;
            case 'joy':
                indicatorColor = '#2ecc71';
                indicatorText = '🎉';
                break;
            case 'anger':
                indicatorColor = '#e74c3c';
                indicatorText = '😡';
                break;
            case 'hopeful':
                indicatorColor = '#3498db';
                indicatorText = '🤞';
                break;
            case 'worried':
                indicatorColor = '#f39c12';
                indicatorText = '😰';
                break;
        }
        
        // Draw status circle
        this.ctx.fillStyle = indicatorColor;
        this.ctx.beginPath();
        this.ctx.arc(x - radius - 10, y - radius, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw status text
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(indicatorText, x - radius - 10, y - radius + 4);
    }

    /**
     * Draw paths for walking characters
     */
    drawPaths() {
        if (!window.simulation || !window.simulation.characters) return;
        
        Object.values(window.simulation.characters).forEach(character => {
            if (character.state === 'walking_to_bookie') {
                this.drawPath(character.position, this.bookiePosition);
            }
        });
    }

    /**
     * Draw a path between two points
     * @param {Object} start - Start position {x, y}
     * @param {Object} end - End position {x, y}
     */
    drawPath(start, end) {
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    /**
     * Lighten a color by a percentage
     * @param {string} color - Hex color
     * @param {number} percent - Percentage to lighten
     * @returns {string} Lightened color
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Darken a color by a percentage
     * @param {string} color - Hex color
     * @param {number} percent - Percentage to darken
     * @returns {string} Darkened color
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }

    /**
     * Get starting position for a character
     * @param {string} characterName - Character name
     * @returns {Object} Position {x, y}
     */
    getStartingPosition(characterName) {
        return this.startingPositions[characterName] || { x: 50, y: 50 };
    }

    /**
     * Get bookie position
     * @returns {Object} Position {x, y}
     */
    getBookiePosition() {
        return this.bookiePosition;
    }

    /**
     * Cleanup renderer
     */
    destroy() {
        this.stopAnimation();
        window.removeEventListener('resize', this.handleResize);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CanvasRenderer = CanvasRenderer;
} 