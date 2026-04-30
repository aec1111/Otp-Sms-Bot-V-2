const phoneNumberRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format

/**
 * Validate phone number in E.164 format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidPhoneNumber(phoneNumber) {
  return phoneNumberRegex.test(phoneNumber);
}

/**
 * Validate SIP credentials (simplified validation)
 * @param {string} username - SIP username
 * @param {string} password - SIP password
 * @param {string} domain - SIP domain
 * @returns {Object} - Validation result with isValid and errors
 */
function validateSipCredentials(username, password, domain) {
  const errors = [];
  
  if (!username || username.trim() === '') {
    errors.push('SIP username is required');
  }
  
  if (!password || password.trim() === '') {
    errors.push('SIP password is required');
  }
  
  if (!domain || domain.trim() === '') {
    errors.push('SIP domain is required');
  } else {
    // Simple domain validation (can be enhanced)
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      errors.push('Invalid SIP domain format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  isValidPhoneNumber,
  validateSipCredentials
};