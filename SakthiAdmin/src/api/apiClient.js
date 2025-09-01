import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://118.91.235.74:8080', // Proxy server URL
  headers: {
    'Content-Type': 'application/json',
    // 'Accept-Encoding': 'gzip, deflate, br', // Removed forbidden header
  },
  withCredentials: true,
  timeout: 10000, // 10 second timeout to prevent hanging requests
  // Enable response compression
  decompress: true
});

// Request interceptor to add auth token and optimize requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache control for GET requests
    if (config.method === 'get') {
      config.headers['Cache-Control'] = 'max-age=300'; // 5 minutes cache
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors and caching
apiClient.interceptors.response.use(
  (response) => {
    // Add response caching headers for static data
    if (response.config.method === 'get' && response.data) {
      response.headers['Cache-Control'] = 'public, max-age=300';
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Log network errors for debugging
    if (error.code === 'ECONNABORTED') {
      console.warn('Request timeout - consider checking network connection');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
