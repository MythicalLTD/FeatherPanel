<?php
// Loading page template for phpMyAdmin authentication
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logging in... - phpMyAdmin</title>
    <link rel="icon" href="../favicon.ico" type="image/x-icon">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        border: "hsl(var(--border))",
                        input: "hsl(var(--input))",
                        ring: "hsl(var(--ring))",
                        background: "hsl(var(--background))",
                        foreground: "hsl(var(--foreground))",
                        primary: {
                            DEFAULT: "hsl(var(--primary))",
                            foreground: "hsl(var(--primary-foreground))",
                        },
                        secondary: {
                            DEFAULT: "hsl(var(--secondary))",
                            foreground: "hsl(var(--secondary-foreground))",
                        },
                        muted: {
                            DEFAULT: "hsl(var(--muted))",
                            foreground: "hsl(var(--muted-foreground))",
                        },
                        accent: {
                            DEFAULT: "hsl(var(--accent))",
                            foreground: "hsl(var(--accent-foreground))",
                        },
                    },
                },
            },
        }
    </script>
    <style>
        :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --primary: 222.2 47.4% 11.2%;
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 222.2 47.4% 11.2%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 210 40% 96.1%;
            --accent-foreground: 222.2 47.4% 11.2%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 222.2 84% 4.9%;
        }
        .dark {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --primary: 210 40% 98%;
            --primary-foreground: 222.2 47.4% 11.2%;
            --secondary: 217.2 32.6% 17.5%;
            --secondary-foreground: 210 40% 98%;
            --muted: 217.2 32.6% 17.5%;
            --muted-foreground: 215 20.2% 65.1%;
            --accent: 217.2 32.6% 17.5%;
            --accent-foreground: 210 40% 98%;
            --border: 217.2 32.6% 17.5%;
            --input: 217.2 32.6% 17.5%;
            --ring: 212.7 26.8% 83.9%;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .animate-spin {
            animation: spin 1s linear infinite;
        }
    </style>
</head>
<body class="bg-background text-foreground dark">
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="w-full max-w-md">
            <div class="bg-card border border-border rounded-lg shadow-lg p-8 space-y-6">
                <!-- Logo and App Name -->
                <div class="flex flex-col items-center space-y-4">
                    <div id="app-logo-container" class="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                        <img id="app-logo" src="" alt="Logo" class="w-full h-full object-contain hidden" onerror="this.style.display='none'; document.getElementById('app-logo-fallback').style.display='flex';">
                        <div id="app-logo-fallback" class="w-full h-full flex items-center justify-center text-primary text-2xl font-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                            </svg>
                        </div>
                    </div>
                    <h1 id="app-name" class="text-2xl font-bold text-center">FeatherPanel</h1>
                </div>

                <!-- Loading Content -->
                <div class="space-y-4 text-center">
                    <div class="space-y-3">
                        <div class="w-12 h-12 mx-auto">
                            <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div>
                            <h2 class="text-lg font-semibold">Logging in to phpMyAdmin</h2>
                            <p class="text-sm text-muted-foreground mt-2">Please wait while we authenticate you...</p>
                        </div>
                    </div>
                </div>

                <!-- Powered by Footer -->
                <div class="pt-4 border-t border-border">
                    <p class="text-xs text-center text-muted-foreground">
                        Powered by <span id="powered-by-name" class="font-semibold text-foreground">FeatherPanel</span>
                    </p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Read app info from localStorage
        (function() {
            const appName = localStorage.getItem('appName') || 'FeatherPanel';
            const appLogoDark = localStorage.getItem('appLogoDark');
            const appLogoWhite = localStorage.getItem('appLogoWhite');
            
            // Detect dark mode preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const isDark = document.documentElement.classList.contains('dark') || prefersDark;
            
            // Set app name
            document.getElementById('app-name').textContent = appName;
            document.getElementById('powered-by-name').textContent = appName;
            
            // Set app logo
            const logoImg = document.getElementById('app-logo');
            
            if (isDark && appLogoWhite) {
                logoImg.src = appLogoWhite;
                logoImg.classList.remove('hidden');
            } else if (!isDark && appLogoDark) {
                logoImg.src = appLogoDark;
                logoImg.classList.remove('hidden');
            } else if (appLogoDark) {
                logoImg.src = appLogoDark;
                logoImg.classList.remove('hidden');
            }
            
            // Redirect after a brief moment
            setTimeout(() => {
                window.location.href = '<?php echo htmlspecialchars($redirectUrl, ENT_QUOTES, 'UTF-8'); ?>';
            }, 500);
        })();
    </script>
</body>
</html>

