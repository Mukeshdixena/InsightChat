export const AppConfig = {
  apiUrl: 'http://localhost:3000',
  socketUrl: 'http://localhost:3000',

  getToken() {
    return localStorage.getItem('token') || '';
  }
};
