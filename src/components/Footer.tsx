import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-2 space-y-4">
            <div className="text-4xl font-bold text-foreground">Klyra</div>
            <p className="text-lg text-muted-foreground">
              Smart Parking, Simplified.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <a href="#book" className="text-muted-foreground hover:text-primary transition-colors">
                Book a Spot
              </a>
              <a href="#how" className="text-muted-foreground hover:text-primary transition-colors">
                How It Works
              </a>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-colors">
                About Us
              </a>
              <a href="#projects" className="text-muted-foreground hover:text-primary transition-colors">
                Projects
              </a>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Support</h3>
            <nav className="flex flex-col space-y-2">
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact Us
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">
                FAQ
              </a>
              <a href="#terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="#privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </a>
            </nav>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground">
          © 2025 Klyra. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
