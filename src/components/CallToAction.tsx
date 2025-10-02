import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone } from 'lucide-react';

const CallToAction = () => {
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleCallbackRequest = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Callback requested for:', phoneNumber);
  };

  return (
    <section className="w-full py-20 bg-background">
      <div className="container mx-auto px-4 space-y-16">
        {/* Book Manually Section */}
        <div className="bg-primary rounded-2xl p-8 md:p-12">
          <form onSubmit={handleCallbackRequest} className="flex flex-col md:flex-row items-center gap-6">
            <h3 className="text-2xl font-semibold text-primary-foreground whitespace-nowrap">
              Book Manually
            </h3>
            <div className="flex-1 w-full">
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-14 text-lg bg-white"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full md:w-auto whitespace-nowrap"
            >
              <Phone className="mr-2" size={20} />
              Request a CallBack
            </Button>
          </form>
        </div>

        {/* Ready to Park Section */}
        <div className="bg-secondary rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center md:text-left">
              <h2 className="text-4xl font-bold text-foreground">
                Ready to Park Smarter?
              </h2>
              <p className="text-xl text-muted-foreground">
                Find and book your ideal parking spot in seconds.
                Make parking the easiest part of your journey.
              </p>
              <Button size="lg" className="text-lg">
                BOOK A SPOT
              </Button>
            </div>
            <div className="flex justify-center">
              <img
                src="https://api.builder.io/api/v1/image/assets/e347055419f84c3d83e184122ae1653c/a8196784879165aba9e194e803ef58b8e19aa236?placeholderIfAbsent=true"
                className="w-full max-w-md rounded-lg"
                alt="Ready to park illustration"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
