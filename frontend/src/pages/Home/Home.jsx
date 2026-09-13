import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-container">
      {/* Hero Banner Section */}
      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-badge">Next-Gen Location-Based Networking</div>
          <h1 className="hero-title">
            Discover Professionals & Researchers <span className="highlight-text">Right Near You</span>
          </h1>
          <p className="hero-subtitle">
            Whether you are attending a research conference, tech summit, academic symposium, or campus workshop, connect with relevant experts nearby based on skills, research papers, and shared interests.
          </p>

          <div className="hero-actions">
            {user ? (
              <Link to="/discover" className="btn btn-primary btn-hero">
                Discover People Nearby
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-hero">
                  Join Network Now
                </Link>
                <Link to="/login" className="btn btn-outline btn-hero">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Core Features Grid Section */}
      <section className="features-section container">
        <h2 className="section-title">Built for Researchers, Students & Professionals</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <h3>Privacy-First GPS Discovery</h3>
            <p>
              Instantly find registered peers within 100m, 500m, 1km, or 5km radius. Exact coordinates are never shared with other users.
            </p>
          </div>

          <div className="feature-card">
            <h3>Smart Profile Match Score</h3>
            <p>
              Our intelligent relevance engine compares overlapping research domains, paper keywords, and technical skills to score compatibility.
            </p>
          </div>

          <div className="feature-card">
            <h3>Research Work Showcase</h3>
            <p>
              Showcase your publications, abstracts, DOI links, and GitHub repositories directly on your professional profile.
            </p>
          </div>

          <div className="feature-card">
            <h3>Real-Time Socket.io Chat</h3>
            <p>
              Establish mutual connections and engage in immediate 1-to-1 real-time messaging with nearby collaborators.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
