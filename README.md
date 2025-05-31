# WagerWire Betting Simulation

A real-time betting simulation featuring animated characters that place bets, react to outcomes, and interact with live sports data. Built with vanilla JavaScript and Canvas API.

![WagerWire Demo](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=WagerWire+Betting+Simulation)

## 🎯 Features

### 🎭 Character System
- **Benny 'the Bankrupt' Doyle** - The optimistic underdog
- **Max 'Stacks' Romano** - The high-roller with deep pockets  
- **Ellie 'EV' Tanaka** - The analytical value hunter

Each character has:
- Individual bankrolls and betting strategies
- Emotional reactions to bet outcomes
- Animated walking and betting behaviors
- Real-time stats tracking

### 🎮 Real-time Simulation
- Live sports data integration via SofaScore API
- Automatic bet processing and settlement
- Character animations and state management
- Audio feedback for bet events
- Comprehensive logging system

### 📊 Betting Engine
- Support for multiple bet types:
  - Over/Under totals
  - Asian Handicaps
  - Moneyline bets
- Accurate payout calculations
- Win/loss/push determination
- Historical performance tracking

### 🗄️ Database Integration
- Supabase backend for bet storage
- Real-time data synchronization
- Configurable table mapping
- Secure credential management

## 🚀 Quick Start

### Prerequisites
- Modern web browser with ES6+ support
- Python 3.x (for local development server)
- Supabase account (for data storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pachira-dev123/wagerwire-sim.git
   cd wagerwire-sim
   ```

2. **Start local server**
   ```bash
   python -m http.server 3000
   ```

3. **Open in browser**
   ```
   http://localhost:3000
   ```

### Configuration

1. **Set up Supabase credentials**
   - Enter your Supabase URL and anon key in the UI
   - Or configure via `js/config.js`

2. **Configure data table**
   - Ensure your Supabase table has the required columns:
     - `id`, `character`, `stake`, `eventid`, `price`
     - `selection_combo`, `selection_line`, `bet_time_score`
     - `result`, `created_at`

## 📁 Project Structure

```
wagerwire-sim/
├── index.html              # Main application page
├── style.css              # Application styles
├── js/
│   ├── simulation.js       # Main simulation logic
│   ├── canvas-renderer.js  # Character animations
│   ├── betting-engine.js   # Bet calculations
│   ├── supabase-client.js  # Database integration
│   └── config.js          # Configuration management
├── build-config.js        # Build configuration
├── package.json           # Dependencies
└── README.md             # This file
```

## 🎮 Usage

### Starting a Simulation

1. **Connect to Supabase**
   - Enter your credentials in the connection panel
   - Click "Connect to Supabase"

2. **Load betting data**
   - The simulation will automatically load existing bets
   - Or insert test data using: `simulation.insertTestData()`

3. **Start simulation**
   - Click "Start Simulation"
   - Characters will begin processing bets every 15 seconds

### Console Commands

```javascript
// Load bets manually
simulation.loadBetsManually()

// Check queue status
simulation.getQueueStatus()

// Insert test data
simulation.insertTestData()

// Find available tables
simulation.findDataTable()
```

## 🔧 API Integration

### SofaScore Proxy
The simulation uses a proxy endpoint to fetch live sports data:
```
https://us-central1-pachira-betform.cloudfunctions.net/sofascoreProxy/sofascore-event
```

### Supported Event Data
- Live match scores
- Match status (not started, in progress, finished)
- Team information
- Real-time score updates

## 🎨 Character Behaviors

### States
- **Idle**: Waiting for new bets
- **Walking**: Moving to place bet
- **Placing**: At the bookie counter
- **Waiting**: Bet placed, awaiting result
- **Celebrating/Disappointed**: Reacting to outcome

### Emotions
- 🎉 Joy (wins)
- 😊 Relief (half wins)
- 😐 Neutral (pushes)
- 😕 Annoyed (half losses)
- 😡 Anger (losses)
- 🤞 Hopeful (in progress, winning)
- 😰 Worried (in progress, losing)

## 🛠️ Development

### Adding New Characters
1. Add character data to `simulation.js`
2. Define starting position in `canvas-renderer.js`
3. Add character card to `index.html`

### Extending Bet Types
1. Update betting logic in `betting-engine.js`
2. Add new calculation methods
3. Update UI to display new bet types

### Custom Animations
1. Modify `canvas-renderer.js`
2. Add new character states
3. Implement custom drawing logic

## 🔒 Security

- Credentials are masked in the UI
- Local storage for session persistence
- No sensitive data in client-side code
- Secure Supabase RLS policies recommended

## 🐛 Troubleshooting

### Common Issues

**Connection Failed**
- Verify Supabase URL and key
- Check network connectivity
- Ensure table exists and is accessible

**No Bets Loading**
- Check table name configuration
- Verify data format matches expected schema
- Use `simulation.findDataTable()` to debug

**API Errors**
- Verify event IDs are valid
- Check SofaScore proxy availability
- Monitor browser console for errors

## 📈 Performance

- Optimized Canvas rendering
- Efficient bet processing
- Minimal API calls
- Local state management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- SofaScore for sports data
- Supabase for backend services
- Canvas API for animations
- The betting community for inspiration

## 📞 Support

For questions or issues:
- Open a GitHub issue
- Check the troubleshooting section
- Review console logs for errors

---

**Note**: This is a simulation for educational purposes. Please gamble responsibly. 