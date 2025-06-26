/**
 * Three.js Renderer for WagerWire Simulation
 * Creates a 3D world with characters, environment, and Bookie Hub
 */

export class ThreeRenderer {
    constructor(containerId) {
        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            throw new Error('Three.js is not loaded. Please ensure Three.js is loaded before initializing ThreeRenderer.');
        }
        
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found.`);
        }
        
        console.log('Initializing Three.js scene...');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.clock = new THREE.Clock();
        
        // World dimensions
        this.worldSize = 100;
        this.bookiePosition = { x: 0, y: 0, z: 0 };
        
        // Character management
        this.characters = {};
        this.characterStartingPositions = {
            'Benny': { x: -40, y: 0, z: -40 },
            'Max': { x: 40, y: 0, z: -40 },
            'Ellie': { x: 0, y: 0, z: 40 }
        };
        
        // Animation properties
        this.animationFrame = null;
        this.mixers = [];
        
        // Environment objects
        this.houses = [];
        this.cars = [];
        this.trees = [];
        
        // Ticker tape system
        this.tickerTape = null;
        this.tickerTexts = [];
        this.tickerSpeed = 0.0002;  // Reduced from 0.01 to 0.002 (5x slower)
        this.tickerRadius = 20;
        
        // Initialize the 3D world
        this.init();
    }

    /**
     * Initialize the Three.js scene
     */
    init() {
        try {
            console.log('Initializing Three.js scene...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                throw new Error('DOM not ready for Three.js initialization');
            }
            
            // Verify container exists and is valid
            if (!this.container || !this.container.parentNode) {
                throw new Error('Invalid or detached container element');
            }
            
            this.scene = new THREE.Scene();
            
            console.log('Setting up renderer...');
            this.setupRenderer();
            
            console.log('Setting up camera...');
            this.setupCamera();
            
            console.log('Setting up lights...');
            this.setupLights();
            
            console.log('Setting up environment...');
            this.setupEnvironment();
            
            console.log('Setting up bookie hub...');
            this.setupBookieHub();
            
            console.log('Setting up controls...');
            this.setupControls();
            
            console.log('Starting animation...');
            this.startAnimation();
            
            // Handle window resize
            window.addEventListener('resize', () => this.handleResize());
            
            console.log('Three.js renderer initialization complete!');
        } catch (error) {
            console.error('Error during Three.js initialization:', error);
            throw error;
        }
    }

    /**
     * Setup the WebGL renderer
     */
    setupRenderer() {
        try {
            // Check if container exists and is valid
            if (!this.container || !this.container.appendChild) {
                throw new Error('Invalid container element for Three.js renderer');
            }
            
            // Get container dimensions safely
            const width = this.container.clientWidth || 800;
            const height = this.container.clientHeight || 600;
            
            this.renderer.setSize(width, height);
            this.renderer.setClearColor(0x87CEEB, 1); // Sky blue
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Clear container before adding canvas
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
            
            this.container.appendChild(this.renderer.domElement);
            console.log('WebGL renderer setup successful');
        } catch (error) {
            console.error('Error setting up WebGL renderer:', error);
            throw error;
        }
    }

    /**
     * Setup camera position and properties
     */
    setupCamera() {
        this.camera.position.set(50, 60, 50);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Setup lighting for the scene
     */
    setupLights() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Point light at bookie hub
        const pointLight = new THREE.PointLight(0xffaa00, 1, 30);
        pointLight.position.set(0, 10, 0);
        pointLight.castShadow = true;
        this.scene.add(pointLight);
    }

    /**
     * Setup the ground and environment
     */
    setupEnvironment() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add roads
        this.createRoads();
        
        // Add houses around the perimeter
        this.createHouses();
        
        // Add cars parked around
        this.createCars();
        
        // Add trees for decoration
        this.createTrees();
        
        // Add street lights
        this.createStreetLights();
    }

    /**
     * Create road network
     */
    createRoads() {
        const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        // Main cross roads
        const mainRoadGeometry = new THREE.PlaneGeometry(this.worldSize, 8);
        const mainRoadH = new THREE.Mesh(mainRoadGeometry, roadMaterial);
        mainRoadH.rotation.x = -Math.PI / 2;
        mainRoadH.position.y = 0.01;
        this.scene.add(mainRoadH);

        const mainRoadV = new THREE.Mesh(mainRoadGeometry, roadMaterial);
        mainRoadV.rotation.x = -Math.PI / 2;
        mainRoadV.rotation.z = Math.PI / 2;
        mainRoadV.position.y = 0.01;
        this.scene.add(mainRoadV);

        // Road markings
        const lineGeometry = new THREE.PlaneGeometry(this.worldSize * 0.8, 0.3);
        const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
        
        const centerLineH = new THREE.Mesh(lineGeometry, lineMaterial);
        centerLineH.rotation.x = -Math.PI / 2;
        centerLineH.position.y = 0.02;
        this.scene.add(centerLineH);

        const centerLineV = new THREE.Mesh(lineGeometry, lineMaterial);
        centerLineV.rotation.x = -Math.PI / 2;
        centerLineV.rotation.z = Math.PI / 2;
        centerLineV.position.y = 0.02;
        this.scene.add(centerLineV);
    }

    /**
     * Create houses around the world
     */
    createHouses() {
        const housePositions = [
            { x: -30, z: -30 }, { x: -15, z: -30 }, { x: 15, z: -30 }, { x: 30, z: -30 },
            { x: -30, z: 30 }, { x: -15, z: 30 }, { x: 15, z: 30 }, { x: 30, z: 30 },
            { x: -30, z: -15 }, { x: -30, z: 15 }, { x: 30, z: -15 }, { x: 30, z: 15 }
        ];

        housePositions.forEach((pos, index) => {
            const house = this.createHouse(index);
            house.position.set(pos.x, 0, pos.z);
            this.scene.add(house);
            this.houses.push(house);
        });
    }

    /**
     * Create a single house
     */
    createHouse(index) {
        const houseGroup = new THREE.Group();
        
        // House colors
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3];
        const color = colors[index % colors.length];
        
        // House base
        const baseGeometry = new THREE.BoxGeometry(8, 6, 8);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: color });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 3;
        base.castShadow = true;
        base.receiveShadow = true;
        houseGroup.add(base);

        // Roof
        const roofGeometry = new THREE.ConeGeometry(6, 4, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 8;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);

        // Door
        const doorGeometry = new THREE.BoxGeometry(1.5, 3, 0.2);
        const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1.5, 4.1);
        houseGroup.add(door);

        // Windows
        const windowGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.1);
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87ceeb });
        
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(-2, 3, 4.05);
        houseGroup.add(window1);
        
        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(2, 3, 4.05);
        houseGroup.add(window2);

        return houseGroup;
    }

    /**
     * Create cars parked around the world
     */
    createCars() {
        const carPositions = [
            { x: -25, z: -8, rotation: 0 },
            { x: -10, z: 8, rotation: Math.PI },
            { x: 10, z: -8, rotation: 0 },
            { x: 25, z: 8, rotation: Math.PI },
            { x: 8, z: -25, rotation: Math.PI / 2 },
            { x: -8, z: 25, rotation: -Math.PI / 2 }
        ];

        carPositions.forEach((pos, index) => {
            const car = this.createCar(index);
            car.position.set(pos.x, 0, pos.z);
            car.rotation.y = pos.rotation;
            this.scene.add(car);
            this.cars.push(car);
        });
    }

    /**
     * Create a single car
     */
    createCar(index) {
        const carGroup = new THREE.Group();
        
        // Car colors
        const colors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff];
        const color = colors[index % colors.length];
        
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        carGroup.add(body);

        // Car roof
        const roofGeometry = new THREE.BoxGeometry(2.5, 1, 1.8);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: color });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 2;
        roof.castShadow = true;
        carGroup.add(roof);

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        const wheelPositions = [
            { x: 1.2, y: 0.4, z: 1.2 },
            { x: 1.2, y: 0.4, z: -1.2 },
            { x: -1.2, y: 0.4, z: 1.2 },
            { x: -1.2, y: 0.4, z: -1.2 }
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.rotation.z = Math.PI / 2;
            carGroup.add(wheel);
        });

        return carGroup;
    }

    /**
     * Create trees for decoration
     */
    createTrees() {
        const treePositions = [
            { x: -35, z: -35 }, { x: 35, z: -35 }, { x: -35, z: 35 }, { x: 35, z: 35 },
            { x: -20, z: -40 }, { x: 20, z: -40 }, { x: -20, z: 40 }, { x: 20, z: 40 },
            { x: -40, z: -20 }, { x: 40, z: -20 }, { x: -40, z: 20 }, { x: 40, z: 20 }
        ];

        treePositions.forEach(pos => {
            const tree = this.createTree();
            tree.position.set(pos.x, 0, pos.z);
            this.scene.add(tree);
            this.trees.push(tree);
        });
    }

    /**
     * Create a single tree
     */
    createTree() {
        const treeGroup = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 6, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // Tree foliage
        const foliageGeometry = new THREE.SphereGeometry(4, 8, 6);
        const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 8;
        foliage.castShadow = true;
        treeGroup.add(foliage);

        return treeGroup;
    }

    /**
     * Create street lights
     */
    createStreetLights() {
        const lightPositions = [
            { x: -15, z: -15 }, { x: 15, z: -15 }, { x: -15, z: 15 }, { x: 15, z: 15 }
        ];

        lightPositions.forEach(pos => {
            const streetLight = this.createStreetLight();
            streetLight.position.set(pos.x, 0, pos.z);
            this.scene.add(streetLight);
        });
    }

    /**
     * Create a single street light
     */
    createStreetLight() {
        const lightGroup = new THREE.Group();
        
        // Light pole
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 4;
        pole.castShadow = true;
        lightGroup.add(pole);

        // Light fixture
        const fixtureGeometry = new THREE.SphereGeometry(0.8, 8, 6);
        const fixtureMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffff88,
            emissive: 0x444400
        });
        const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
        fixture.position.y = 8.5;
        lightGroup.add(fixture);

        return lightGroup;
    }

    /**
     * Setup the central Bookie Hub
     */
    setupBookieHub() {
        const bookieGroup = new THREE.Group();
        
        // Main building
        const buildingGeometry = new THREE.BoxGeometry(12, 10, 12);
        const buildingMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff6b6b,
            emissive: 0x220000
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = 5;
        building.castShadow = true;
        building.receiveShadow = true;
        bookieGroup.add(building);

        // Bookie sign
        const signGeometry = new THREE.BoxGeometry(8, 2, 0.5);
        const signMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x000000,
            emissive: 0x001100
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, 8, 6.5);
        bookieGroup.add(sign);

        // Entrance
        const entranceGeometry = new THREE.BoxGeometry(3, 6, 0.5);
        const entranceMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
        entrance.position.set(0, 3, 6.5);
        bookieGroup.add(entrance);

        // Spinning money symbols
        const moneyGroup = new THREE.Group();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 15;
            
            const coinGeometry = new THREE.CylinderGeometry(1, 1, 0.3, 8);
            const coinMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xffd700,
                emissive: 0x332200
            });
            const coin = new THREE.Mesh(coinGeometry, coinMaterial);
            coin.position.set(
                Math.cos(angle) * radius, 
                8 + Math.sin(Date.now() * 0.001 + i) * 2, 
                Math.sin(angle) * radius
            );
            coin.rotation.x = Math.PI / 2;
            moneyGroup.add(coin);
        }
        
        bookieGroup.add(moneyGroup);
        bookieGroup.userData = { moneyGroup };
        
        this.scene.add(bookieGroup);
        this.bookieHub = bookieGroup;
        
        // Create ticker tape around the bookie hub
        this.createTickerTape();
    }

    /**
     * Create ticker tape around bookie hub
     */
    createTickerTape() {
        // Create ticker tape group
        this.tickerTape = new THREE.Group();
        
        // Sample upcoming bets (this will be updated from real data)
        const upcomingBets = [
            "🏈 MANCHESTER UTD vs LIVERPOOL - Over 2.5 Goals @ 1.85",
            "⚽ REAL MADRID vs BARCELONA - Real Madrid -0.5 @ 2.10", 
            "🏀 LAKERS vs WARRIORS - Under 220.5 Points @ 1.92",
            "🎾 DJOKOVIC vs NADAL - Djokovic -1.5 Sets @ 1.78",
            "🏈 CHELSEA vs ARSENAL - Over 3.5 Goals @ 2.45",
            "⚽ PSG vs BAYERN - PSG +0.25 @ 1.95"
        ];
        
        // Create text sprites for each bet
        upcomingBets.forEach((betText, index) => {
            const textSprite = this.createTickerTextSprite(betText);
            
            // Position sprites around the circle
            const angle = (index / upcomingBets.length) * Math.PI * 2;
            const radius = this.tickerRadius;
            
            textSprite.position.set(
                Math.cos(angle) * radius,
                12, // Height above ground
                Math.sin(angle) * radius
            );
            
            // Store original angle for rotation
            textSprite.userData = { 
                originalAngle: angle,
                betText: betText
            };
            
            this.tickerTape.add(textSprite);
            this.tickerTexts.push(textSprite);
        });
        
        this.scene.add(this.tickerTape);
        console.log(`Created ticker tape with ${upcomingBets.length} betting options`);
    }

    /**
     * Create a text sprite for ticker tape
     */
    createTickerTextSprite(text) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 1000;  // Increased from 800
        canvas.height = 120;  // Increased from 100
        
        // Style the text with better contrast
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add double border for better visibility
        context.strokeStyle = '#FFD700';
        context.lineWidth = 6;  // Increased from 4
        context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
        
        // Add text with better font and size
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 36px Arial, sans-serif';  // Increased from 32px
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add text shadow for better readability
        context.shadowColor = '#000000';
        context.shadowBlur = 4;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        // Split long text if needed
        const maxWidth = canvas.width - 60;  // Increased padding
        const words = text.split(' ');
        let lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = context.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        lines.push(currentLine);
        
        // Draw text lines with improved spacing
        const lineHeight = 40;  // Increased from 36
        const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight / 2);
        
        lines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, startY + index * lineHeight);
        });
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            alphaTest: 0.1,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        
        // Scale sprite larger for better readability
        sprite.scale.set(15, 2, 1);  // Increased from 12, 1.5, 1
        
        return sprite;
    }

    /**
     * Update ticker tape animation
     */
    updateTickerTape() {
        if (!this.tickerTape || !this.tickerTexts.length) return;
        
        const time = Date.now() * this.tickerSpeed;
        
        // Rotate each text sprite around the circle
        this.tickerTexts.forEach((sprite, index) => {
            const angle = sprite.userData.originalAngle + time;
            const radius = this.tickerRadius;
            
            sprite.position.set(
                Math.cos(angle) * radius,
                12,
                Math.sin(angle) * radius
            );
            
            // Make sprites face the camera
            sprite.lookAt(this.camera.position);
        });
    }

    /**
     * Add new bet to ticker tape
     */
    addBetToTicker(betText) {
        if (!this.tickerTape) return;
        
        // Remove oldest bet if we have too many
        if (this.tickerTexts.length >= 8) {
            const oldSprite = this.tickerTexts.shift();
            this.tickerTape.remove(oldSprite);
            if (oldSprite.material && oldSprite.material.map) {
                oldSprite.material.map.dispose();
            }
            if (oldSprite.material) {
                oldSprite.material.dispose();
            }
        }
        
        // Create new text sprite
        const textSprite = this.createTickerTextSprite(betText);
        
        // Position at the end of the circle
        const angle = this.tickerTexts.length > 0 ? 
            this.tickerTexts[this.tickerTexts.length - 1].userData.originalAngle + (Math.PI * 2 / 6) :
            0;
        
        textSprite.position.set(
            Math.cos(angle) * this.tickerRadius,
            12,
            Math.sin(angle) * this.tickerRadius
        );
        
        textSprite.userData = { 
            originalAngle: angle,
            betText: betText
        };
        
        this.tickerTape.add(textSprite);
        this.tickerTexts.push(textSprite);
        
        console.log(`Added new bet to ticker: ${betText}`);
    }

    /**
     * Clear all ticker tape content
     */
    clearTicker() {
        if (!this.tickerTape) return;
        
        // Remove all ticker sprites
        this.tickerTexts.forEach(sprite => {
            this.tickerTape.remove(sprite);
            if (sprite.material && sprite.material.map) {
                sprite.material.map.dispose();
            }
            if (sprite.material) {
                sprite.material.dispose();
            }
        });
        
        this.tickerTexts = [];
        console.log('Ticker tape cleared');
    }

    /**
     * Setup orbit controls for camera
     */
    setupControls() {
        try {
            // Check if OrbitControls is available
            if (typeof THREE.OrbitControls !== 'undefined') {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.maxPolarAngle = Math.PI / 2.2; // Prevent going under ground
                this.controls.minDistance = 20;
                this.controls.maxDistance = 150;
                this.controls.target.set(0, 0, 0); // Look at center
                console.log('OrbitControls initialized successfully');
            } else {
                console.warn('OrbitControls not available, using basic mouse controls');
                this.setupBasicControls();
            }
        } catch (error) {
            console.error('Error setting up controls:', error);
            this.setupBasicControls();
        }
    }

    /**
     * Setup basic mouse controls as fallback
     */
    setupBasicControls() {
        let isMouseDown = false;
        let mouseX = 0, mouseY = 0;
        
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (!isMouseDown) return;
            
            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;
            
            // Simple camera rotation
            this.camera.position.x = 50 * Math.cos(deltaX * 0.01);
            this.camera.position.z = 50 * Math.sin(deltaX * 0.01);
            this.camera.lookAt(0, 0, 0);
            
            mouseX = event.clientX;
            mouseY = event.clientY;
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
    }

    /**
     * Create a 3D character
     */
    createCharacter(name) {
        const characterGroup = new THREE.Group();
        characterGroup.userData = { 
            name: name,
            isWalking: false,
            walkAnimation: 0,
            emotionAnimation: 0,
            targetPosition: null,
            speed: 0.5,  // Increased from 0.1 to 0.5 for faster movement
            isRoaming: true,  // Characters roam when idle
            roamingTimer: Math.random() * 5000,  // Random initial delay
            lastRoamTime: Date.now(),
            state: 'idle'
        };
        
        // Character colors
        const colors = {
            'Benny': 0xe74c3c,
            'Max': 0x3498db,
            'Ellie': 0x9b59b6
        };
        const color = colors[name] || 0x95a5a6;
        
        // Character body (using cylinder instead of capsule for compatibility)
        const bodyGeometry = new THREE.CylinderGeometry(1, 1, 3, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2;
        body.castShadow = true;
        characterGroup.add(body);

        // Character head
        const headGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 4;
        head.castShadow = true;
        characterGroup.add(head);

        // Character eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.3, 4.2, 0.7);
        characterGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.3, 4.2, 0.7);
        characterGroup.add(rightEye);

        // Character legs
        const legGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.5, 0.5, 0);
        leftLeg.castShadow = true;
        characterGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.5, 0.5, 0);
        rightLeg.castShadow = true;
        characterGroup.add(rightLeg);

        // Character arms
        const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-1.2, 2.5, 0);
        leftArm.castShadow = true;
        characterGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(1.2, 2.5, 0);
        rightArm.castShadow = true;
        characterGroup.add(rightArm);

        // Name label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 32;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 128, 32);
        context.fillStyle = '#000000';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText(name, 64, 20);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMaterial);
        label.position.y = 6;
        label.scale.set(4, 1, 1);
        characterGroup.add(label);

        // Store references for animations
        characterGroup.userData.body = body;
        characterGroup.userData.head = head;
        characterGroup.userData.leftLeg = leftLeg;
        characterGroup.userData.rightLeg = rightLeg;
        characterGroup.userData.leftArm = leftArm;
        characterGroup.userData.rightArm = rightArm;
        characterGroup.userData.leftEye = leftEye;
        characterGroup.userData.rightEye = rightEye;
        
        // Set starting position
        const startPos = this.characterStartingPositions[name];
        characterGroup.position.set(startPos.x, 0, startPos.z);
        
        this.scene.add(characterGroup);
        this.characters[name] = characterGroup;
        
        // Start initial roaming after a short delay
        setTimeout(() => {
            this.startRoaming(characterGroup);
        }, 1000 + Math.random() * 2000);
        
        return characterGroup;
    }

    /**
     * Update character animation and state
     */
    updateCharacter(characterName, state, emotion, position) {
        const character = this.characters[characterName];
        if (!character) return;

        const userData = character.userData;
        const previousState = userData.state;
        userData.state = state;
        userData.emotion = emotion;

        // Stop roaming when character has a specific task
        if (state !== 'idle' && state !== 'waiting' && state !== 'neutral') {
            userData.isRoaming = false;
        }

        // Handle different states
        switch (state) {
            case 'walking_to_bookie':
                this.startWalkingToBookie(character);
                break;
            case 'placing_bet':
                this.animatePlacingBet(character);
                break;
            case 'joy':
                // First walk out from bookie, then celebrate
                this.startWalkingFromBookie(character, () => {
                    this.animateJoy(character);
                    // After celebrating, resume roaming
                    setTimeout(() => {
                        userData.isRoaming = true;
                        userData.state = 'idle';
                        this.startRoaming(character);
                    }, 3000);
                });
                break;
            case 'anger':
                // First walk out from bookie, then show anger
                this.startWalkingFromBookie(character, () => {
                    this.animateAnger(character);
                    // After being angry, resume roaming
                    setTimeout(() => {
                        userData.isRoaming = true;
                        userData.state = 'idle';
                        this.startRoaming(character);
                    }, 3000);
                });
                break;
            case 'idle':
                // Resume roaming if not already roaming
                if (!userData.isRoaming) {
                    userData.isRoaming = true;
                    this.startRoaming(character);
                } else {
                    this.animateIdle(character);
                }
                break;
            case 'waiting':
            case 'neutral':
                // Character is waiting for next bet or result - roam while waiting
                if (!userData.isRoaming) {
                    userData.isRoaming = true;
                    this.startRoaming(character);
                }
                break;
        }
    }

    /**
     * Start walking away from bookie hub before reacting
     */
    startWalkingFromBookie(character, callback) {
        const userData = character.userData;
        
        // Get a position away from bookie hub but not too far
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 10; // 15-25 units from bookie
        const walkOutPosition = {
            x: Math.cos(angle) * distance,
            y: 0,
            z: Math.sin(angle) * distance
        };
        
        // Start walking to that position
        userData.isWalking = true;
        userData.targetPosition = walkOutPosition;
        userData.isRoaming = false;
        
        console.log(`${userData.name} walking out from bookie to react at (${walkOutPosition.x.toFixed(1)}, ${walkOutPosition.z.toFixed(1)})`);
        
        // Set up a check to call callback when reached
        const checkArrival = setInterval(() => {
            const distance = character.position.distanceTo(new THREE.Vector3(walkOutPosition.x, walkOutPosition.y, walkOutPosition.z));
            if (distance < 3.0 || !userData.isWalking) {
                clearInterval(checkArrival);
                userData.isWalking = false;
                userData.targetPosition = null;
                if (callback) callback();
            }
        }, 100);
    }

    /**
     * Start roaming behavior for idle characters
     */
    startRoaming(character) {
        const userData = character.userData;
        if (!userData.isRoaming) return;
        
        // Set a new roaming target
        const roamPosition = this.getRandomPosition();
        
        // Make roaming targets closer to current position for more natural movement
        const currentPos = character.position;
        const maxRoamDistance = 20;
        
        roamPosition.x = currentPos.x + (Math.random() - 0.5) * maxRoamDistance;
        roamPosition.z = currentPos.z + (Math.random() - 0.5) * maxRoamDistance;
        
        // Keep within world bounds
        roamPosition.x = Math.max(-40, Math.min(40, roamPosition.x));
        roamPosition.z = Math.max(-40, Math.min(40, roamPosition.z));
        
        userData.isWalking = true;
        userData.targetPosition = roamPosition;
        userData.lastRoamTime = Date.now();
        
        console.log(`${userData.name} roaming to (${roamPosition.x.toFixed(1)}, ${roamPosition.z.toFixed(1)})`);
    }



    /**
     * Start walking animation to bookie
     */
    startWalkingToBookie(character) {
        const userData = character.userData;
        
        // Stop roaming behavior
        userData.isRoaming = false;
        
        userData.isWalking = true;
        userData.targetPosition = { x: 0, y: 0, z: 0 }; // Bookie position
        
        // Ensure character is visible and not stuck
        character.visible = true;
        character.position.y = 0;  // Ensure on ground level
        
        // Log for debugging
        console.log(`${userData.name} stopping roaming and walking from (${character.position.x.toFixed(1)}, ${character.position.z.toFixed(1)}) to bookie hub`);
        
        // Make character slightly larger while walking for visibility
        character.scale.set(1.1, 1.1, 1.1);
    }

    /**
     * Animate character placing bet
     */
    animatePlacingBet(character) {
        const userData = character.userData;
        const time = Date.now() * 0.005;
        
        // Bobbing animation
        character.position.y = Math.sin(time) * 0.2;
        
        // Arm movements
        if (userData.leftArm && userData.rightArm) {
            userData.leftArm.rotation.z = Math.sin(time) * 0.3;
            userData.rightArm.rotation.z = -Math.sin(time) * 0.3;
        }
    }

    /**
     * Animate character joy (winning)
     */
    animateJoy(character) {
        const userData = character.userData;
        const time = Date.now() * 0.01;
        
        // Jumping animation
        character.position.y = Math.abs(Math.sin(time)) * 2;
        
        // Arms up
        if (userData.leftArm && userData.rightArm) {
            userData.leftArm.rotation.z = Math.sin(time) * 0.5 + 0.5;
            userData.rightArm.rotation.z = -Math.sin(time) * 0.5 - 0.5;
        }
        
        // Happy eyes
        if (userData.leftEye && userData.rightEye) {
            userData.leftEye.scale.set(1.2, 0.8, 1.2);
            userData.rightEye.scale.set(1.2, 0.8, 1.2);
        }
    }

    /**
     * Animate character anger (losing)
     */
    animateAnger(character) {
        const userData = character.userData;
        const time = Date.now() * 0.02;
        
        // Shaking animation
        character.position.x += Math.sin(time) * 0.1;
        character.position.z += Math.cos(time) * 0.1;
        
        // Arms down and shaking
        if (userData.leftArm && userData.rightArm) {
            userData.leftArm.rotation.z = Math.sin(time) * 0.2;
            userData.rightArm.rotation.z = -Math.sin(time) * 0.2;
        }
        
        // Angry eyes
        if (userData.leftEye && userData.rightEye) {
            userData.leftEye.scale.set(0.8, 1.2, 0.8);
            userData.rightEye.scale.set(0.8, 1.2, 0.8);
        }
    }

    /**
     * Animate idle character
     */
    animateIdle(character) {
        const userData = character.userData;
        const time = Date.now() * 0.002;
        
        // Subtle breathing animation
        if (userData.body) {
            userData.body.scale.y = 1 + Math.sin(time) * 0.05;
        }
        
        // Reset eyes
        if (userData.leftEye && userData.rightEye) {
            userData.leftEye.scale.set(1, 1, 1);
            userData.rightEye.scale.set(1, 1, 1);
        }
        
        // Ensure character is visible but don't automatically reset position
        character.visible = true;
        character.scale.set(1, 1, 1);  // Reset to normal size
        
        // Only reset to starting position if character is walking or at origin
        if (userData.isWalking || (Math.abs(character.position.x) < 1 && Math.abs(character.position.z) < 1)) {
            const startPos = this.characterStartingPositions[userData.name];
            character.position.set(startPos.x, 0, startPos.z);
        }
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        const animate = () => {
            const deltaTime = this.clock.getDelta();
            
            this.updateAnimations(deltaTime);
            this.updateWalkingCharacters(deltaTime);
            this.updateBookieHub();
            this.updateTickerTape();
            
            if (this.controls) {
                this.controls.update();
            }
            
            this.renderer.render(this.scene, this.camera);
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }

    /**
     * Update character animations
     */
    updateAnimations(deltaTime) {
        Object.values(this.characters).forEach(character => {
            const userData = character.userData;
            
            if (userData.isWalking && userData.targetPosition) {
                // Walking animation
                userData.walkAnimation += deltaTime * 10;
                
                if (userData.leftLeg && userData.rightLeg) {
                    userData.leftLeg.rotation.x = Math.sin(userData.walkAnimation) * 0.5;
                    userData.rightLeg.rotation.x = -Math.sin(userData.walkAnimation) * 0.5;
                }
                
                if (userData.leftArm && userData.rightArm) {
                    userData.leftArm.rotation.x = -Math.sin(userData.walkAnimation) * 0.3;
                    userData.rightArm.rotation.x = Math.sin(userData.walkAnimation) * 0.3;
                }
            }
        });
    }

    /**
     * Update walking characters movement
     */
    updateWalkingCharacters(deltaTime) {
        Object.values(this.characters).forEach(character => {
            const userData = character.userData;
            
            if (userData.isWalking && userData.targetPosition) {
                const currentPos = character.position;
                const targetPos = userData.targetPosition;
                
                const direction = new THREE.Vector3()
                    .subVectors(targetPos, currentPos)
                    .normalize();
                
                const distance = currentPos.distanceTo(targetPos);
                
                // Make characters more visible while walking
                character.visible = true;
                
                if (distance > 2.0) {  // Increased threshold from 0.5 to 2.0
                    // Move towards target with consistent speed
                    const moveStep = direction.multiplyScalar(userData.speed);
                    character.position.add(moveStep);
                    
                    // Ensure character stays above ground
                    character.position.y = Math.max(0, character.position.y);
                    
                    // Face movement direction only if we have a significant direction
                    if (direction.length() > 0.1) {
                        const lookTarget = new THREE.Vector3()
                            .copy(character.position)
                            .add(direction);
                        character.lookAt(lookTarget);
                    }
                    
                    // Debug log for visibility
                    console.log(`${userData.name} walking: (${character.position.x.toFixed(1)}, ${character.position.z.toFixed(1)}) -> (${targetPos.x}, ${targetPos.z}), distance: ${distance.toFixed(1)}`);
                } else {
                    // Reached target
                    userData.isWalking = false;
                    userData.targetPosition = null;
                    
                    // Position exactly at target and ensure visibility
                    character.position.set(targetPos.x, 0, targetPos.z);
                    character.visible = true;
                    character.scale.set(1, 1, 1);  // Reset to normal size
                    
                    // Reset leg positions
                    if (userData.leftLeg && userData.rightLeg) {
                        userData.leftLeg.rotation.x = 0;
                        userData.rightLeg.rotation.x = 0;
                    }
                    
                    if (userData.leftArm && userData.rightArm) {
                        userData.leftArm.rotation.x = 0;
                        userData.rightArm.rotation.x = 0;
                    }
                    
                    // Check if this was a roaming target
                    if (userData.isRoaming && userData.state === 'idle') {
                        // Set a timer for next roaming move
                        setTimeout(() => {
                            if (userData.isRoaming && userData.state === 'idle') {
                                this.startRoaming(character);
                            }
                        }, 2000 + Math.random() * 3000); // 2-5 second pause
                    }
                    
                    console.log(`${userData.name} reached target at (${targetPos.x.toFixed(1)}, ${targetPos.z.toFixed(1)})`);
                }
            }
        });
    }

    /**
     * Update bookie hub animations
     */
    updateBookieHub() {
        if (this.bookieHub && this.bookieHub.userData.moneyGroup) {
            const time = Date.now() * 0.001;
            this.bookieHub.userData.moneyGroup.rotation.y = time;
            
            // Update individual coin positions
            this.bookieHub.userData.moneyGroup.children.forEach((coin, index) => {
                coin.position.y = 8 + Math.sin(time + index) * 2;
                coin.rotation.y = time * 2;
            });
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Get starting position for character
     */
    getStartingPosition(characterName) {
        return this.characterStartingPositions[characterName] || { x: 0, y: 0, z: 0 };
    }

    /**
     * Get bookie position
     */
    getBookiePosition() {
        return this.bookiePosition;
    }

    /**
     * Get random position on the map (avoiding obstacles)
     */
    getRandomPosition() {
        const margin = 20;
        const maxX = this.worldSize / 2 - margin;
        const maxZ = this.worldSize / 2 - margin;
        
        // Define obstacle positions
        const obstacles = [
            // Bookie hub area
            { x: 0, z: 0, radius: 15 },
            
            // Houses
            { x: -30, z: -30, radius: 8 }, { x: -15, z: -30, radius: 8 },
            { x: 15, z: -30, radius: 8 }, { x: 30, z: -30, radius: 8 },
            { x: -30, z: 30, radius: 8 }, { x: -15, z: 30, radius: 8 },
            { x: 15, z: 30, radius: 8 }, { x: 30, z: 30, radius: 8 },
            { x: -30, z: -15, radius: 8 }, { x: -30, z: 15, radius: 8 },
            { x: 30, z: -15, radius: 8 }, { x: 30, z: 15, radius: 8 },
            
            // Cars
            { x: -25, z: -8, radius: 5 }, { x: -10, z: 8, radius: 5 },
            { x: 10, z: -8, radius: 5 }, { x: 25, z: 8, radius: 5 },
            { x: 8, z: -25, radius: 5 }, { x: -8, z: 25, radius: 5 },
            
            // Trees
            { x: -35, z: -35, radius: 6 }, { x: 35, z: -35, radius: 6 },
            { x: -35, z: 35, radius: 6 }, { x: 35, z: 35, radius: 6 },
            { x: -20, z: -40, radius: 6 }, { x: 20, z: -40, radius: 6 },
            { x: -20, z: 40, radius: 6 }, { x: 20, z: 40, radius: 6 },
            { x: -40, z: -20, radius: 6 }, { x: 40, z: -20, radius: 6 },
            { x: -40, z: 20, radius: 6 }, { x: 40, z: 20, radius: 6 },
            
            // Street lights
            { x: -15, z: -15, radius: 3 }, { x: 15, z: -15, radius: 3 },
            { x: -15, z: 15, radius: 3 }, { x: 15, z: 15, radius: 3 }
        ];
        
        // Function to check if position conflicts with obstacles
        const isPositionClear = (x, z) => {
            // Check boundaries
            if (Math.abs(x) > maxX || Math.abs(z) > maxZ) {
                return false;
            }
            
            // Check roads (avoid center lines)
            if ((Math.abs(x) < 4 && Math.abs(z) < 50) || (Math.abs(z) < 4 && Math.abs(x) < 50)) {
                return false;
            }
            
            // Check obstacles
            return !obstacles.some(obstacle => {
                const distance = Math.sqrt(
                    Math.pow(x - obstacle.x, 2) + Math.pow(z - obstacle.z, 2)
                );
                return distance < obstacle.radius;
            });
        };
        
        // Generate random position avoiding obstacles
        let x, z;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            x = (Math.random() - 0.5) * maxX * 2;
            z = (Math.random() - 0.5) * maxZ * 2;
            attempts++;
        } while (!isPositionClear(x, z) && attempts < maxAttempts);
        
        // If we couldn't find a clear position, use safe fallback positions
        if (attempts >= maxAttempts) {
            const fallbackPositions = [
                { x: -25, z: 25 }, { x: 25, z: 25 }, { x: -25, z: -25 }, { x: 25, z: -25 },
                { x: 0, z: 35 }, { x: 0, z: -35 }, { x: 35, z: 0 }, { x: -35, z: 0 }
            ];
            const fallback = fallbackPositions[Math.floor(Math.random() * fallbackPositions.length)];
            console.log(`Using fallback position: (${fallback.x}, ${fallback.z})`);
            return { x: fallback.x, y: 0, z: fallback.z };
        }
        
        console.log(`Found clear position: (${x.toFixed(1)}, ${z.toFixed(1)}) after ${attempts} attempts`);
        return { x: x, y: 0, z: z };
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
                character.position.set(startPos.x, 0, startPos.z);
                character.userData.state = 'idle';
                character.userData.emotion = 'neutral';
                character.userData.isWalking = false;
                character.userData.targetPosition = null;
                character.userData.isRoaming = true;
                character.scale.set(1, 1, 1);
                character.visible = true;
                this.animateIdle(character);
                
                // Start roaming again after reset
                setTimeout(() => {
                    this.startRoaming(character);
                }, 1000 + Math.random() * 2000);
            }
        });
        
        console.log('Three.js renderer reset to initial state with roaming enabled');
    }

    /**
     * Stop animation and cleanup
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Remove all meshes from scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        // Remove canvas from DOM
        if (this.container && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// Make ThreeRenderer available globally
if (typeof window !== 'undefined') {
    window.ThreeRenderer = ThreeRenderer;
    console.log("ThreeRenderer class defined and available globally");
} else {
    console.warn("Window object not available, ThreeRenderer not exported");
} 