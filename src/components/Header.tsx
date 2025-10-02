import React from 'react';
import { Menu } from 'lucide-react';

const Header = () => {
  return (
    <header className="w-full bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="text-4xl font-bold text-foreground">Klyra</div>
        
        <nav className="hidden md:flex items-center gap-8 text-lg font-medium">
          <a href="#book" className="text-foreground hover:text-primary transition-colors">
            Book a Spot
          </a>
          <a href="#about" className="text-foreground hover:text-primary transition-colors">
            About Us
          </a>
        </nav>

        <button className="md:hidden text-foreground">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;
