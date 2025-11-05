import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', function() {
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminMessage = document.getElementById('admin-message');

    if (!adminLoginForm) return;

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;

        // Show loading state
        const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        adminMessage.textContent = '';
        adminMessage.className = 'text-center text-sm';

        try {
            // Query the admins table
            const { data: admin, error } = await supabase
                .from('admins')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (error || !admin) {
                throw new Error('Invalid username or password');
            }

            // Store admin session in localStorage
            localStorage.setItem('admin_username', admin.username);
            localStorage.setItem('admin_id', admin.id);

            // Show success message
            adminMessage.textContent = '✅ Login successful! Redirecting...';
            adminMessage.className = 'text-center text-sm text-green-600';

            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);

        } catch (error) {
            console.error('Admin login error:', error);
            adminMessage.textContent = '❌ ' + (error.message || 'Login failed. Please check your credentials.');
            adminMessage.className = 'text-center text-sm text-red-600';
            
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});
