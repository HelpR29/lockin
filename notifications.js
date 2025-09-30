// Notifications System - In-App & Browser Push

// Toggle notification dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
        loadNotifications();
    } else {
        dropdown.style.display = 'none';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notificationDropdown');
    const bell = document.querySelector('.notification-bell');
    if (dropdown && bell && !dropdown.contains(e.target) && !bell.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// Load notifications from database
async function loadNotifications() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('Error loading notifications:', error);
            return;
        }
        
        displayNotifications(notifications);
        updateNotificationBadge(notifications);
    } catch (error) {
        console.error('Error in loadNotifications:', error);
    }
}

// Display notifications in dropdown
function displayNotifications(notifications) {
    const listEl = document.getElementById('notificationList');
    if (!listEl) return;
    
    if (!notifications || notifications.length === 0) {
        listEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No notifications yet</div>';
        return;
    }
    
    listEl.innerHTML = notifications.map(notif => `
        <div class="notification-item" onclick="markAsRead('${notif.id}')" style="padding: 1rem; border-bottom: 1px solid var(--border); cursor: pointer; ${notif.read ? 'opacity: 0.6;' : 'background: rgba(255, 149, 0, 0.05);'} transition: background 0.3s;" onmouseover="this.style.background='rgba(255,149,0,0.1)'" onmouseout="this.style.background='${notif.read ? 'transparent' : 'rgba(255, 149, 0, 0.05)'}'">
            <div style="display: flex; gap: 0.75rem; align-items: start;">
                <span style="font-size: 1.5rem;">${notif.icon}</span>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <strong style="display: block; margin-bottom: 0.25rem;">${notif.title}</strong>
                        ${!notif.read ? '<span style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%;"></span>' : ''}
                    </div>
                    <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">${notif.message}</p>
                    <small style="color: var(--text-muted); font-size: 0.75rem;">${formatNotificationTime(notif.created_at)}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// Update notification badge count
function updateNotificationBadge(notifications) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Format notification time
function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
        
        if (error) {
            console.error('Error marking as read:', error);
            return;
        }
        
        await loadNotifications();
    } catch (error) {
        console.error('Error in markAsRead:', error);
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);
        
        if (error) {
            console.error('Error marking all as read:', error);
            return;
        }
        
        await loadNotifications();
    } catch (error) {
        console.error('Error in markAllAsRead:', error);
    }
}

// Create a new notification
async function createNotification(type, title, message, icon = '🔔', actionUrl = null, metadata = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: user.id,
                type,
                title,
                message,
                icon,
                action_url: actionUrl,
                metadata
            });
        
        if (error) {
            console.error('Error creating notification:', error);
            return;
        }
        
        // Refresh notifications
        await loadNotifications();
        
        // Send browser push notification if supported
        await sendBrowserNotification(title, message, icon);
    } catch (error) {
        console.error('Error in createNotification:', error);
    }
}

// ===== BROWSER PUSH NOTIFICATIONS =====

// Request permission for browser notifications
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
    }
    
    if (Notification.permission === 'granted') {
        return true;
    }
    
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    
    return false;
}

// Send browser push notification
async function sendBrowserNotification(title, message, icon = '🔔') {
    try {
        if (Notification.permission !== 'granted') {
            return;
        }
        
        const notification = new Notification(title, {
            body: message,
            icon: '/favicon.ico', // You can create a custom icon
            badge: '/favicon.ico',
            tag: 'lockin-notification',
            requireInteraction: false
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
    } catch (error) {
        console.error('Error sending browser notification:', error);
    }
}

// Initialize notifications on page load
async function initNotifications() {
    try {
        // Load initial notifications
        await loadNotifications();
        
        // Only request permission if not already decided (don't annoy users)
        if (Notification.permission === 'default') {
            const hasPermission = await requestNotificationPermission();
            if (hasPermission) {
                console.log('Browser notifications enabled ✅');
            } else {
                console.log('Browser notifications declined - using in-app only');
            }
        } else if (Notification.permission === 'granted') {
            console.log('Browser notifications already enabled ✅');
        } else {
            console.log('Browser notifications blocked - using in-app only');
        }
        
        // Poll for new notifications every 30 seconds
        setInterval(async () => {
            await loadNotifications();
        }, 30000);
    } catch (error) {
        console.error('Error initializing notifications:', error);
    }
}

// Notification event triggers
async function notifyAchievementUnlocked(achievementName, icon = '🏆') {
    await createNotification(
        'achievement',
        'Achievement Unlocked!',
        `You earned "${achievementName}"!`,
        icon,
        '/achievements.html'
    );
}

async function notifyStreakMilestone(days, icon = '🔥') {
    await createNotification(
        'streak',
        `${days} Day Streak!`,
        `Amazing! You've maintained a ${days} day streak. Keep it up!`,
        icon
    );
}

async function notifyRuleViolation(ruleName, icon = '⚠️') {
    await createNotification(
        'rule_violation',
        'Rule Violation',
        `You violated your rule: ${ruleName}`,
        icon,
        '/rules.html'
    );
}

async function notifyGoalReached(goalName, icon = '🎯') {
    await createNotification(
        'goal_reached',
        'Goal Reached!',
        `Congratulations! You completed: ${goalName}`,
        icon
    );
}

async function notifyDailyReminder(icon = '📝') {
    await createNotification(
        'reminder',
        'Daily Check-in',
        `Don't forget to log today's trades!`,
        icon,
        '/journal.html'
    );
}

// Export functions
window.toggleNotifications = toggleNotifications;
window.loadNotifications = loadNotifications;
window.markAsRead = markAsRead;
window.markAllAsRead = markAllAsRead;
window.createNotification = createNotification;
window.initNotifications = initNotifications;
window.requestNotificationPermission = requestNotificationPermission;
window.notifyAchievementUnlocked = notifyAchievementUnlocked;
window.notifyStreakMilestone = notifyStreakMilestone;
window.notifyRuleViolation = notifyRuleViolation;
window.notifyGoalReached = notifyGoalReached;
window.notifyDailyReminder = notifyDailyReminder;
