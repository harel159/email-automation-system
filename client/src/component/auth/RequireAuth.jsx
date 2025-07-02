import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

export default function RequireAuth({ children }) {
  const [isAuth, setIsAuth] = useState(null); // null = loading, false = not auth, true = auth

  useEffect(() => {
    fetch(`${API_BASE_URL}/check-auth`, {
      credentials: 'include',
    })
      .then(res => {
        if (res.status === 200) setIsAuth(true);
        else throw new Error();
      })
      .catch(() => setIsAuth(false));
  }, []);

  if (isAuth === null) return <div>Loading...</div>;
  if (!isAuth) return <Navigate to="/Login" replace />;

  return children;
}
