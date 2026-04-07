import './PagePlaceholder.css';

export default function PagePlaceholder({ title, description }) {
  return (
    <div className="page-placeholder">
      <h2>{title}</h2>
      <p>{description || 'This module is coming soon.'}</p>
    </div>
  );
}
