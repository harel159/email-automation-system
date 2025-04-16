import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function Template() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the new EmailManager page
    navigate(createPageUrl("EmailManager"));
  }, [navigate]);
  
  return (
    <div className="p-8 text-center">
      <p>Redirecting to Email Manager...</p>
    </div>
  );
}