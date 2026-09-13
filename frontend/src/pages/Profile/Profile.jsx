import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileCard from '../../components/ProfileCard/ProfileCard';
import Loading from '../../components/Loading/Loading';
import './Profile.css';

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <Loading text="Loading your profile..." />;

  return (
    <div className="page-container container">
      <div className="profile-page-header">
        <h1>My Professional & Research Portfolio</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/edit-profile')}
        >
          Edit Profile & Research
        </button>
      </div>

      <ProfileCard
        user={user}
        isOwnProfile={true}
        onEditClick={() => navigate('/edit-profile')}
      />
    </div>
  );
};

export default Profile;
