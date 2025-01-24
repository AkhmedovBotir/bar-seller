import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { checkAuth } from './store/auth';
import Login from './views/auth/Login';
import Dashboard from './views/dashboard/Dashboard';
import OrderHistory from './views/orders/OrderHistory';
// RequireAuth komponenti
function RequireAuth({ children }) {
  const isAuthenticated = useSelector(checkAuth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <OrderHistory />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}

export default App
