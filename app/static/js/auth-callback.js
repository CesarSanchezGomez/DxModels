// static/js/auth-callback.js
(function() {
    'use strict';

    const ALLOWED_DOMAIN = window.ALLOWED_DOMAIN || 'dxgrow.com';

    function showError(message) {
        const spinner = document.getElementById('spinner');
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        if (spinner) spinner.style.display = 'none';
        if (errorText) errorText.textContent = message;
        if (errorMessage) errorMessage.style.display = 'block';
    }

    async function processCallback() {
        try {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));

            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const error = hashParams.get('error');
            const errorDescription = hashParams.get('error_description');

            // Verificar errores en el hash
            if (error) {
                showError(`Error de autenticación: ${errorDescription || error}`);
                return;
            }

            // Verificar que exista el token
            if (!accessToken) {
                showError('No se recibió el token de acceso. Por favor, intenta nuevamente.');
                return;
            }

            // Decodificar el JWT para obtener el email
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const email = payload.email;

            // Verificar dominio permitido
            if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
                showError(`Solo se permite acceso a usuarios de @${ALLOWED_DOMAIN}`);
                return;
            }

            // Crear formulario para enviar los tokens al backend
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/auth/session';

            // Access token
            const inputAccessToken = document.createElement('input');
            inputAccessToken.type = 'hidden';
            inputAccessToken.name = 'access_token';
            inputAccessToken.value = accessToken;
            form.appendChild(inputAccessToken);

            // Refresh token
            if (refreshToken) {
                const inputRefreshToken = document.createElement('input');
                inputRefreshToken.type = 'hidden';
                inputRefreshToken.name = 'refresh_token';
                inputRefreshToken.value = refreshToken;
                form.appendChild(inputRefreshToken);
            }

            // Email
            const inputEmail = document.createElement('input');
            inputEmail.type = 'hidden';
            inputEmail.name = 'email';
            inputEmail.value = email;
            form.appendChild(inputEmail);

            // Enviar formulario
            document.body.appendChild(form);
            form.submit();

        } catch (err) {
            showError('Error inesperado al procesar la autenticación: ' + err.message);
        }
    }

    // Ejecutar al cargar
    processCallback();
})();