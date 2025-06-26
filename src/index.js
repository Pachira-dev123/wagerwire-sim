// Import Three.js and OrbitControls
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Make THREE and OrbitControls globally available for compatibility
window.THREE = THREE;
window.THREE.OrbitControls = OrbitControls;

// Import styles
import './style.css';

// Import Supabase
import { createClient } from '@supabase/supabase-js';
window.supabase = { createClient };

// Import our modules
import { Config } from './config.js';
import { SupabaseClient } from './supabase-client.js';
import * as BettingEngine from './betting-engine.js';
import { ThreeRenderer } from './three-renderer.js';
import { FallbackRenderer } from './fallback-renderer.js';
import { BettingSimulation } from './simulation.js';

// Make classes globally available for compatibility
window.Config = Config;
window.SupabaseClient = SupabaseClient;
window.BettingEngine = BettingEngine;
window.ThreeRenderer = ThreeRenderer;
window.FallbackRenderer = FallbackRenderer;
window.BettingSimulation = BettingSimulation;

// Make betting engine functions globally available
window.calculateEnhancedPredictedResult = BettingEngine.calculateEnhancedPredictedResult;
window.calculatePredictedResult = BettingEngine.calculatePredictedResult;
window.calculatePayout = BettingEngine.calculatePayout;
window.getEmotionFromResult = BettingEngine.getEmotionFromResult;
window.getInProgressEmotion = BettingEngine.getInProgressEmotion;

// Initialize simulation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, Three.js version:', THREE.REVISION);
    console.log('OrbitControls available:', typeof OrbitControls !== 'undefined');
    
    // Create global instances
    window.wagerwireConfig = new Config();
    window.supabaseClient = new SupabaseClient();
    window.bettingEngine = BettingEngine; // This is already an object with functions
    window.simulation = new BettingSimulation();
}); 