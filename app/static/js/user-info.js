// static/js/user-info.js
async function loadUserInfo() {
    const avatarElement = document.getElementById('user-avatar');
    const cacheKey = 'userAvatarData';
    const cachedData = localStorage.getItem(cacheKey);
    let email, avatarUrl, initials;

    // Función para mostrar iniciales
    function showInitials() {
        avatarElement.style.display = 'none';
        const initialsDiv = document.createElement('div');
        initialsDiv.className = 'user-avatar-initials';
        initialsDiv.textContent = initials;
        avatarElement.parentNode.insertBefore(initialsDiv, avatarElement);
    }

    // Primero, usa cache si existe y no ha expirado
    if (cachedData) {
        const { url, email: cachedEmail, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 3600000) { // 1 hora en ms
            email = cachedEmail;
            avatarUrl = url;
            initials = email.split('@')[0].substring(0, 2).toUpperCase();

            if (avatarUrl) {
                avatarElement.src = avatarUrl;
                avatarElement.alt = 'User avatar';
            } else {
                showInitials();
            }
            avatarElement.title = email;
        }
    }

    // Siempre haz el fetch para actualizar
    try {
        const response = await fetch('/auth/user');
        if (response.ok) {
            const data = await response.json();
            email = data.user.email;
            avatarUrl = data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture;
            initials = email.split('@')[0].substring(0, 2).toUpperCase();

            // Actualiza el DOM si no hay cache o cambió
            if (avatarUrl) {
                avatarElement.src = avatarUrl;
                avatarElement.alt = 'User avatar';
                // Remueve iniciales si existen
                const initialsElem = avatarElement.previousSibling;
                if (initialsElem && initialsElem.className === 'user-avatar-initials') {
                    initialsElem.remove();
                }
                avatarElement.style.display = '';
            } else {
                showInitials();
            }
            avatarElement.title = email;

            // Guarda en cache
            localStorage.setItem(cacheKey, JSON.stringify({
                url: avatarUrl,
                email,
                timestamp: Date.now()
            }));
        } else {
            throw new Error('Redirect to login');
        }
    } catch (error) {
        localStorage.removeItem(cacheKey); // Limpia cache si falla
        window.location.href = '/auth/login';
    }
}

document.addEventListener('DOMContentLoaded', loadUserInfo);