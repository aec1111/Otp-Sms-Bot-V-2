class SipTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SipTimeoutError';
  }
}

class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

class TtsApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TtsApiError';
  }
}

class AudioPlaybackError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AudioPlaybackError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

module.exports = {
  SipTimeoutError,
  NetworkError,
  TtsApiError,
  AudioPlaybackError,
  ValidationError
};