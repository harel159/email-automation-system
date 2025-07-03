
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { API_BASE_URL } from '../config';
import CryptoJS from 'crypto-js';

const ENCRYPTION_SECRET = 'rVc2BgX7YlplokSK0HtNb5ZGJTyhxERb'



export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

const handleLogin = async () => {
  setLoading(true);
  try {
    const encryptedPassword = CryptoJS.AES.encrypt(password, ENCRYPTION_SECRET).toString();

    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: encryptedPassword }),
    });

    if (!res.ok) throw new Error('Login failed');
    navigate('/Dashboard');
  } catch (err) {
    setError('Invalid email or password.');
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-6 bg-white p-8 shadow rounded">
        <h2 className="text-2xl font-bold text-center">Login</h2>

        {error && <p className="text-red-600 text-center">{error}</p>}

        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button className="w-full flex justify-center items-center gap-2" onClick={handleLogin} disabled={loading}>
            {loading && <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />}
            {loading ? 'Logging in...' : 'Login'}
        </Button>

      </div>
    </div>
  );
}
