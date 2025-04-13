'use client';

import { useAuth } from './components/auth/auth-provider';
import AuthForm from './components/auth/auth-form';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from "next/image";

export default function Home() {
  const { user, loading, signOut } = useAuth();

  // Update navigation when user auth state changes
  useEffect(() => {
    const navElement = document.getElementById('main-nav');
    if (navElement && user) {
      navElement.innerHTML = `
        <button id="logout-btn" class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600">Logout</button>
      `;
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
      }
    } else if (navElement) {
      navElement.innerHTML = `
        <a href="#auth-section" class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600">Sign In</a>
        <a href="#auth-section" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">Sign Up</a>
      `;
    }
  }, [user, signOut]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  // If user is logged in, show dashboard tabs
  if (user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="app-tabs flex border-b border-gray-200 mb-4">
          <Link href="/dashboard/payment-sources" className="app-tab-btn px-4 py-2 font-medium hover:text-indigo-600">
            Payment Sources
          </Link>
          <Link href="/dashboard/recurring-payments" className="app-tab-btn px-4 py-2 font-medium hover:text-indigo-600">
            Recurring Payments
          </Link>
          <Link href="/dashboard/calendar" className="app-tab-btn px-4 py-2 font-medium hover:text-indigo-600">
            Calendar View
          </Link>
        </div>
        
        <div className="py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to Recr-Monkey!</h2>
          <p className="mb-4">Please select one of the tabs above to get started.</p>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="container mx-auto px-4">
      {/* Hero Section */}
      <section className="py-20 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-10 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">
            Take Control of Your Recurring Payments
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Recr-Monkey helps you track, manage, and optimize all your subscriptions and recurring payments in one place, saving you money and preventing unexpected charges.
          </p>
          <a 
            href="#auth-section" 
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition text-lg font-medium"
          >
            Get Started for Free
          </a>
        </div>
        <div className="md:w-1/2 md:pl-12">
          <div className="relative w-full h-80 md:h-96">
            <Image 
              src="/window.svg" 
              alt="Dashboard Preview" 
              fill 
              className="object-contain"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50 rounded-xl my-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose Recr-Monkey?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our platform makes managing recurring payments simple and hassle-free.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 mb-4 mx-auto">
              <Image src="/file.svg" alt="Track Icon" width={48} height={48} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-center">Track Everything</h3>
            <p className="text-gray-600">
              Keep all your subscriptions in one place with automatic reminders before payments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 mb-4 mx-auto">
              <Image src="/globe.svg" alt="Visualize Icon" width={48} height={48} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-center">Visual Calendar</h3>
            <p className="text-gray-600">
              See all your upcoming payments in an intuitive calendar view to plan your finances.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 mb-4 mx-auto">
              <Image src="/vercel.svg" alt="Save Icon" width={48} height={48} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-center">Save Money</h3>
            <p className="text-gray-600">
              Identify unused subscriptions and opportunities to save with our analytics.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Getting started with Recr-Monkey is simple and takes just minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 text-xl font-bold mb-4">1</div>
            <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
            <p className="text-gray-600">Create your free account in seconds</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 text-xl font-bold mb-4">2</div>
            <h3 className="text-xl font-semibold mb-2">Add Your Payments</h3>
            <p className="text-gray-600">Enter your recurring subscriptions and payment sources</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 text-xl font-bold mb-4">3</div>
            <h3 className="text-xl font-semibold mb-2">Stay Organized</h3>
            <p className="text-gray-600">Never miss a payment or get charged for unused services</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50 rounded-xl my-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto px-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600 mb-4">
              "Recr-Monkey helped me discover I was paying for 3 subscriptions I had completely forgotten about. I saved over $40 per month!"
            </p>
            <p className="font-medium">Bala G., Product Manager</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600 mb-4">
              "The calendar view makes it so easy to see when payments are coming up. I can finally budget properly and avoid overdraft fees."
            </p>
            <p className="font-medium">Anjani K., Freelancer</p>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth-section" className="py-16 max-w-md mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6">Get Started Today</h2>
          <AuthForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 mt-12">
        <div className="text-center text-gray-500">
          <p>© {new Date().getFullYear()} Recr-Monkey. All rights reserved.</p>
          <p className="mt-2">Your subscription management solution.</p>
        </div>
      </footer>
    </div>
  );
}
