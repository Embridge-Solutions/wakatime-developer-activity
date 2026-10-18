module.exports = {
  DEVELOPER: {
    SUCCESS: { CODE: 200, MESSAGE: 'Developer data fetched successfully' },
    CREATED: { CODE: 201, MESSAGE: 'Developer Created Successfully' },
    UPDATE: { CODE: 200, MESSAGE: 'Developer Updated SuccessFully' },
    DELETE: { CODE: 200, MESSAGE: 'Developer Deleted SuccessFully' },
    ACTIVATED: { CODE: 200, MESSAGE: 'Developer Activated' },
    DEACTIVATED: { CODE: 200, MESSAGE: 'Developer Deactivated — activity is no longer collected' },
    NOT_FOUND: { CODE: 404, MESSAGE: 'Developer Not Found' },
    REQUIRED: { CODE: 400, MESSAGE: 'Developer name and e-mail are required' },
    INVALID_EMAIL: { CODE: 400, MESSAGE: 'Enter a valid e-mail address' },
    STATUS_REQUIRED: { CODE: 400, MESSAGE: 'isActive must be true or false' },
    EMAIL_EXISTS: { CODE: 409, MESSAGE: 'A developer with this e-mail already exists' },
    CODE_EXISTS: { CODE: 409, MESSAGE: 'A developer with this code already exists' },
    WAKA_ACCOUNT_EXISTS: {
      CODE: 409,
      MESSAGE: 'This WakaTime account is already linked to another developer',
    },
    API_KEY_REQUIRED: { CODE: 400, MESSAGE: 'Enter the WakaTime access token' },
    API_KEY_INVALID: {
      CODE: 400,
      MESSAGE: 'WakaTime rejected this token — copy a fresh one from https://wakatime.com/oauth',
    },
    API_KEY_WRITE_ONLY: {
      CODE: 400,
      MESSAGE:
        'This is a WakaTime secret API key, which WakaTime only allows for sending data. ' +
        'Use the access token (waka_tok_…) from https://wakatime.com/oauth instead',
    },
    API_KEY_CHECK_FAILED: {
      CODE: 502,
      MESSAGE: 'Could not reach WakaTime to check the API key — try again',
    },
    API_KEY_VALID: { CODE: 200, MESSAGE: 'Token is valid' },
    API_KEY_UPDATE: { CODE: 200, MESSAGE: 'WakaTime Token Saved SuccessFully' },
    API_KEY_REMOVED: { CODE: 200, MESSAGE: 'WakaTime Token Removed' },
    SECRET_MISSING: {
      CODE: 500,
      MESSAGE: 'WAKA_TOKEN_SECRET is not set in the API .env file — API keys cannot be saved',
    },
  },

  TEAM: {
    SUCCESS: { CODE: 200, MESSAGE: 'Team data fetched successfully' },
    CREATED: { CODE: 201, MESSAGE: 'Team Created Successfully' },
    UPDATE: { CODE: 200, MESSAGE: 'Team Updated SuccessFully' },
    DELETE: { CODE: 200, MESSAGE: 'Team Deleted SuccessFully' },
    NOT_FOUND: { CODE: 404, MESSAGE: 'Team Not Found' },
    REQUIRED: { CODE: 400, MESSAGE: 'Team name is required' },
    NAME_EXISTS: { CODE: 409, MESSAGE: 'A team with this name already exists' },
  },

  ACTIVITY: {
    SUCCESS: { CODE: 200, MESSAGE: 'Activity data fetched successfully' },
    INVALID_RANGE: {
      CODE: 400,
      MESSAGE: 'fromDate and toDate must be YYYY-MM-DD, fromDate first, at most 366 days',
    },
    INVALID_DIMENSION: { CODE: 400, MESSAGE: 'Unknown breakdown dimension' },
    DEVELOPER_REQUIRED: { CODE: 400, MESSAGE: 'Select a developer and a date' },
    PROJECT_REQUIRED: { CODE: 400, MESSAGE: 'projectName is required' },
    NOT_LINKED: {
      CODE: 403,
      MESSAGE: 'Your login is not tracked in WakaTime yet — ask an admin to turn on WakaTime tracking for your user',
    },
  },

  WAKATIME: {
    SUCCESS: { CODE: 200, MESSAGE: 'WakaTime sync data fetched successfully' },
    SYNC_STARTED: { CODE: 202, MESSAGE: 'WakaTime sync started' },
    ALREADY_RUNNING: { CODE: 409, MESSAGE: 'A WakaTime sync is already running' },
    INVALID_DATE: { CODE: 400, MESSAGE: 'date must be YYYY-MM-DD and not in the future' },
    INVALID_DAYS: { CODE: 400, MESSAGE: 'days must be a whole number from 0 to 14' },
  },

  AUTH: {
    TOKEN_NOT_FOUND: { CODE: 401, MESSAGE: 'Authentication token not found' },
    INVALID_CREDENTIALS: { CODE: 401, MESSAGE: 'Invalid credentials' },
    EXPIRED_TOKEN: { CODE: 403, MESSAGE: 'Token has expired' },
    UNAUTHORIZED: { CODE: 401, MESSAGE: 'Unauthorized access' },
    INVALID_REFRESH_TOKEN: { CODE: 401, MESSAGE: 'Invalid Refresh Token' },
    INVALID_ACCESS_TOKEN: { CODE: 401, MESSAGE: 'Invalid Access Token' },
    USER_NOT_FOUND: { CODE: 401, MESSAGE: 'User Not Found' },
    USER_SESSION_NOT_FOUND: { CODE: 401, MESSAGE: 'User Session Not Found' },
    USER_INACTIVE: { CODE: 401, MESSAGE: 'Session Expired due to Inactivity' },
    PASSWORD_NOT_VALID: { CODE: 303, MESSAGE: 'Password Invalid' },
    INVALID_ROLE: { CODE: 303, MESSAGE: 'Role Invalid' },
    LOGIN: { CODE: 200, MESSAGE: 'Login Successfully Redirecting...' },
  },

  USER: {
    ALREADY_EXISTS: { CODE: 403, MESSAGE: 'User Already Exists' },
    EMAIL_ALREADY_EXISTS: { CODE: 403, MESSAGE: 'Email Already Exists' },
    CREATED: { CODE: 201, MESSAGE: 'User Created Successfully' },
    UPDATE: { CODE: 200, MESSAGE: 'User Updated SuccessFully' },
    DELETE: { CODE: 200, MESSAGE: 'User Deleted SuccessFully' },
    USER_NOT_FOUND: { CODE: 404, MESSAGE: 'User Not Found' },
  },

  ROLE: {
    ALREADY_EXISTS: { CODE: 403, MESSAGE: 'Role Already Exists' },
    NAME_ALREADY_EXISTS: { CODE: 403, MESSAGE: 'Role Name Already Exists' },
    NOT_FOUND: { CODE: 401, MESSAGE: 'Role Not Found' },
    CREATED: { CODE: 201, MESSAGE: 'Role Created Successfully' },
    UPDATE: { CODE: 200, MESSAGE: 'Role Updated SuccessFully' },
    DELETE: { CODE: 200, MESSAGE: 'Role Deleted SuccessFully' },
  },

  COMMON: {
    SUCCESS: { CODE: 200, MESSAGE: 'SuccessFully get the Data' },
  },

  // 2xx — Success
  OK: { code: 200, message: 'Success' },
  CREATED: { code: 201, message: 'Resource created successfully' },
  ACCEPTED: { code: 202, message: 'Request accepted' },
  NO_CONTENT: { code: 204, message: 'No content' },

  // 3xx — Redirects
  MOVED_PERMANENTLY: { code: 301, message: 'Resource moved permanently' },
  FOUND: { code: 302, message: 'Resource found' },
  NOT_MODIFIED: { code: 304, message: 'Not modified' },

  // 4xx — Client Errors
  BAD_REQUEST: { code: 400, message: 'Bad request' },
  UNAUTHORIZED: { code: 401, message: 'Not authorized' },
  PAYMENT_REQUIRED: { code: 402, message: 'Payment required' },
  FORBIDDEN: { code: 403, message: 'Forbidden' },
  NOT_FOUND: { code: 404, message: 'Resource not found' },
  METHOD_NOT_ALLOWED: { code: 405, message: 'Method not allowed' },
  NOT_ACCEPTABLE: { code: 406, message: 'Not acceptable' },
  REQUEST_TIMEOUT: { code: 408, message: 'Request timeout' },
  CONFLICT: { code: 409, message: 'Conflict error' },
  GONE: { code: 410, message: 'The resource is gone' },
  UNSUPPORTED_MEDIA_TYPE: { code: 415, message: 'Unsupported media type' },
  UNPROCESSABLE_ENTITY: {
    code: 422,
    message: 'Validation or processing failed',
  },
  TOO_MANY_REQUESTS: { code: 429, message: 'Too many requests — rate limited' },

  // 5xx — Server Errors
  INTERNAL_SERVER_ERROR: { CODE: 500, MESSAGE: 'Internal server error' },
  NOT_IMPLEMENTED: { code: 501, message: 'Feature not implemented' },
  BAD_GATEWAY: { code: 502, message: 'Bad gateway' },
  SERVICE_UNAVAILABLE: { code: 503, message: 'Service unavailable' },
  GATEWAY_TIMEOUT: { code: 504, message: 'Gateway timeout' },
  HTTP_VERSION_NOT_SUPPORTED: {
    code: 505,
    message: 'HTTP version not supported',
  },

  // CUSTOM BUSINESS LOGIC CODES
  TOKEN_EXPIRED: { code: 498, message: 'Token expired' },
  TOKEN_REQUIRED: { code: 499, message: 'Authentication token required' },

  // USER / AUTH SPECIFIC
  LOGIN_FAILED: { code: 401, message: 'Login failed — invalid credentials' },
  ACCESS_DENIED: { code: 403, message: 'Access denied' },
  ACCOUNT_LOCKED: { code: 423, message: 'Account locked' },
  USER_ALREADY_EXISTS: { code: 409, message: 'User already exists' },
  USER_NOT_FOUND: { code: 404, message: 'User not found' },

  // DATABASE / DATA SPECIFIC
  DB_ERROR: { code: 500, message: 'Database error' },
  DATA_NOT_FOUND: { code: 404, message: 'Data not found' },
  DATA_ALREADY_EXISTS: { code: 409, message: 'Data already exists' },
  INVALID_DATA: { code: 422, message: 'Invalid data' },

  // FILE UPLOAD / STORAGE
  FILE_TOO_LARGE: { code: 413, message: 'File too large' },
  UNSUPPORTED_FILE_TYPE: { code: 415, message: 'Unsupported file type' },
  FILE_UPLOAD_FAILED: { code: 500, message: 'File upload failed' },

  // API USAGE / SECURITY
  API_KEY_MISSING: { code: 401, message: 'API key missing' },
  API_KEY_INVALID: { code: 403, message: 'API key invalid' },
  RATE_LIMIT_EXCEEDED: { code: 429, message: 'Too many requests' },
  IP_BLOCKED: { code: 403, message: 'Your IP is blocked' },

  // SOCKET / REALTIME
  SOCKET_DISCONNECTED: { code: 440, message: 'Socket disconnected' },
  SOCKET_AUTH_FAILED: { code: 403, message: 'Socket authentication failed' },
};
