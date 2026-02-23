export function formatDate(isoString) {
  // Returns "Feb 20, 2026 at 3:45 PM"
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatTime(isoString) {
  // Returns "09:00"
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatCoordinates(lat, lng) {
  // Returns "6.5244° N, 3.3792° E"
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export function getTimeAgo(isoString) {
  // Returns "Just now", "2 min ago", "1 hr ago", etc.
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateNigerianPhone(phone) {
  // Supports +234..., 080..., 090..., 070..., 081..., 091...
  return /^(\+234|0)(7[01]|8[01]|9[01])\d{8}$/.test(phone.replace(/[\s()-]/g, ''));
}

export function truncateText(text, maxLength = 40) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export function calculatePasswordStrength(password) {
  // Returns 0-5 (number of segments to fill)
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
