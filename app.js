import CupcakesApp from './src/app/CupcakesApp.js';

/**
 * Entry point for Team Cupcake web app.
 * Keeps initialization separate from the main class for better structure.
 */
const bootstrap = () => {
    window.cupcakesApp = new CupcakesApp();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
            } else {
    bootstrap();
}

