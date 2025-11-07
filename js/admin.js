// Admin Dashboard JavaScript
import { supabase } from './supabaseClient.js';

let currentSpotId = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin DOM loaded, starting initialization...');
    
    // Check if admin is logged in
    const adminUsername = localStorage.getItem('admin_username');
    console.log('🔑 Admin username from localStorage:', adminUsername);
    
    if (!adminUsername) {
        console.log('❌ No admin username found, redirecting to login...');
        window.location.href = 'admin-auth.html';
        return;
    }

    try {
        console.log('📊 Loading dashboard data...');
        // Load dashboard data with timeout
        await Promise.race([
            loadDashboard(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Dashboard loading timeout')), 10000))
        ]);
        console.log('✅ Dashboard data loaded successfully');
        
        console.log('🚨 Loading security alerts...');
        // Load security alerts with timeout
        await Promise.race([
            loadSecurityAlerts(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Security alerts loading timeout')), 5000))
        ]);
        console.log('✅ Security alerts loaded successfully');

        // Setup coupon form
        const couponForm = document.getElementById('coupon-form');
        if (couponForm) {
            couponForm.addEventListener('submit', generateCoupon);
            console.log('🎫 Coupon form setup complete');
        }
        
        // Refresh alerts every 30 seconds
        setInterval(loadSecurityAlerts, 30000);

        // Hide loading overlay on success
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            console.log('✅ Loading overlay hidden');
        }
        
        console.log('🎉 Admin dashboard initialization complete!');
    } catch (error) {
        console.error('💥 Error initializing admin dashboard:', error);
        
        // Hide loading overlay on error and show error message
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        alert('Error loading admin dashboard. Please refresh the page.');
    }
});

async function loadDashboard() {
    try {
        console.log('🅿️ Loading parking spots...');
        // Load parking spots
        const { data: spots, error } = await supabase
            .from('parking_spots')
            .select('*')
            .order('spot_number');

        if (error) {
            console.error('❌ Error loading parking spots:', error);
            throw error;
        }
        console.log('✅ Parking spots loaded:', spots?.length || 0, 'spots');

        console.log('📅 Loading active bookings...');
        // Load active bookings
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .gte('end_time', new Date().toISOString());

        if (bookingsError) {
            console.error('❌ Error loading bookings:', bookingsError);
            throw bookingsError;
        }
        console.log('✅ Active bookings loaded:', bookings?.length || 0, 'bookings');

        console.log('📊 Updating stats...');
        // Update stats
        const totalSpotsEl = document.getElementById('total-spots');
        const availableSpotsEl = document.getElementById('available-spots');
        const occupiedSpotsEl = document.getElementById('occupied-spots');
        const activeBookingsEl = document.getElementById('active-bookings');
        
        if (totalSpotsEl) totalSpotsEl.textContent = spots.length;
        if (availableSpotsEl) availableSpotsEl.textContent = spots.filter(s => s.is_available).length;
        if (occupiedSpotsEl) occupiedSpotsEl.textContent = spots.filter(s => !s.is_available).length;
        if (activeBookingsEl) activeBookingsEl.textContent = bookings.length;
        
        console.log('✅ Stats updated');

        console.log('🎨 Rendering parking grid...');
        // Render parking grid
        renderParkingGrid(spots, bookings);
        console.log('✅ Parking grid rendered');

    } catch (error) {
        console.error('💥 Error loading dashboard:', error);
        alert('Error loading dashboard data');
    }
}

function renderParkingGrid(spots, bookings) {
    const grid = document.getElementById('parking-grid');
    grid.innerHTML = '';

    spots.forEach(spot => {
        const isOccupied = !spot.is_available;
        const activeBooking = bookings.find(b => b.spot_id === spot.id && new Date(b.end_time) > new Date());

        const spotDiv = document.createElement('div');
        spotDiv.className = `
            p-6 rounded-lg cursor-pointer transition-all duration-200 text-center font-bold text-white
            ${isOccupied ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
        `;
        spotDiv.innerHTML = `
            <div class="text-2xl mb-2">${spot.spot_number}</div>
            <div class="text-sm">${isOccupied ? 'Occupied' : 'Available'}</div>
            ${activeBooking ? '<div class="text-xs mt-1">Booked</div>' : ''}
        `;
        spotDiv.onclick = () => showSpotDetails(spot.id);
        grid.appendChild(spotDiv);
    });
}

async function showSpotDetails(spotId) {
    currentSpotId = spotId;
    
    try {
        // Get spot details
        const { data: spot, error: spotError } = await supabase
            .from('parking_spots')
            .select('*')
            .eq('id', spotId)
            .single();

        if (spotError) throw spotError;

        // Get all bookings for this spot
        const { data: allBookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                *,
                profiles:user_id (username, email)
            `)
            .eq('spot_id', spotId)
            .order('start_time', { ascending: false });

        if (bookingsError) throw bookingsError;

        const now = new Date();
        const ongoing = allBookings.filter(b => new Date(b.start_time) <= now && new Date(b.end_time) > now);
        const upcoming = allBookings.filter(b => new Date(b.start_time) > now);
        const past = allBookings.filter(b => new Date(b.end_time) <= now);

        // Update modal
        document.getElementById('modal-title').textContent = `Spot ${spot.spot_number} - ${spot.location}`;

        // Camera feed
        const cameraFeed = document.getElementById('camera-feed');
        if (spot.camera_feed_url) {
            cameraFeed.innerHTML = `
                <iframe 
                    src="${spot.camera_feed_url}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0"
                    class="w-full h-full rounded-lg pointer-events-none" 
                    frameborder="0"
                    allow="autoplay; encrypted-media"
                    style="pointer-events: none;"
                    allowfullscreen
                ></iframe>
            `;
        } else {
            cameraFeed.innerHTML = '<p class="text-gray-500">No camera configured</p>';
        }

        // Ongoing bookings
        const ongoingDiv = document.getElementById('ongoing-bookings');
        if (ongoing.length === 0) {
            ongoingDiv.innerHTML = '<p class="text-gray-500">No ongoing bookings</p>';
        } else {
            ongoingDiv.innerHTML = ongoing.map(b => `
                <div class="border border-green-200 rounded p-3 bg-green-50">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold">${b.profiles?.username || 'Unknown'}</p>
                            <p class="text-sm text-gray-600">${b.vehicle_number}</p>
                            <p class="text-sm text-gray-600">
                                ${new Date(b.start_time).toLocaleString()} - ${new Date(b.end_time).toLocaleString()}
                            </p>
                        </div>
                        <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1">
                            <i class="fa fa-circle text-xs"></i>Active
                        </span>
                    </div>
                </div>
            `).join('');
        }
        
        // Upcoming bookings
        const upcomingDiv = document.getElementById('upcoming-bookings');
        if (upcoming.length === 0) {
            upcomingDiv.innerHTML = '<p class="text-gray-500">No upcoming bookings</p>';
        } else {
            upcomingDiv.innerHTML = upcoming.map(b => `
                <div class="border border-gray-200 rounded p-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold">${b.profiles?.username || 'Unknown'}</p>
                            <p class="text-sm text-gray-600">${b.vehicle_number}</p>
                            <p class="text-sm text-gray-600">
                                ${new Date(b.start_time).toLocaleString()} - ${new Date(b.end_time).toLocaleString()}
                            </p>
                        </div>
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Upcoming</span>
                    </div>
                </div>
            `).join('');
        }

        // Past bookings
        const pastDiv = document.getElementById('past-bookings');
        if (past.length === 0) {
            pastDiv.innerHTML = '<p class="text-gray-500">No past bookings</p>';
        } else {
            pastDiv.innerHTML = past.slice(0, 10).map(b => `
                <div class="border border-gray-200 rounded p-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold">${b.profiles?.username || 'Unknown'}</p>
                            <p class="text-sm text-gray-600">${b.vehicle_number}</p>
                            <p class="text-sm text-gray-600">
                                ${new Date(b.start_time).toLocaleString()} - ${new Date(b.end_time).toLocaleString()}
                            </p>
                        </div>
                        <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Completed</span>
                    </div>
                </div>
            `).join('');
        }

        // Show modal
        document.getElementById('spot-modal').classList.remove('hidden');

    } catch (error) {
        console.error('Error loading spot details:', error);
        alert('Error loading spot details');
    }
}

function closeModal() {
    document.getElementById('spot-modal').classList.add('hidden');
}

async function generateCoupon(e) {
    e.preventDefault();

    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    const amount = parseFloat(document.getElementById('coupon-amount').value);
    const maxUses = parseInt(document.getElementById('coupon-max-uses').value);

    try {
        const { data, error } = await supabase
            .from('coupons')
            .insert([{
                code: code,
                amount: amount,
                max_uses: maxUses,
                used_count: 0,
                is_active: true
            }])
            .select();

        if (error) throw error;

        // Show success message
        const messageDiv = document.getElementById('coupon-message');
        messageDiv.className = 'mt-4 p-4 bg-green-100 text-green-700 rounded';
        messageDiv.textContent = `✅ Coupon "${code}" generated successfully! Amount: ₹${amount}, Max Uses: ${maxUses}`;
        messageDiv.classList.remove('hidden');

        // Reset form
        document.getElementById('coupon-form').reset();

        // Hide message after 5 seconds
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);

    } catch (error) {
        console.error('Error generating coupon:', error);
        const messageDiv = document.getElementById('coupon-message');
        messageDiv.className = 'mt-4 p-4 bg-red-100 text-red-700 rounded';
        messageDiv.textContent = `❌ Error: ${error.message}`;
        messageDiv.classList.remove('hidden');
    }
}

// Admin logout function
function adminLogout() {
    localStorage.removeItem('admin_username');
    window.location.href = 'admin-auth.html';
}

// Load security alerts
async function loadSecurityAlerts() {
    try {
        const { data: alerts, error } = await supabase
            .from('security_alerts')
            .select(`
                *,
                profiles:user_id (username, email)
            `)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const container = document.getElementById('security-alerts-container');
        const alertCount = document.getElementById('alert-count');
        
        const pendingCount = alerts.filter(a => a.status === 'pending').length;
        alertCount.textContent = `${pendingCount} Pending`;

        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No security alerts</p>';
            return;
        }

        container.innerHTML = alerts.map(alert => {
            const statusColors = {
                'pending': 'bg-red-100 text-red-800 border-red-300',
                'reviewing': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                'resolved': 'bg-green-100 text-green-800 border-green-300'
            };
            
            const statusIcons = {
                'pending': 'fa-exclamation-circle',
                'reviewing': 'fa-eye',
                'resolved': 'fa-check-circle'
            };

            return `
                <div class="border ${statusColors[alert.status]} rounded-lg p-4">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="fa ${statusIcons[alert.status]}"></i>
                                <span class="font-semibold text-gray-900">Spot ${alert.spot_number}</span>
                                <span class="text-xs px-2 py-1 rounded ${statusColors[alert.status]}">${alert.status.toUpperCase()}</span>
                            </div>
                            <p class="text-sm text-gray-700 mb-1"><strong>Location:</strong> ${alert.location}</p>
                            <p class="text-sm text-gray-700 mb-1"><strong>Vehicle:</strong> ${alert.vehicle_number || 'N/A'}</p>
                            <p class="text-sm text-gray-700 mb-1"><strong>Reported by:</strong> ${alert.profiles?.username || 'Unknown'}</p>
                            <p class="text-sm text-gray-600 mb-2"><strong>Description:</strong> ${alert.description}</p>
                            ${alert.screenshot_url ? `<p class="text-xs text-blue-600"><i class="fa fa-camera"></i> Screenshot available</p>` : ''}
                            <p class="text-xs text-gray-500 mt-2">${new Date(alert.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                    ${alert.status === 'pending' ? `
                        <div class="flex gap-2 mt-3">
                            <button 
                                data-alert-id="${alert.id}" 
                                data-action="reviewing"
                                class="alert-action-btn flex-1 bg-yellow-600 text-white py-1 px-3 rounded text-sm hover:bg-yellow-700"
                            >
                                Mark as Reviewing
                            </button>
                            <button 
                                data-alert-id="${alert.id}" 
                                data-action="resolved"
                                class="alert-action-btn flex-1 bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700"
                            >
                                Mark as Resolved
                            </button>
                        </div>
                    ` : ''}
                    ${alert.status === 'reviewing' ? `
                        <button 
                            data-alert-id="${alert.id}" 
                            data-action="resolved"
                            class="alert-action-btn w-full bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700 mt-3"
                        >
                            Mark as Resolved
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Add event listeners to all alert action buttons
        const actionButtons = container.querySelectorAll('.alert-action-btn');
        console.log(`🔘 Found ${actionButtons.length} alert action buttons`);
        
        actionButtons.forEach((button, index) => {
            console.log(`🔗 Adding event listener to button ${index + 1}`);
            button.addEventListener('click', async (e) => {
                e.preventDefault(); // Prevent any default behavior
                
                const alertId = e.target.getAttribute('data-alert-id');
                const action = e.target.getAttribute('data-action');
                
                console.log(`🖱️ Button clicked - Alert ID: ${alertId}, Action: ${action}`);
                
                // Disable button during processing
                e.target.disabled = true;
                const originalText = e.target.textContent;
                e.target.textContent = 'Processing...';
                
                try {
                    await updateAlertStatus(alertId, action);
                } catch (error) {
                    console.error('❌ Error in button click handler:', error);
                    alert('Error updating alert status. Please try again.');
                    // Restore original text on error
                    e.target.textContent = originalText;
                    e.target.disabled = false;
                }
            });
        });

    } catch (error) {
        console.error('Error loading security alerts:', error);
    }
}

// Update alert status
async function updateAlertStatus(alertId, newStatus) {
    console.log(`🔄 Updating alert ${alertId} to status: ${newStatus}`);
    
    try {
        // Check if admin username exists
        const adminUsername = localStorage.getItem('admin_username');
        if (!adminUsername) {
            throw new Error('Admin not authenticated. Please log in again.');
        }

        console.log(`👤 Admin username: ${adminUsername}`);
        
        const { error } = await supabase
            .from('security_alerts')
            .update({ 
                status: newStatus,
                resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
                resolved_by: adminUsername
            })
            .eq('id', alertId);

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        console.log('✅ Alert status updated successfully');

        // Reload alerts
        await loadSecurityAlerts();
        
        alert(`✅ Alert status updated to: ${newStatus}`);
    } catch (error) {
        console.error('💥 Error updating alert status:', error);
        alert(`❌ Error updating alert status: ${error.message}`);
        throw error; // Re-throw to be caught by the button click handler
    }
}

// Update camera URL for current spot
async function updateCameraUrl() {
    if (!currentSpotId) {
        alert('No spot selected');
        return;
    }
    
    const newUrl = prompt('Enter YouTube Live embed URL:\n\nFormat: https://www.youtube.com/embed/VIDEO_ID\n\nTip: Start YouTube Live on your phone, get the video ID, and use the embed format above.');
    
    if (!newUrl || newUrl.trim() === '') {
        return;
    }
    
    // Validate URL format
    if (!newUrl.includes('youtube.com/embed/') && !newUrl.includes('youtu.be/')) {
        alert('Please use YouTube embed URL format:\nhttps://www.youtube.com/embed/VIDEO_ID');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('parking_spots')
            .update({ camera_feed_url: newUrl.trim() })
            .eq('id', currentSpotId);
        
        if (error) throw error;
        
        alert('Camera URL updated successfully!\n\nRefresh the page to see changes.');
        
        // Reload spot details
        await showSpotDetails(currentSpotId);
        
    } catch (error) {
        console.error('Error updating camera URL:', error);
        alert('Error updating camera URL. Please try again.');
    }
}


// Make functions available globally
window.closeModal = closeModal;
window.adminLogout = adminLogout;
window.updateCameraUrl = updateCameraUrl;
