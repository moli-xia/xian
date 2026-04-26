# Xian (仙) - WebGL Xianxia Cultivation Game

A 3D Xianxia (Immortal Cultivation) game built with **TypeScript** and **Three.js**, running in the browser.

## Features

- **3D Graphics:** Powered by Three.js with custom shaders, bloom effects, and skeletal animations.
- **Xianxia Theme:** Immerse yourself in a world of immortal cultivators, flying swords, and magical artifacts.
- **Combat System:** Real-time combat with different cultivators, health bars, and skills.
- **Skills & Orbs:** Collect various orbs (Blade, Speed, Lightning, Dash, Wall, Heal) to enhance your power and unlock active skills.
- **Audio:** Immersive background music and sound effects.

## Tech Stack

- **Framework:** Vite
- **Language:** TypeScript
- **3D Library:** Three.js (including Post-processing, FBXLoader, GLTFLoader)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/moli-xia/xian.git
   cd xian
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Controls
*(Assuming standard WASD/Arrow keys for movement, space for action, etc. - Update as necessary)*
- Move: `W` `A` `S` `D` / Arrow Keys
- Skills: Number keys or mouse clicks (Depends on implementation)

## Assets
The game uses various 3D models (`.fbx`, `.glb`) and textures/audio files located in the `src/assets` directory. All assets are configured to be loaded dynamically during gameplay.

## License

MIT License
