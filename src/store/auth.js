import { createSlice } from '@reduxjs/toolkit';
import { socketService } from '../services/socket';

const API_URL = 'https://barback.mixmall.uz';

const initialState = {
  isAuthenticated: !!localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user')),
  token: localStorage.getItem('token'),
  error: null,
  loading: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, { payload }) => {
      state.user = payload.seller;
      state.token = payload.token;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.seller));
      
      // Socket.io ulanish
      socketService.connect(payload.token);
      socketService.emitLogin(payload.seller.id);
    },
    logout: (state) => {
      const user = state.user;
      if (user) {
        socketService.emitLogout(user.id);
      }
      socketService.disconnect();
      
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    setError: (state, { payload }) => {
      state.error = payload;
      state.loading = false;
    },
    setLoading: (state, { payload }) => {
      state.loading = payload;
      if (payload) {
        state.error = null;
      }
    }
  },
});

export const { setCredentials, logout, setError, setLoading } = authSlice.actions;

export const login = (credentials) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await fetch(`${API_URL}/api/seller/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login xatolik yuz berdi');
    }

    dispatch(setCredentials(data));
    dispatch(setLoading(false));
    return data;
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const checkAuth = (state) => state.auth.isAuthenticated;
export const getAuthError = (state) => state.auth.error;
export const getAuthLoading = (state) => state.auth.loading;
export const getUser = (state) => state.auth.user;

export default authSlice.reducer;
