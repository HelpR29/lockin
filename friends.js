document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        await loadFriendData();
    } catch (error) {
        console.error('Error initializing friends:', error);
        alert('Failed to load friends. Please refresh the page.');
    }
});

async function loadFriendData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

    // 1) Fetch all friendships involving the user
    const { data: friendships, error } = await supabase
        .from('friends')
        .select('user_id_1, user_id_2, status')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (error) {
        console.error('Error fetching friend data:', error);
        return;
    }

    const friendsList = document.getElementById('friendsList');
    const requestsList = document.getElementById('friendRequestsList');
    friendsList.innerHTML = '';
    requestsList.innerHTML = '';

    if (!friendships || friendships.length === 0) return;

    // 2) Collect other user IDs and fetch their usernames
    const otherIds = new Set();
    friendships.forEach(f => {
        const other = f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1;
        otherIds.add(other);
    });

    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', Array.from(otherIds));

    const nameMap = new Map();
    (profiles || []).forEach(p => nameMap.set(p.user_id, p.username || 'User'));

    // 3) Render lists
    friendships.forEach(f => {
        if (f.status === 'accepted') {
            const friendId = f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1;
            const friendEl = document.createElement('div');
            friendEl.className = 'user-item';
            friendEl.innerHTML = `<span>${nameMap.get(friendId) || 'User'}</span> <button onclick="removeFriend('${friendId}')">Remove</button>`;
            friendsList.appendChild(friendEl);
        } else if (f.status === 'requested' && f.user_id_2 === user.id) {
            const requesterId = f.user_id_1;
            const requestEl = document.createElement('div');
            requestEl.className = 'user-item';
            requestEl.innerHTML = `<span>${nameMap.get(requesterId) || 'User'}</span> <div><button onclick="acceptRequest('${requesterId}')">Accept</button><button onclick="declineRequest('${requesterId}')">Decline</button></div>`;
            requestsList.appendChild(requestEl);
        }
    });
    } catch (error) {
        console.error('Error loading friend data:', error);
        throw error;
    }
}

async function searchUsers() {
    try {
        const searchInput = document.getElementById('searchUser');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length < 3) return;

    const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .ilike('username', `%${searchTerm}%`)
        .limit(10);

    if (error) {
        console.error('Error searching users:', error);
        return;
    }

    const resultsList = document.getElementById('searchResultsList');
    resultsList.innerHTML = '';
    data.forEach(profile => {
        const resultEl = document.createElement('div');
        resultEl.className = 'user-item';
        resultEl.innerHTML = `<span>${profile.username}</span> <button onclick="sendRequest('${profile.user_id}')">Add</button>`;
        resultsList.appendChild(resultEl);
    });
    } catch (error) {
        console.error('Error searching users:', error);
        alert('Search failed. Please try again.');
    }
}

async function sendRequest(friendId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase.from('friends').insert({ user_id_1: user.id, user_id_2: friendId, status: 'requested' });
        if (error) {
            console.error('Error sending request:', error);
            alert('Error sending request.');
        } else {
            alert('Friend request sent!');
        }
    } catch (error) {
        console.error('Error sending request:', error);
        alert('An error occurred. Please try again.');
    }
}

async function acceptRequest(requesterId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase.from('friends').update({ status: 'accepted' }).match({ user_id_1: requesterId, user_id_2: user.id });
        if (error) {
            console.error('Error accepting request:', error);
            alert('Error accepting request.');
        } else {
            await loadFriendData();
        }
    } catch (error) {
        console.error('Error accepting request:', error);
        alert('An error occurred. Please try again.');
    }
}

async function declineRequest(requesterId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase.from('friends').delete().match({ user_id_1: requesterId, user_id_2: user.id });
        if (error) {
            console.error('Error declining request:', error);
            alert('Error declining request.');
        } else {
            await loadFriendData();
        }
    } catch (error) {
        console.error('Error declining request:', error);
        alert('An error occurred. Please try again.');
    }
}

async function removeFriend(friendId) {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase.from('friends').delete().or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`).or(`user_id_1.eq.${friendId},user_id_2.eq.${friendId}`);
        if (error) {
            console.error('Error removing friend:', error);
            alert('Error removing friend.');
        } else {
            await loadFriendData();
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        alert('An error occurred. Please try again.');
    }
}

// Export functions to global scope for HTML onclick handlers
window.searchUsers = searchUsers;
window.sendRequest = sendRequest;
window.acceptRequest = acceptRequest;
window.declineRequest = declineRequest;
window.removeFriend = removeFriend;
