import React from 'react';
import './ProfileCard.css';

const ProfileCard = ({ user, isOwnProfile = false, onEditClick }) => {
  if (!user) return null;

  return (
    <div className="profile-card-container">
      {/* Profile Header Banner */}
      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          <img
            src={user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
            alt={user.name}
            className="profile-avatar"
          />
        </div>
        <div className="profile-main-info">
          <div className="profile-title-row">
            <div>
              <h2 className="profile-name">{user.name}</h2>
              <p className="profile-role">{user.role}</p>
              <p className="profile-org">{user.organization}</p>
            </div>
            {isOwnProfile && (
              <button className="btn btn-outline" onClick={onEditClick}>
                Edit Profile
              </button>
            )}
          </div>
          <p className="profile-bio">{user.bio}</p>
          
          {user.collaboration?.lookingForCollaboration && (
            <div className="collaboration-banner">
              <strong>Available for Collaboration:</strong>{' '}
              {user.collaboration.collaborationAreas?.join(', ') || 'Research, Open Source, Papers'}
            </div>
          )}
        </div>
      </div>

      {/* Skills & Research Interests Grid */}
      <div className="profile-grid">
        <div className="profile-section-card">
          <h3>Research Interests</h3>
          <div className="tag-flex">
            {user.researchInterests && user.researchInterests.length > 0 ? (
              user.researchInterests.map((interest, idx) => (
                <span key={idx} className="badge badge-primary badge-lg">
                  {interest}
                </span>
              ))
            ) : (
              <p className="text-muted">No research interests listed.</p>
            )}
          </div>
        </div>

        <div className="profile-section-card">
          <h3>Professional Skills & Expertise</h3>
          <div className="tag-flex">
            {user.skills && user.skills.length > 0 ? (
              user.skills.map((skill, idx) => (
                <span key={idx} className="badge badge-teal badge-lg">
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-muted">No skills listed.</p>
            )}
          </div>
        </div>
      </div>

      {/* Research Publications Showcase */}
      <div className="profile-section-card full-width-card">
        <h3>Published Research Work & Papers</h3>
        {user.publications && user.publications.length > 0 ? (
          <div className="publication-list">
            {user.publications.map((pub, idx) => (
              <div key={idx} className="publication-item">
                <h4 className="pub-title">{pub.title}</h4>
                {pub.publicationVenue && (
                  <span className="pub-venue">Published in: {pub.publicationVenue}</span>
                )}
                {pub.abstract && <p className="pub-abstract">{pub.abstract}</p>}
                
                <div className="pub-links">
                  {pub.doiLink && (
                    <a href={pub.doiLink} target="_blank" rel="noreferrer" className="pub-link">
                      DOI Link
                    </a>
                  )}
                  {pub.publicationLink && (
                    <a href={pub.publicationLink} target="_blank" rel="noreferrer" className="pub-link">
                      Paper Link
                    </a>
                  )}
                  {pub.githubLink && (
                    <a href={pub.githubLink} target="_blank" rel="noreferrer" className="pub-link">
                      Code / Repository
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No publications added yet.</p>
        )}
      </div>

      {/* Projects Showcase */}
      <div className="profile-section-card full-width-card">
        <h3>Notable Projects & Innovations</h3>
        {user.projects && user.projects.length > 0 ? (
          <div className="project-grid">
            {user.projects.map((proj, idx) => (
              <div key={idx} className="project-item">
                <h4 className="proj-title">{proj.title}</h4>
                <p className="proj-desc">{proj.description}</p>
                {proj.techStack && proj.techStack.length > 0 && (
                  <div className="tag-flex">
                    {proj.techStack.map((tech, tIdx) => (
                      <span key={tIdx} className="badge badge-gray">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {proj.link && (
                  <a href={proj.link} target="_blank" rel="noreferrer" className="proj-link">
                    View Project
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No projects added yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
