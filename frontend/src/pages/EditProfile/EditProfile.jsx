import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../services/userService';
import './EditProfile.css';

const EditProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    profileImage: user?.profileImage || '',
    role: user?.role || '',
    organization: user?.organization || '',
    bio: user?.bio || '',
    skills: user?.skills ? user.skills.join(', ') : '',
    researchInterests: user?.researchInterests ? user.researchInterests.join(', ') : '',
    researchDomains: user?.researchDomains ? user.researchDomains.join(', ') : '',
    lookingForCollaboration: user?.collaboration?.lookingForCollaboration ?? true,
    collaborationAreas: user?.collaboration?.collaborationAreas ? user.collaboration.collaborationAreas.join(', ') : ''
  });

  // Publications state array
  const [publications, setPublications] = useState(user?.publications || []);
  const [newPub, setNewPub] = useState({
    title: '',
    publicationVenue: '',
    abstract: '',
    doiLink: '',
    githubLink: '',
    publicationLink: ''
  });

  // Projects state array
  const [projects, setProjects] = useState(user?.projects || []);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    techStack: '',
    link: ''
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Add a new paper publication
  const handleAddPublication = () => {
    if (!newPub.title.trim()) {
      alert('Please enter a paper title');
      return;
    }
    setPublications([...publications, { ...newPub }]);
    setNewPub({
      title: '',
      publicationVenue: '',
      abstract: '',
      doiLink: '',
      githubLink: '',
      publicationLink: ''
    });
  };

  const handleRemovePublication = (idx) => {
    setPublications(publications.filter((_, i) => i !== idx));
  };

  // Add a new project
  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      alert('Please enter a project title');
      return;
    }
    const techArray = newProject.techStack ? newProject.techStack.split(',').map(s => s.trim()).filter(Boolean) : [];
    setProjects([...projects, { ...newProject, techStack: techArray }]);
    setNewProject({ title: '', description: '', techStack: '', link: '' });
  };

  const handleRemoveProject = (idx) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        name: formData.name,
        profileImage: formData.profileImage,
        role: formData.role,
        organization: formData.organization,
        bio: formData.bio,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        researchInterests: formData.researchInterests.split(',').map(s => s.trim()).filter(Boolean),
        researchDomains: formData.researchDomains.split(',').map(s => s.trim()).filter(Boolean),
        publications,
        projects,
        collaboration: {
          lookingForCollaboration: formData.lookingForCollaboration,
          collaborationAreas: formData.collaborationAreas.split(',').map(s => s.trim()).filter(Boolean)
        }
      };

      const res = await updateUserProfile(payload);
      if (res.success) {
        updateUser(res.user);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => navigate('/profile'), 1200);
      } else {
        setMessage({ type: 'error', text: res.message || 'Update failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Server update error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container container">
      <div className="edit-page-header">
        <h1>Edit Profile & Research Portfolio</h1>
        <button className="btn btn-outline" onClick={() => navigate('/profile')}>
          Cancel
        </button>
      </div>

      {message.text && (
        <div className={message.type === 'success' ? 'form-success' : 'form-error'}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="edit-form-card">
        {/* Section 1: Basic Information */}
        <section className="form-section">
          <h3>Basic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Profile Image URL</label>
              <input type="text" name="profileImage" value={formData.profileImage} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Professional Role *</label>
              <input type="text" name="role" value={formData.role} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>University or Organization *</label>
              <input type="text" name="organization" value={formData.organization} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Professional Bio</label>
            <textarea name="bio" rows={3} value={formData.bio} onChange={handleChange} />
          </div>
        </section>

        {/* Section 2: Skills & Research Interests */}
        <section className="form-section">
          <h3>Skills & Research Areas</h3>
          <div className="form-group">
            <label>Technical Skills (comma separated)</label>
            <input type="text" name="skills" value={formData.skills} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Research Interests (comma separated)</label>
            <input type="text" name="researchInterests" value={formData.researchInterests} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Research Domains (comma separated)</label>
            <input type="text" name="researchDomains" value={formData.researchDomains} onChange={handleChange} />
          </div>
        </section>

        {/* Section 3: Publications Showcase */}
        <section className="form-section">
          <h3>Research Publications & Papers</h3>
          
          {publications.map((pub, idx) => (
            <div key={idx} className="added-item-card">
              <div className="added-item-header">
                <strong>{pub.title}</strong>
                <button type="button" onClick={() => handleRemovePublication(idx)} className="btn-remove">
                  Remove
                </button>
              </div>
              <p className="small-text">{pub.publicationVenue} | DOI: {pub.doiLink || 'N/A'}</p>
            </div>
          ))}

          <div className="add-subform">
            <h4>Add New Research Paper</h4>
            <div className="form-row">
              <input
                type="text"
                placeholder="Paper Title *"
                value={newPub.title}
                onChange={(e) => setNewPub({ ...newPub, title: e.target.value })}
              />
              <input
                type="text"
                placeholder="Publication / Conference Venue (e.g., IEEE, Nature)"
                value={newPub.publicationVenue}
                onChange={(e) => setNewPub({ ...newPub, publicationVenue: e.target.value })}
              />
            </div>
            <textarea
              placeholder="Paper Abstract..."
              rows={2}
              value={newPub.abstract}
              onChange={(e) => setNewPub({ ...newPub, abstract: e.target.value })}
            />
            <div className="form-row">
              <input
                type="text"
                placeholder="DOI Link"
                value={newPub.doiLink}
                onChange={(e) => setNewPub({ ...newPub, doiLink: e.target.value })}
              />
              <input
                type="text"
                placeholder="GitHub Repo Link"
                value={newPub.githubLink}
                onChange={(e) => setNewPub({ ...newPub, githubLink: e.target.value })}
              />
            </div>
            <button type="button" onClick={handleAddPublication} className="btn btn-outline btn-sm mt-2">
              Add Paper to List
            </button>
          </div>
        </section>

        {/* Section 4: Projects Showcase */}
        <section className="form-section">
          <h3>Projects & Innovations</h3>
          
          {projects.map((proj, idx) => (
            <div key={idx} className="added-item-card">
              <div className="added-item-header">
                <strong>{proj.title}</strong>
                <button type="button" onClick={() => handleRemoveProject(idx)} className="btn-remove">
                  Remove
                </button>
              </div>
              <p className="small-text">{proj.description}</p>
            </div>
          ))}

          <div className="add-subform">
            <h4>Add New Project</h4>
            <input
              type="text"
              placeholder="Project Title *"
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
            />
            <textarea
              placeholder="Project Description..."
              rows={2}
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            />
            <div className="form-row">
              <input
                type="text"
                placeholder="Tech Stack (comma separated)"
                value={newProject.techStack}
                onChange={(e) => setNewProject({ ...newProject, techStack: e.target.value })}
              />
              <input
                type="text"
                placeholder="Project Link (GitHub/Website)"
                value={newProject.link}
                onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
              />
            </div>
            <button type="button" onClick={handleAddProject} className="btn btn-outline btn-sm mt-2">
              Add Project to List
            </button>
          </div>
        </section>

        {/* Section 5: Collaboration Settings */}
        <section className="form-section">
          <h3>Collaboration Status</h3>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="lookingForCollaboration"
                checked={formData.lookingForCollaboration}
                onChange={handleChange}
              />
              Open for Research & Professional Collaboration
            </label>
          </div>

          <div className="form-group">
            <label>Preferred Collaboration Areas (comma separated)</label>
            <input
              type="text"
              name="collaborationAreas"
              value={formData.collaborationAreas}
              onChange={handleChange}
              placeholder="e.g., Co-authoring Papers, Grant Proposals, Open Source"
            />
          </div>
        </section>

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving}>
          {saving ? 'Saving Profile Changes...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};

export default EditProfile;
