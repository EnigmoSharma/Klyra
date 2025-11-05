// Overstay Monitoring Service
// This service runs in the background and checks for overstays and upcoming booking conflicts

import { supabase } from './supabaseClient.js';

class OverstayMonitor {
    constructor() {
        this.checkInterval = 60000; // Check every 60 seconds
        this.isRunning = false;
        this.intervalId = null;
    }

    // Start monitoring
    start() {
        if (this.isRunning) {
            console.log('Overstay monitor already running');
            return;
        }

        console.log('🚀 Starting overstay monitor...');
        this.isRunning = true;

        // Run immediately
        this.runChecks();

        // Then run every minute
        this.intervalId = setInterval(() => {
            this.runChecks();
        }, this.checkInterval);
    }

    // Stop monitoring
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('⏹️ Overstay monitor stopped');
    }

    // Run all checks
    async runChecks() {
        console.log('🔍 Running overstay checks...', new Date().toLocaleTimeString());

        try {
            // 1. Check and handle overstays
            await this.checkOverstays();

            // 2. Check upcoming bookings (5 minutes before)
            await this.checkUpcomingBookings();

            // 3. Update spot availability based on sensors
            await this.updateSpotAvailability();

        } catch (error) {
            console.error('❌ Error in overstay monitor:', error);
        }
    }

    // Check for overstays and charge users
    async checkOverstays() {
        try {
            // TODO: Implement overstay checking when database function is ready
            console.log('🔍 Overstay check skipped - database function not implemented yet');
            return;
            
            // const { data, error } = await supabase.rpc('check_and_handle_overstay');
            // if (error) {
            //     console.error('Error checking overstays:', error);
            //     return;
            // }

            if (data && data.overstays_detected > 0) {
                console.log(`⚠️ ${data.overstays_detected} overstay(s) detected and handled`);
            }
        } catch (err) {
            console.error('Exception in checkOverstays:', err);
        }
    }

    // Check upcoming bookings 5 minutes before start time
    async checkUpcomingBookings() {
        try {
            const { data, error } = await supabase.rpc('check_upcoming_bookings_before_start');

            if (error) {
                console.error('Error checking upcoming bookings:', error);
                return;
            }

            if (data) {
                if (data.reassigned > 0) {
                    console.log(`🔄 ${data.reassigned} booking(s) reassigned to alternative spots`);
                }
                if (data.cancelled > 0) {
                    console.log(`❌ ${data.cancelled} booking(s) cancelled and refunded`);
                }
            }
        } catch (err) {
            console.error('Exception in checkUpcomingBookings:', err);
        }
    }

    // Update spot availability based on sensor data
    async updateSpotAvailability() {
        try {
            const { data, error } = await supabase.rpc('update_spot_availability_from_sensor');

            if (error) {
                console.error('Error updating spot availability:', error);
                return;
            }

            if (data && data.spots_updated > 0) {
                console.log(`✅ ${data.spots_updated} spot(s) availability updated`);
            }
        } catch (err) {
            console.error('Exception in updateSpotAvailability:', err);
        }
    }

    // Manual trigger for testing
    async manualCheck() {
        console.log('🔧 Manual check triggered');
        await this.runChecks();
    }
}

// Create singleton instance
const overstayMonitor = new OverstayMonitor();

// Auto-start when page loads (only on dashboard and admin pages)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const currentPage = window.location.pathname;
        
        // Only run on dashboard and admin pages
        if (currentPage.includes('dashboard.html') || currentPage.includes('admin.html')) {
            overstayMonitor.start();
            
            // Stop when page unloads
            window.addEventListener('beforeunload', () => {
                overstayMonitor.stop();
            });
        }
    });
}

// Export for manual control
export default overstayMonitor;
