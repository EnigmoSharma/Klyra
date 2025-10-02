import React, { useEffect, useState } from 'react';
import { Clock, Shield, Smartphone, DollarSign, Zap } from 'lucide-react';

const Features = () => {
  
  const features = [
    {
      icon: Smartphone,
      number: "01",
      title: "Ease of booking",
      description: "No more stressful searching. Find, reserve, and pay for your parking spot in seconds from our web platform before you even leave home.",
      image: "https://api.builder.io/api/v1/image/assets/e347055419f84c3d83e184122ae1653c/66ca62240bd9716c9527e1bbdb6b3f99950c32ae?placeholderIfAbsent=true"
    },
    {
      icon: Shield,
      number: "02",
      title: "Live Feed",
      description: "Once your spot is booked, you can view a dedicated live feed of your vehicle. This offers unparalleled security and peace of mind during your entire parking session.",
      image: "https://api.builder.io/api/v1/image/assets/e347055419f84c3d83e184122ae1653c/2409ddf4eaf3a5ea5327c4beef694457f78ce31d?placeholderIfAbsent=true"
    },
    {
      icon: Zap,
      number: "03",
      title: "Sensor Based",
      description: "Our network of advanced sensors ensures the parking spot is 100% accurate. If our system shows a spot is free, it's guaranteed to be.",
      image: "https://api.builder.io/api/v1/image/assets/e347055419f84c3d83e184122ae1653c/5d96a0fa3f89050e3f1ecfc6a40b8908ccf6f00c?placeholderIfAbsent=true"
    },
    {
      icon: DollarSign,
      number: "04",
      title: "Affordable prices",
      description: "With our clear, credit-based system, you always know the cost upfront. No hidden fees, just simple, affordable rates for the time you need.",
      image: "https://api.builder.io/api/v1/image/assets/e347055419f84c3d83e184122ae1653c/34d899fa1b916ac2094a7aa98849288043a2eb38?placeholderIfAbsent=true"
    },
    {
      icon: Clock,
      number: "05",
      title: "24/7 Service",
      description: "Our automated system works around the clock. Whether it's an early morning meeting or a late-night event, you can always book a spot with Klyra.",
      image: "https://www.automaticinfotech.com/wp-content/uploads/2024/05/Service-24_7-bro.svg"
    }
  ];

  return (
    <section className="w-full py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Why Park with <span className="text-primary">Klyra?</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Our smart parking system is designed from the ground up to make
            your experience simple, secure, and stress-free.
          </p>
        </div>

        <div className="space-y-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`bg-primary/5 rounded-2xl p-8 md:p-12 ${
                index % 2 === 0 ? '' : ''
              }`}
            >
              <div className={`grid md:grid-cols-2 gap-8 items-center ${
                index % 2 === 1 ? 'md:grid-flow-dense' : ''
              }`}>
                <div className={`space-y-6 ${index % 2 === 1 ? 'md:col-start-2' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 rounded-full p-4">
                      <feature.icon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-5xl font-bold text-primary/30">{feature.number}</span>
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">{feature.title}</h3>
                  <p className="text-lg text-muted-foreground">{feature.description}</p>
                </div>
                <div className={`flex justify-center ${index % 2 === 1 ? 'md:col-start-1 md:row-start-1' : ''}`}>
                  <img
                    src={feature.image}
                    className="w-full max-w-sm rounded-lg"
                    alt={`${feature.title} illustration`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
