export const parseApiError = (error, fallback = 'Request failed.') => {
  const data = error?.response?.data;

  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;

  if (data.errors && typeof data.errors === 'object') {
    const [firstField, firstMessages] = Object.entries(data.errors)[0] || [];
    if (firstField) {
      if (Array.isArray(firstMessages) && firstMessages.length) {
        return `${firstField}: ${firstMessages[0]}`;
      }
      if (typeof firstMessages === 'string') {
        return `${firstField}: ${firstMessages}`;
      }
    }
  }

  if (typeof data === 'object') {
    const [firstField, firstMessages] = Object.entries(data)[0] || [];
    if (firstField) {
      if (Array.isArray(firstMessages) && firstMessages.length) {
        return `${firstField}: ${firstMessages[0]}`;
      }
      if (typeof firstMessages === 'string') {
        return `${firstField}: ${firstMessages}`;
      }
    }
  }

  return fallback;
};
