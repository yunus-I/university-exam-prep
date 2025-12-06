console.log("Script loaded!");

// Show loading screen for 2 seconds, then show auth
setTimeout(() => {
    document.getElementById('app-loading-overlay').style.display = 'none';
    document.getElementById('welcome-page').style.display = 'block';
    
    // Simple test content
    document.getElementById('welcome-page').innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <h1>✅ App Loaded!</h1>
            <p>Telegram WebApp is working.</p>
            <p>SSH key is set up.</p>
            <p>Next step: Connect Firebase.</p>
        </div>
    `;
}, 2000);