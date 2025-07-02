
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { API_BASE_URL } from '../../config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) throw new Error('Login failed');
      navigate('/Dashboard'); // ✅ redirect to protected page
    } catch (err) {
      setError('Invalid email or password.');
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
        <Button className="w-full" onClick={handleLogin}>
          Login
        </Button>
      </div>
    </div>
  );
}
