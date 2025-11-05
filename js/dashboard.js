import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async function() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    const welcomeName = document.getElementById('welcome-name');
    const transactionsContainer = document.getElementById('transactions-container');
    const notificationsContainer = document.getElementById('notifications-container');

    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            window.location.href = 'auth.html';
            return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Profile error:', profileError);
            loading.textContent = 'Error loading profile. Please try again.';
            return;
        }

        // Update welcome message and balance
        welcomeName.textContent = profile.username;
        document.getElementById('balance-amount').textContent = parseFloat(profile.credit_balance).toFixed(2);

        // Setup coupon form
        setupCouponForm(user.id);

        // Get transaction history
        const { data: transactions, error: transError } = await supabase
            .from('transaction_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (transError) {
            console.error('Transaction error:', transError);
        }

        // Get bookings with parking spot details
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                *,
                parking_spots (
                    spot_number,
                    location,
                    camera_feed_url,
                    sensor_id
                )
            `)
            .eq('user_id', user.id)
            .eq('is_completed', false)
            .order('start_time', { ascending: true });

        if (bookingsError) {
            console.error('Bookings error:', bookingsError);
        }

        // Get sensor data for bookings
        const sensorIds = bookings ? bookings.map(b => b.parking_spots.sensor_id).filter(id => id) : [];
        let sensorData = [];
        if (sensorIds.length > 0) {
            const { data: sensorDataRes, error: sensorError } = await supabase
                .from('sensor_data')
                .select('*')
                .in('sensor_id', sensorIds);

            if (sensorError) {
                console.error('Sensor data error:', sensorError);
            } else {
                sensorData = sensorDataRes || [];
            }
        }

        // Get notifications
        const { data: notifications, error: notificationsError } = await supabase
            .from('security_alerts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (notificationsError) {
            console.error('Notifications error:', notificationsError);
        }

        // Display data
        displayTransactions(transactions || []);
        displayBookings(bookings || [], sensorData);
        displayNotifications(notifications || []);

        // Setup camera modal
        setupCameraModal();

        // Setup buy coupon button
        setupBuyCouponButton();

        // Hide loading, show content
        loading.classList.add('hidden');
        content.classList.remove('hidden');

    } catch (err) {
        console.error('Dashboard error:', err);
        loading.textContent = 'Error loading dashboard. Please refresh the page.';
    }
});

function setupCouponForm(userId) {
    const couponForm = document.getElementById('coupon-form');
    const couponCodeInput = document.getElementById('coupon-code');
    const couponMessage = document.getElementById('coupon-message');

    couponForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = couponCodeInput.value.trim().toUpperCase();

        if (!code) {
            showCouponMessage('Please enter a coupon code', 'error');
            return;
        }

        try {
            // Call the redeem_coupon function
            const { data, error } = await supabase.rpc('redeem_coupon', {
                p_user_id: userId,
                p_coupon_code: code
            });

            if (error) {
                console.error('Coupon error:', error);
                showCouponMessage('Error redeeming coupon. Please try again.', 'error');
                return;
            }

            if (data.success) {
                showCouponMessage(`Success! ₹${data.amount} added to your balance`, 'success');
                couponCodeInput.value = '';
                
                // Reload the page to show updated balance and transactions
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showCouponMessage(data.message, 'error');
            }
        } catch (err) {
            console.error('Coupon redemption error:', err);
            showCouponMessage('Error redeeming coupon. Please try again.', 'error');
        }
    });
}

function showCouponMessage(message, type) {
    const couponMessage = document.getElementById('coupon-message');
    couponMessage.textContent = message;
    couponMessage.className = `mt-3 text-sm ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
}

function displayBookings(bookings, sensorData) {
    const ongoingContainer = document.getElementById('ongoing-bookings-container');
    const upcomingContainer = document.getElementById('upcoming-bookings-container');
    
    if (!bookings || bookings.length === 0) {
        ongoingContainer.innerHTML = '<p class="text-gray-500 text-center">No ongoing bookings</p>';
        upcomingContainer.innerHTML = '<p class="text-gray-500 text-center">No upcoming bookings</p>';
        return;
    }

    const now = new Date();
    const ongoingBookings = [];
    const upcomingBookings = [];

    // Separate bookings into ongoing and upcoming based on time
    bookings.forEach(booking => {
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        const sensor = sensorData.find(s => s.id === booking.parking_spots.sensor_id);
        
        // Attach sensor data to booking for use in createBookingCard
        booking.sensorData = sensor;
        
        // Categorize based on time
        if (now < startTime) {
            // Before start time = Upcoming
            upcomingBookings.push(booking);
        } else {
            // After start time (including overstay) = Ongoing
            ongoingBookings.push(booking);
        }
    });

    // Display ongoing bookings
    if (ongoingBookings.length === 0) {
        ongoingContainer.innerHTML = '<p class="text-gray-500 text-center">No ongoing bookings</p>';
    } else {
        ongoingContainer.innerHTML = ongoingBookings.map(booking => createBookingCard(booking, true)).join('');
    }

    // Display upcoming bookings
    if (upcomingBookings.length === 0) {
        upcomingContainer.innerHTML = '<p class="text-gray-500 text-center">No upcoming bookings</p>';
    } else {
        upcomingContainer.innerHTML = upcomingBookings.map(booking => createBookingCard(booking, false)).join('');
    }
}

function createBookingCard(booking, isOngoing) {
    const startTime = new Date(booking.start_time).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
    const endTime = new Date(booking.end_time).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    // Check if booking is overstaying (past end time)
    const now = new Date();
    const bookingEndTime = new Date(booking.end_time);
    const isOverstaying = now > bookingEndTime;
    
    // Calculate overstay time if applicable
    let overstayMinutes = 0;
    if (isOverstaying) {
        overstayMinutes = Math.floor((now - bookingEndTime) / (1000 * 60));
    }

    // Status badge - red for overstaying, green for ongoing, blue for upcoming
    let statusBadge;
    if (isOverstaying) {
        statusBadge = '<span class="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1 animate-pulse"><i class="fa fa-exclamation-triangle text-xs"></i>Overstaying</span>';
    } else if (isOngoing) {
        statusBadge = '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1"><i class="fa fa-circle text-xs"></i>Active</span>';
    } else {
        statusBadge = '<span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Upcoming</span>';
    }

    // Overstay warning banner
    const overstayWarning = isOverstaying ? `
        <div class="mb-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <div class="flex items-start">
                <i class="fa fa-exclamation-triangle text-red-600 mt-1 mr-2"></i>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-red-800">⚠️ Overstay Detected!</p>
                    <p class="text-xs text-red-700 mt-1">
                        You have exceeded your booking time by <strong>${overstayMinutes} minutes</strong>.
                        Penalty of <strong>₹1.5 per interval</strong> is being deducted from your balance.
                    </p>
                    <p class="text-xs text-red-600 mt-1 font-medium">
                        Please vacate the spot immediately to avoid additional charges!
                    </p>
                </div>
            </div>
        </div>
    ` : '';

    const liveFeedButton = isOngoing
        ? `<button 
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            onclick="openCameraFeed('${booking.id}', '${booking.parking_spots.spot_number}', '${booking.parking_spots.location}', '${booking.vehicle_number}', '${startTime} - ${endTime}', '${booking.parking_spots.camera_feed_url}')"
        >
            <i class="fa fa-video-camera"></i>
            Watch Live Feed
        </button>`
        : `<button 
            class="w-full bg-gray-400 text-white py-2 px-4 rounded-lg cursor-not-allowed font-medium flex items-center justify-center gap-2"
            disabled
        >
            <i class="fa fa-video-camera"></i>
            Live Feed (Available at start time)
        </button>`;

    const extendButton = isOngoing
        ? `<button 
            class="w-full mt-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            onclick="showExtendBookingModal('${booking.id}', '${booking.parking_spots.spot_number}')"
        >
            <i class="fa fa-clock-o"></i>
            Extend Booking
        </button>`
        : '';

    return `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${isOverstaying ? 'border-l-4 border-l-red-500 bg-red-50' : isOngoing ? 'border-l-4 border-l-green-500' : ''}">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="font-semibold text-lg text-gray-900">Spot ${booking.parking_spots.spot_number}</h4>
                    <p class="text-sm text-gray-600">${booking.parking_spots.location}</p>
                </div>
                ${statusBadge}
            </div>
            ${overstayWarning}
            <div class="space-y-2 text-sm text-gray-600 mb-4">
                <p><i class="fa fa-car mr-2"></i><strong>Vehicle:</strong> ${booking.vehicle_number}</p>
                <p><i class="fa fa-clock-o mr-2"></i><strong>Start:</strong> ${startTime}</p>
                <p><i class="fa fa-clock-o mr-2"></i><strong>End:</strong> ${endTime}</p>
                <p><i class="fa fa-money mr-2"></i><strong>Cost:</strong> ₹${parseFloat(booking.total_cost).toFixed(2)}</p>
            </div>
            ${liveFeedButton}
            ${extendButton}
        </div>
    `;
}

function displayTransactions(transactions) {
    const container = document.getElementById('transactions-container');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No transactions yet</p>';
        return;
    }

    container.innerHTML = transactions.map(tx => {
        const isPositive = tx.amount >= 0;
        const amountClass = isPositive ? 'text-green-600' : 'text-red-600';
        const sign = isPositive ? '+' : '';
        const date = new Date(tx.created_at).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        return `
            <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                    <p class="font-medium text-gray-900">${tx.description}</p>
                    <p class="text-sm text-gray-500">${date}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold ${amountClass}">₹${sign}${Math.abs(tx.amount).toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');
}

function displayNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    const notificationsSection = container.closest('.bg-white');
    
    if (!notifications || notifications.length === 0) {
        notificationsSection.classList.add('hidden');
        container.innerHTML = '<p class="text-gray-500 text-center">No notifications</p>';
        return;
    }
    
    notificationsSection.classList.remove('hidden');
    container.innerHTML = notifications.map(notification => {
        const date = new Date(notification.created_at).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
        
        let statusBadge;
        switch (notification.status) {
            case 'pending':
                statusBadge = '<span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Pending</span>';
                break;
            case 'reviewing':
                statusBadge = '<span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Under Review</span>';
                break;
            case 'resolved':
                statusBadge = '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Resolved</span>';
                break;
            default:
                statusBadge = '<span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Unknown</span>';
        }
        
        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-semibold text-lg text-gray-900">${notification.description.split(':')[0]}</h4>
                        <p class="text-sm text-gray-600">${notification.description}</p>
                    </div>
                    ${statusBadge}
                </div>
                <div class="text-sm text-gray-500">
                    <p><strong>Date:</strong> ${date}</p>
                    ${notification.spot_number ? `<p><strong>Spot:</strong> ${notification.spot_number}</p>` : ''}
                    ${notification.admin_notes ? `<p><strong>Admin Response:</strong> ${notification.admin_notes}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function setupCameraModal() {
    const modal = document.getElementById('camera-modal');
    const closeBtn = document.getElementById('close-modal');

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        document.getElementById('camera-iframe').src = '';
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.getElementById('camera-iframe').src = '';
        }
    });
}

function setupBuyCouponButton() {
    const buyCouponBtn = document.getElementById('buy-coupon-btn');
    buyCouponBtn.addEventListener('click', () => {
        window.location.href = 'payment.html';
    });
}

// Global function to open camera feed
window.openCameraFeed = function(bookingId, spotNumber, location, vehicle, time, cameraUrl) {
    const modal = document.getElementById('camera-modal');
    const iframe = document.getElementById('camera-iframe');
    
    document.getElementById('modal-spot-number').textContent = spotNumber;
    document.getElementById('modal-location').textContent = location;
    document.getElementById('modal-vehicle').textContent = vehicle;
    document.getElementById('modal-time').textContent = time;
    
    // Set camera feed URL with mute and autoplay parameters
    const urlParams = cameraUrl.includes('?') ? '&' : '?';
    iframe.src = `${cameraUrl}${urlParams}autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0`;
    
    // Store current booking data for alert
    modal.dataset.bookingId = bookingId;
    modal.dataset.spotNumber = spotNumber;
    modal.dataset.location = location;
    modal.dataset.vehicle = vehicle;
    
    // Setup screenshot and alert buttons
    setupSecurityAlertButtons(bookingId, spotNumber, location, vehicle);
    
    modal.classList.remove('hidden');
};

// Global function to show extend booking modal
window.showExtendBookingModal = function(bookingId, spotNumber) {
    const minutes = prompt(`Extend booking for Spot ${spotNumber}\n\nEnter number of minutes to extend (1-60):`);
    
    if (!minutes || isNaN(minutes) || minutes < 1 || minutes > 60) {
        if (minutes !== null) {
            alert('Please enter a valid number of minutes (1-60)');
        }
        return;
    }
    
    extendBooking(bookingId, parseInt(minutes));
};

async function extendBooking(bookingId, minutes) {
    try {
        const { data, error } = await supabase.rpc('extend_booking', {
            p_booking_id: bookingId,
            p_extension_minutes: minutes
        });
        
        if (error) {
            console.error('Extension error:', error);
            alert('Error extending booking. Please try again.');
            return;
        }
        
        if (data.success) {
            alert(`Success! Booking extended by ${minutes} minutes.\nCost: ₹${data.extension_cost.toFixed(2)}\nNew end time: ${new Date(data.new_end_time).toLocaleString('en-IN')}`);
            window.location.reload();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Extension error:', err);
        alert('Error extending booking. Please try again.');
    }
}

// Open camera feed modal
window.openCameraFeed = function(bookingId, spotNumber, location, vehicle, time, cameraUrl) {
    const modal = document.getElementById('camera-modal');
    const iframe = document.getElementById('camera-iframe');
    const closeBtn = document.getElementById('close-modal');
    
    // Set modal content
    document.getElementById('modal-spot-number').textContent = spotNumber;
    document.getElementById('modal-location').textContent = location;
    document.getElementById('modal-vehicle').textContent = vehicle;
    document.getElementById('modal-time').textContent = time;
    
    // Set camera feed URL
    if (cameraUrl && cameraUrl !== 'null' && cameraUrl !== '') {
        iframe.src = cameraUrl;
    } else {
        iframe.src = '';
        iframe.parentElement.innerHTML = `
            <div class="w-full h-full flex items-center justify-center text-white">
                <div class="text-center">
                    <i class="fa fa-video-camera text-6xl mb-4 opacity-50"></i>
                    <p class="text-lg">No camera feed available</p>
                    <p class="text-sm opacity-75 mt-2">Admin hasn't configured the camera URL yet</p>
                </div>
            </div>
        `;
    }
    
    // Setup security alert buttons
    setupSecurityAlertButtons(bookingId, spotNumber, location, vehicle);
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Close modal handler
    closeBtn.onclick = () => {
        modal.classList.add('hidden');
        iframe.src = ''; // Stop video
        
        // Reset alert button
        const sendAlertBtn = document.getElementById('send-alert-btn');
        const alertMessage = document.getElementById('alert-message');
        sendAlertBtn.disabled = false;
        sendAlertBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        sendAlertBtn.innerHTML = '<i class="fa fa-bell"></i> Send Security Alert';
        alertMessage.textContent = '';
    };
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    };
};

// Setup security alert buttons
function setupSecurityAlertButtons(bookingId, spotNumber, location, vehicle) {
    const sendAlertBtn = document.getElementById('send-alert-btn');
    const alertMessage = document.getElementById('alert-message');
    
    // Send alert button
    sendAlertBtn.onclick = async () => {
        const description = prompt('Describe the unusual activity you observed:');
        
        if (!description || description.trim() === '') {
            alertMessage.textContent = '⚠️ Please provide a description of the activity.';
            alertMessage.className = 'mt-3 text-sm text-yellow-600';
            return;
        }
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                alertMessage.textContent = '❌ You must be logged in to send alerts.';
                alertMessage.className = 'mt-3 text-sm text-red-600';
                return;
            }
            
            // Get spot_id from booking
            const { data: booking } = await supabase
                .from('bookings')
                .select('spot_id')
                .eq('id', bookingId)
                .single();
            
            // Insert security alert
            const { data, error } = await supabase
                .from('security_alerts')
                .insert([{
                    user_id: user.id,
                    booking_id: bookingId,
                    spot_id: booking.spot_id,
                    spot_number: spotNumber,
                    location: location,
                    vehicle_number: vehicle,
                    screenshot_url: null,
                    description: description.trim(),
                    status: 'pending'
                }])
                .select();
            
            if (error) throw error;
            
            alertMessage.textContent = '✅ Alert sent successfully! Admin team has been notified. If you took a screenshot, please keep it for reference.';
            alertMessage.className = 'mt-3 text-sm text-green-600 font-medium';
            
            sendAlertBtn.disabled = true;
            sendAlertBtn.classList.add('opacity-50', 'cursor-not-allowed');
            sendAlertBtn.innerHTML = '<i class="fa fa-check"></i> Alert Sent';
            
        } catch (err) {
            console.error('Alert error:', err);
            alertMessage.textContent = '❌ Error sending alert. Please try again.';
            alertMessage.className = 'mt-3 text-sm text-red-600';
        }
    };
}
