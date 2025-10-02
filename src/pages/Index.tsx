import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SearchForm from '@/components/SearchForm';
import HowItWorks from '@/components/HowItWorks';
import Features from '@/components/Features';
import CallToAction from '@/components/CallToAction';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <SearchForm />
        <HowItWorks />
        <Features />
        <CallToAction />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
