import React from 'react';
import './EmptyState.css';

const EmptyState = ({
  icon = '🔍',
  title = 'No Results Found',
  description = 'No items available at the moment.',
  actionButton = null
}) => {
  return (
    <div className="empty-state-card">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      {actionButton && <div className="empty-action">{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
