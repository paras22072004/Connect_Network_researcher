# Frontend Client - Location-Based Professional and Research Networking Platform

Vite + React single-page application built with clean modular architecture, pure CSS styling (no Tailwind CSS / Bootstrap), React Router, Axios, and Socket.io client.

## Tech Stack
- **Framework**: React.js 18 + Vite
- **Routing**: React Router DOM v6
- **State Management**: React Context (`AuthContext`, `LocationContext`, `SocketContext`)
- **API Client**: Axios
- **Real-Time Client**: Socket.io Client
- **Styling**: Vanilla CSS with CSS Variables & Component-specific stylesheets

## Setup & Running Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start local development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

3. Build for production:
   ```bash
   npm run build
   ```

## Page Components Overview
- `Home`: Landing overview and feature highlights
- `Login`: User authentication sign-in form
- `Register`: Professional registration form
- `Discover`: Geolocation discovery page with radius filtering (100m, 500m, 1km, 5km) and privacy distance labels
- `Profile`: Personal portfolio view showing research papers, projects, and collaboration areas
- `EditProfile`: Comprehensive portfolio editing page
- `Connections`: Tabbed manager for accepted contacts, incoming requests, and sent requests
- `Messages`: 2-column Socket.io real-time chat window
- `Settings`: Privacy controls for discoverability mode and discovery radius
