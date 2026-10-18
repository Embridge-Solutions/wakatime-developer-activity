module.exports = [
  // login, users, roles and scopes
  {
    serviceName: 'auth',
    path: '/auth',
    fileName: 'auth-services',
  },
  {
    serviceName: 'user',
    path: '/user',
    fileName: 'user-services',
  },
  {
    serviceName: 'role',
    path: '/role',
    fileName: 'role-services',
  },
  {
    serviceName: 'scope',
    path: '/scope',
    fileName: 'scope-services',
  },
  {
    serviceName: 'team',
    path: '/team',
    fileName: 'team-services',
  },

  //common service (theme)
  {
    serviceName: 'common',
    path: '/common',
    fileName: 'common-services',
  },

  // developer activity (WakaTime)
  {
    serviceName: 'developer',
    path: '/developer',
    fileName: 'developer-services',
  },
  {
    serviceName: 'wakatime',
    path: '/wakatime',
    fileName: 'wakatime-services',
  },
  {
    serviceName: 'activity',
    path: '/activity',
    fileName: 'activity-services',
  },
];
