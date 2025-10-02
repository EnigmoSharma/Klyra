import React from 'react';
import { Button } from '@/components/ui/button';

const Hero = () => {
  return (
    <section className="w-full bg-secondary py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-foreground leading-tight">
              The Smart Way to Park<br />
              <span className="text-primary">Parking, Re-imagined</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Leave parking anxiety behind. Find, book, and pay for your spot
              before you even arrive. Seamless parking is just a click away.
            </p>
            <Button size="lg" className="text-lg">
              Get Started
            </Button>
          </div>
          <div className="flex justify-center">
            <img
              src="https://api.builder.io/api/v1/image/assets/e347055419f84c3d83e184122ae1653c/46908895f2feea8925859d2dd1bfc588fec838d4?placeholderIfAbsent=true"
              className="w-full max-w-xl rounded-lg"
              alt="Smart parking illustration"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
