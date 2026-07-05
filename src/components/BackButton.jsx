import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ className = "", children, ...props }) {
  const navigate = useNavigate();
  return (
    <Button 
      variant="ghost" 
      size={children ? "default" : "icon"} 
      onClick={() => navigate(-1)} 
      className={className}
      {...props}
    >
      <ArrowLeft size={20} className={children ? "mr-2" : ""} />
      {children}
    </Button>
  );
}