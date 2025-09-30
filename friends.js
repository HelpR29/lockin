document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await loadFriendData();
});

async function loadFriendData() {
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch friends and requests
    const { data, error } = await supabase
        .from('friends')
        .select('user_id_1, user_id_2, status, profiles1:user_profiles!user_id_1(username), profiles2:user_profiles!user_id_2(username))')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (error) {
        console.error('Error fetching friend data:', error);
        return;
    }

    const friendsList = document.getElementById('friendsList');
    const requestsList = document.getElementById('friendRequestsList');
    friendsList.innerHTML = '';
    requestsList.innerHTML = '';

    data.forEach(friendship => {
        if (friendship.status === 'accepted') {
            const friendId = friendship.user_id_1 === user.id ? friendship.user_id_2 : friendship.user_id_1;
            const friendProfile = friendship.user_id_1 === user.id ? friendship.profiles2 : friendship.profiles1;
            const friendEl = document.createElement('div');
            friendEl.className = 'user-item';
            friendEl.innerHTML = `<span>${friendProfile?.username || 'User'}</span> <button onclick="removeFriend('${friendId}')">Remove</button>`;
            friendsList.appendChild(friendEl);
        } else if (friendship.status === 'requested' && friendship.user_id_2 === user.id) {
            const requesterId = friendship.user_id_1;
            const requesterProfile = friendship.profiles1;
            const requestEl = document.createElement('div');
            requestEl.className = 'user-item';
            requestEl.innerHTML = `<span>${requesterProfile?.username || 'User'}</span> <div><button onclick="acceptRequest('${requesterId}')">Accept</button><button onclick="declineRequest('${requesterId}')">Decline</button></div>`;
            requestsList.appendChild(requestEl);
        }
    });
}

async function searchUsers() {
    const searchTerm = document.getElementById('searchUser').value;
    if (searchTerm.length < 3) return;

    const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
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
}

async function sendRequest(friendId) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('friends').insert({ user_id_1: user.id, user_id_2: friendId, status: 'requested' });
    if (error) alert('Error sending request.');
    else alert('Friend request sent!');
}

async function acceptRequest(requesterId) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('friends').update({ status: 'accepted' }).match({ user_id_1: requesterId, user_id_2: user.id });
    if (error) alert('Error accepting request.');
    else loadFriendData();
}

async function declineRequest(requesterId) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('friends').delete().match({ user_id_1: requesterId, user_id_2: user.id });
    if (error) alert('Error declining request.');
    else loadFriendData();
}

async function removeFriend(friendId) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('friends').delete().or(`(user_id_1.eq.${user.id},user_id_2.eq.${friendId}),(user_id_1.eq.${friendId},user_id_2.eq.${user.id})`);
    if (error) alert('Error removing friend.');
    else loadFriendData();
}
