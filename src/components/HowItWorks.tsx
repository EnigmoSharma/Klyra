import React from 'react';
import { Search, Calendar, CreditCard, MapPin, Camera } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      number: 1,
      title: "Search for a Spot",
      description: "Enter your location and desired time"
    },
    {
      icon: Calendar,
      number: 2,
      title: "Choose Your Spot",
      description: "View available spots with real-time data"
    },
    {
      icon: CreditCard,
      number: 3,
      title: "Book & Pay",
      description: "Secure your spot with instant payment"
    },
    {
      icon: MapPin,
      number: 4,
      title: "Navigate",
      description: "Get directions to your reserved spot"
    },
    {
      icon: Camera,
      number: 5,
      title: "Park with Live View",
      description: "Access live feed for your spot anytime"
    }
  ];

  return (
    <section className="w-full py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            How does it work?
          </h2>
          <p className="text-xl text-muted-foreground">
            Your seamless parking experience is just a few clicks away. Follow
            these simple steps to book your guaranteed spot.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center space-y-4">
              <div className="bg-primary/10 rounded-full p-6">
                <step.icon className="w-12 h-12 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">{step.number}</div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
