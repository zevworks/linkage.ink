# Interactive 2D Linkage Simulator

A web-based mechanical linkage simulator that allows users to create, manipulate, and visualize mechanical linkage systems in real-time.

## Features

- **Interactive Linkage System**: Create and modify multi-rod mechanical linkages
- **Real-time Animation**: Smooth 60fps animation with physics simulation  
- **Path Tracing**: Visualize motion paths with fading trails
- **Touch & Mouse Support**: Works on desktop, tablet, and mobile devices
- **Camera Controls**: Pan and zoom with mouse wheel or pinch gestures
- **Dynamic Rod Management**: Add and remove rods to create complex mechanisms
- **Visual Feedback**: Selection highlighting and interactive manipulation

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd linkage
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage

### Controls
- **Play/Pause**: Start or stop the animation
- **Add Rod**: Add a new rod to extend the linkage
- **Remove Rod**: Remove the last rod from the linkage  
- **Clear Trace**: Clear all motion path traces

### Interaction
- **Drag** anchor points (blue circles) to move the base position
- **Drag** guide points (white circles with lines) to change rod constraints
- **Drag** rod endpoints to adjust rod lengths
- **Click** rod endpoints to toggle path tracing on/off
- **Pan** by dragging on empty canvas areas
- **Zoom** with mouse wheel or pinch gestures on touch devices

## Architecture

The application is built with a modular architecture:

- `LinkageMechanism`: Core physics and linkage calculations
- `Camera`: Pan/zoom functionality and coordinate transformations  
- `TraceSystem`: Path tracking and visualization with fade effects
- `Renderer`: Canvas drawing and visual representation
- `InputHandler`: Mouse and touch event processing
- `UIController`: Button interactions and state management

Built with:
- **p5.js** for graphics and canvas management
- **Vite** for fast development and building
- **ES6 Modules** for clean code organization

## License

MIT License