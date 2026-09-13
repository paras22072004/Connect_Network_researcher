# Backend API - Location-Based Professional and Research Networking Platform

Node.js, Express, MongoDB, and Socket.io backend server powering location-based discovery, GeoJSON spatial queries, professional matching, connection requests, and real-time chat.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose (GeoJSON `Point` & `2dsphere` index)
- **Real-Time Communication**: Socket.io
- **Security**: JWT Authentication, bcryptjs password hashing, CORS protection

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file based on `.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/location_networking_db
   JWT_SECRET=supersecret_location_networking_jwt_key_2026
   CLIENT_URL=http://localhost:5173
   ```

3. Start local MongoDB service (if running locally).

4. Run backend server:
   ```bash
   npm run dev
   # or
   npm start
   ```

## Key API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new professional account
- `POST /api/auth/login` - Authenticate user & receive JWT token
- `GET /api/auth/me` - Fetch logged-in user profile

### User Profile
- `GET /api/users/profile` - Fetch current user profile
- `PUT /api/users/profile` - Update user bio, skills, publications, projects, privacy settings
- `GET /api/users/:id` - Fetch public user profile (sanitized location)

### GPS & Location Discovery
- `POST /api/location/update` - Save `[longitude, latitude]` to MongoDB GeoJSON format
- `GET /api/location/nearby?radius=1000` - Query nearby discoverable users within specified radius in meters

### Connections
- `POST /api/connections/request/:userId` - Send connection request
- `PUT /api/connections/accept/:connectionId` - Accept pending connection
- `PUT /api/connections/reject/:connectionId` - Reject pending connection
- `DELETE /api/connections/cancel/:connectionId` - Cancel request / remove connection
- `GET /api/connections` - Get all accepted connections
- `GET /api/connections/requests` - Get pending incoming & outgoing requests

### Real-Time Messaging
- `GET /api/messages/:userId` - Fetch conversation history (accepted connections only)
- `POST /api/messages/:userId` - Send direct message (REST fallback)
- **Socket.io Events**: `send_message`, `receive_message`, `typing`, `stop_typing`, `get_online_users`
