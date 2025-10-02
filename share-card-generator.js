// Share Card Generator - Create beautiful share images using Canvas

async function generateShareCard(type, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    const PADDING = 60;

    // Get user customization
    const { data: { user } } = await supabase.auth.getUser();
    const { data: customization } = await supabase
        .from('user_customization')
        .select('*')
        .eq('user_id', user.id)
        .single();

    const token = customization?.active_token || '🍺';
    const nameColor = customization?.name_color_hex || '#FFFFFF';
    const avatarUrl = customization?.avatar_url;

    // Background gradient + subtle radial glow
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#141416');
    gradient.addColorStop(1, '#232428');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    const radial = ctx.createRadialGradient(900, 120, 50, 900, 120, 400);
    radial.addColorStop(0, 'rgba(255,149,0,0.18)');
    radial.addColorStop(1, 'rgba(255,149,0,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1200, 630);

    // Add subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 159, 28, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 1200; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 630);
        ctx.stroke();
    }
    for (let i = 0; i < 630; i += 60) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(1200, i);
        ctx.stroke();
    }

    // Brand small, top-left
    ctx.fillStyle = '#FF9F1C';
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔒 LockIn', PADDING, PADDING + 40);

    // Load and draw profile picture if available (top-right)
    if (avatarUrl) {
        await drawProfilePicture(ctx, avatarUrl, 1200 - PADDING - 140, PADDING, 140);
    }

    switch (type) {
        case 'completion':
            renderCompletionCard(ctx, data, token, nameColor);
            break;
        case 'achievement':
            renderAchievementCard(ctx, data, token, nameColor);
            break;
        case 'report':
            renderReportCard(ctx, data, token, nameColor);
            break;
        case 'milestone':
            renderMilestoneCard(ctx, data, token, nameColor);
            break;
    }

    // Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('Track your discipline journey at lockin.app', PADDING, 590);

    return canvas.toDataURL('image/png');
}

// Helper function to draw circular profile picture
async function drawProfilePicture(ctx, imageUrl) {
    return new Promise((resolve) => {
        // Skip if no URL provided
        if (!imageUrl || imageUrl.trim() === '') {
            console.log('No profile picture URL provided');
            resolve();
            return;
        }

        const img = new Image();
        
        // Try with crossOrigin first
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            try {
                const size = 180;  // Slightly smaller for better fit
                const x = 980;     // Moved right
                const y = 180;     // Moved down
                
                // Draw circular mask
                ctx.save();
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                
                // Draw image
                ctx.drawImage(img, x, y, size, size);
                
                ctx.restore();
                
                // Draw border
                ctx.strokeStyle = '#FF9F1C';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
                ctx.stroke();
                
                console.log('✅ Profile picture loaded');
                resolve();
            } catch (err) {
                console.warn('Error drawing profile picture:', err);
                resolve();
            }
        };
        
        img.onerror = (err) => {
            console.warn('Failed to load profile picture:', err);
            // Draw placeholder circle instead
            const size = 180;  // Match the size
            const x = 980;
            const y = 180;
            
            ctx.fillStyle = 'rgba(255, 159, 28, 0.2)';
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#FF9F1C';
            ctx.lineWidth = 4;
            ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw emoji placeholder
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '60px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('👤', x + size/2, y + size/2 + 20);
            ctx.textAlign = 'left';
            
            resolve(); // Continue without image
        };
        
        img.src = imageUrl;
    });
}

function renderCompletionCard(ctx, data, token, nameColor) {
    const { username, completions, streak, discipline } = data;

    // User name with custom color
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.fillText(username, 50, 200);

    // Stats (left side)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.fillText('Glass Cracked!', 50, 320);

    ctx.font = '36px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`${completions} Total Completions`, 50, 390);
    ctx.fillText(`${streak} Day Streak 🔥`, 50, 440);
    ctx.fillText(`${discipline}% Discipline Score`, 50, 490);

    // Giant token (center-right, not overlapping profile)
    ctx.font = '200px sans-serif';
    ctx.fillText(token, 650, 400);
}

function renderAchievementCard(ctx, data, token, nameColor) {
    const { username, achievementName, achievementIcon, stars, xp } = data;

    // Achievement icon
    ctx.font = '200px sans-serif';
    ctx.fillText(achievementIcon, 450, 340);

    // User name
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillText(username, 50, 180);

    // Achievement unlocked text
    ctx.fillStyle = '#FF9F1C';
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.fillText('🏆 Achievement Unlocked!', 50, 270);

    // Achievement name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.fillText(achievementName, 50, 380);

    // Rewards
    ctx.font = '36px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`⭐ +${stars} stars  |  🎯 +${xp} XP`, 50, 450);
}

function renderReportCard(ctx, data, token, nameColor) {
    const { username, totalPL, winRate, completions, disciplineScore } = data;

    // User name
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.fillText(username, 50, 180);

    // Title
    ctx.fillStyle = '#FF9F1C';
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillText('📊 Trading Report', 50, 250);

    // Stats grid
    const stats = [
        { label: 'Total P/L', value: `$${totalPL.toFixed(2)}`, color: totalPL >= 0 ? '#34C759' : '#FF453A' },
        { label: 'Win Rate', value: `${winRate}%`, color: '#FF9F1C' },
        { label: 'Completions', value: completions, color: '#FFFFFF' },
        { label: 'Discipline', value: `${disciplineScore}%`, color: disciplineScore >= 80 ? '#34C759' : '#FFC107' }
    ];

    let y = 340;
    stats.forEach(stat => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '28px Inter, sans-serif';
        ctx.fillText(stat.label, 50, y);

        ctx.fillStyle = stat.color;
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.fillText(stat.value, 400, y);

        y += 70;
    });

    // Token
    ctx.font = '120px sans-serif';
    ctx.fillText(token, 950, 400);
}

function renderMilestoneCard(ctx, data, token, nameColor) {
    const { username, milestone, message } = data;

    // Giant token
    ctx.font = '220px sans-serif';
    ctx.fillText(token, 450, 340);

    // User name
    ctx.fillStyle = nameColor;
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.fillText(username, 50, 180);

    // Milestone text
    ctx.fillStyle = '#FF9F1C';
    ctx.font = 'bold 72px Inter, sans-serif';
    ctx.fillText(milestone, 50, 380);

    // Message
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '36px Inter, sans-serif';
    ctx.fillText(message, 50, 460);
}

// Share to platforms
async function shareCard(type, data) {
    try {
        const imageData = await generateShareCard(type, data);
        
        // Save to share history
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('share_history').insert({
            user_id: user.id,
            share_type: type,
            share_data: data
        });

        // Show share modal
        showShareModal(imageData);
    } catch (error) {
        console.error('Error generating share card:', error);
        alert('Failed to generate share card');
    }
}

function showShareModal(imageData) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content">
            <span class="close-button" onclick="this.closest('.share-modal').remove()">&times;</span>
            <h2>Share Your Achievement 🎉</h2>
            
            <div class="share-preview">
                <img src="${imageData}" alt="Share card" style="max-width: 100%; border-radius: 12px; border: 2px solid var(--primary);">
            </div>
            
            <div class="share-buttons">
                <button class="cta-primary" onclick="downloadShareCard('${imageData}')">
                    📥 Download Image
                </button>
                <button class="cta-secondary" onclick="copyShareCard('${imageData}')">
                    📋 Copy Image
                </button>
            </div>
            
            <p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">
                Share on Twitter, LinkedIn, Instagram, or anywhere else!
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function downloadShareCard(imageData) {
    const link = document.createElement('a');
    link.download = `lockin-share-${Date.now()}.png`;
    link.href = imageData;
    link.click();
}

async function copyShareCard(imageData) {
    try {
        const blob = await (await fetch(imageData)).blob();
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        alert('✅ Image copied to clipboard! Paste it anywhere.');
    } catch (error) {
        console.error('Error copying image:', error);
        alert('Failed to copy. Try downloading instead.');
    }
}

// Export functions
window.generateShareCard = generateShareCard;
window.shareCard = shareCard;
window.downloadShareCard = downloadShareCard;
window.copyShareCard = copyShareCard;
