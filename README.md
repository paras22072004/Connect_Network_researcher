# GeoConnect: A Location-Based Professional and Research Networking Platform

GeoConnect is a full-stack minor project application designed to help professionals, students, researchers, and conference attendees discover, connect, and collaborate with relevant people nearby using GPS location, technical skills, and research domains—with strict privacy controls.

---

## 🌟 Key Features

1. **User Authentication & Persistent Session**: Secure registration and login using JWT tokens and bcrypt password hashing.
2. **Professional & Research Portfolio**: Showcases research papers, abstracts, DOI links, GitHub repositories, projects, and collaboration interests.
3. **GPS Geolocation & Spatial Discovery**: Uses the HTML5 Browser Geolocation API and MongoDB `GeoJSON Point` coordinates with a `2dsphere` index to locate nearby professionals within selectable radiuses (100m, 500m, 1km, 5km).
4. **Strict Location Privacy Guarantee**: Exact coordinates (`latitude`, `longitude`) are **NEVER** exposed to other users. The system obfuscates exact distances into human-readable approximate labels (`Less than 100 meters away`, `Within 500 meters`, `Within 1 km`, `Within 5 km`).
5. **Discoverable Mode Control**: Toggle discoverability ON or OFF from Settings to control whether your profile appears in nearby spatial queries.
6. **Smart Profile Match Score**: Calculates a rule-based percentage match score (0-100%) based on overlapping skills, research interests, and academic domains.
7. **Connection System**: Send, accept, reject, or cancel networking requests with state tracking (`pending`, `accepted`, `rejected`).
8. **Real-Time Socket.io Chat**: Instant 1-to-1 messaging, online/offline status indicators, and live typing feedback (restricted strictly to accepted connections).

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js 18 (Vite)
- **Routing**: React Router DOM v6
- **Styling**: Pure CSS & CSS Variables (No Tailwind CSS, Bootstrap, or UI frameworks used)
- **HTTP Client**: Axios
- **Real-Time Messaging**: Socket.io Client

### Backend
- **Runtime**: Node.js & Express.js
- **Database**: MongoDB with Mongoose ODM
- **Geospatial Index**: MongoDB `2dsphere` index on GeoJSON `Point` fields
- **Real-Time Engine**: Socket.io Server
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs

---

## 📂 Project Folder Structure

```
location-networking-platform/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection setup
│   ├── controllers/
│   │   ├── authController.js     # Register, Login, Current User API
│   │   ├── userController.js     # Profile retrieval & updates
│   │   ├── locationController.js # GPS location update & nearby spatial queries
│   │   ├── connectionController.js # Connection request lifecycle
│   │   └── messageController.js  # Chat history & direct messaging
│   ├── models/
│   │   ├── User.js               # User schema with GeoJSON Point & 2dsphere index
│   │   ├── Connection.js         # Networking connection request schema
│   │   └── Message.js            # Direct message schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── locationRoutes.js
│   │   ├── connectionRoutes.js
│   │   └── messageRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT token verification
│   │   └── errorMiddleware.js    # Global error & 404 handler
│   ├── services/
│   │   └── matchService.js       # Smart profile relevance algorithm
│   ├── utils/
│   │   ├── distanceCalculator.js # Haversine formula & privacy distance labeler
│   │   └── jwtUtils.js           # Token generation helper
│   ├── socket/
│   │   └── socketHandler.js      # Socket.io connection & chat events
│   ├── server.js                 # Main Express server entry point
│   ├── .env.example              # Environment variables template
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar/           # Responsive navigation header
│   │   │   ├── ProfileCard/      # Full profile card & publication showcase
│   │   │   ├── NearbyUserCard/   # Discovered professional card
│   │   │   ├── ConnectionButton/ # Dynamic connection request buttons
│   │   │   ├── Loading/          # Spinner loading indicator
│   │   │   └── common/           # EmptyState component
│   │   ├── pages/
│   │   │   ├── Home/             # Landing page
│   │   │   ├── Login/            # Authentication sign-in
│   │   │   ├── Register/         # Account registration
│   │   │   ├── Discover/         # Geolocation discovery & radius selection
│   │   │   ├── Profile/          # Portfolio showcase view
│   │   │   ├── EditProfile/      # Portfolio editor
│   │   │   ├── Connections/      # Connection manager
│   │   │   ├── Messages/         # Real-time Socket.io chat window
│   │   │   └── Settings/         # Privacy & discoverability settings
│   │   ├── context/              # Auth, Location, and Socket context providers
│   │   ├── services/             # Axios API service modules
│   │   ├── styles/               # Global CSS variables & CSS resets
│   │   ├── App.jsx               # Main router & protected routes
│   │   └── main.jsx              # React app entry point
│   ├── package.json
│   └── README.md
│
├── README.md                     # Root documentation
└── .gitignore
```

---

## ⚡ Setup & Run Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Server running locally or a MongoDB Atlas URI

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/location_networking_db
   JWT_SECRET=supersecret_location_networking_jwt_key_2026
   CLIENT_URL=http://localhost:5173
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend API will run at `http://localhost:5000`.

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:5173`.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user & return JWT | Public |
| `GET` | `/api/auth/me` | Get current user session | Private |
| `GET` | `/api/users/profile` | Get logged-in user profile | Private |
| `PUT` | `/api/users/profile` | Update profile, papers, projects | Private |
| `GET` | `/api/users/:id` | Get user profile by ID (privacy safe) | Private |
| `POST` | `/api/location/update` | Update user location in GeoJSON format | Private |
| `GET` | `/api/location/nearby` | Query nearby users within radius | Private |
| `POST` | `/api/connections/request/:userId` | Send connection request | Private |
| `PUT` | `/api/connections/accept/:connectionId` | Accept connection request | Private |
| `PUT` | `/api/connections/reject/:connectionId` | Reject connection request | Private |
| `DELETE` | `/api/connections/cancel/:connectionId` | Cancel request or remove contact | Private |
| `GET` | `/api/connections` | Get accepted connections list | Private |
| `GET` | `/api/connections/requests` | Get pending incoming/outgoing requests | Private |
| `GET` | `/api/messages/:userId` | Get chat history with user | Private |
| `POST` | `/api/messages/:userId` | Send direct message (REST fallback) | Private |

---

## 🔒 Location & Privacy Implementation

### GeoJSON Point Storage
User locations are stored using standard GeoJSON format in MongoDB:
```json
{
  "location": {
    "type": "Point",
    "coordinates": [77.2090, 28.6139]  // [longitude, latitude]
  }
}
```
A `2dsphere` index is created on the `location` field to execute `$near` spatial queries.

### Privacy Obfuscation
Raw coordinates are **never** returned in API responses. The backend converts exact distances in meters to privacy labels:
- `< 100m` -> `"Less than 100 meters away"`
- `<= 500m` -> `"Within 500 meters"`
- `<= 1000m` -> `"Within 1 km"`
- `<= 5000m` -> `"Within 5 km"`
