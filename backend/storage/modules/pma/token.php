<?php
declare(strict_types=1);
ini_set('session.use_cookies', 'true');

/* Change this to false if using phpMyAdmin over http */
$secure_cookie = true;

session_set_cookie_params(0, '/', '', $secure_cookie, true);
$session_name = 'TokenSession';
session_name($session_name);
@session_start();

// Check if database credentials are provided as query parameters (for automatic login from panel)
if (isset($_GET['db']) && isset($_GET['host']) && isset($_GET['user']) && isset($_GET['pass'])) {
    // Set phpMyAdmin signon session variables with database connection details directly from query parameters
    $_SESSION['PMA_single_signon_user'] = $_GET['user'];
    $_SESSION['PMA_single_signon_password'] = $_GET['pass'];
    $_SESSION['PMA_single_signon_host'] = $_GET['host'];
    $_SESSION['PMA_single_signon_port'] = isset($_GET['port']) ? (string) $_GET['port'] : '3306';
    $_SESSION['PMA_single_signon_HMAC_secret'] = hash('sha1', uniqid(strval(random_int(0, mt_getrandmax())), true));

    // Set database name
    $_SESSION['PMA_single_signon_database'] = $_GET['db'];

    @session_write_close();

    // Show loading page then redirect
    $redirectUrl = 'index.php?server=1&db=' . urlencode($_GET['db']);
    header('Content-Type: text/html; charset=utf-8');
    ?>
<!DOCTYPE html>
<html lang="en" dir="ltr" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logging in... - phpMyAdmin</title>
<link rel="icon" href="../favicon.ico" type="image/x-icon">
    <script src="https://cdn.tailwindcss.com"></script>
<style>
        :root {
            --color-border: hsl(217.2 32.6% 17.5%);
            --color-input: hsl(217.2 32.6% 17.5%);
            --color-ring: hsl(212.7 26.8% 83.9%);
            --color-background: hsl(222.2 84% 4.9%);
            --color-foreground: hsl(210 40% 98%);
            --color-primary: hsl(210 40% 98%);
            --color-primary-foreground: hsl(222.2 47.4% 11.2%);
            --color-secondary: hsl(217.2 32.6% 17.5%);
            --color-secondary-foreground: hsl(210 40% 98%);
            --color-muted: hsl(217.2 32.6% 17.5%);
            --color-muted-foreground: hsl(215 20.2% 65.1%);
            --color-accent: hsl(217.2 32.6% 17.5%);
            --color-accent-foreground: hsl(210 40% 98%);
            --color-card: hsl(222.2 84% 4.9%);
            --color-card-foreground: hsl(210 40% 98%);
            --color-destructive: hsl(0 62.8% 30.6%);
            --color-destructive-foreground: hsl(210 40% 98%);
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        .animate-spin {
            animation: spin 1s linear infinite;
        }
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
        .animate-float {
            animation: float 3s ease-in-out infinite;
        }
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .gradient-bg {
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 25%, #2d1b3d 50%, #1a1f3a 75%, #0a0e27 100%);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
        }
        .glass-effect {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .shimmer {
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
}
</style>
</head>
<body class="gradient-bg text-white min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <div class="glass-effect rounded-3xl shadow-2xl p-10 md:p-12 space-y-10 relative overflow-hidden">
            <!-- Animated background gradient -->
            <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
            <div class="absolute inset-0 shimmer opacity-10"></div>
            
            <!-- Logo and App Name -->
            <div class="flex flex-col items-center space-y-5 relative z-10">
                <div id="app-logo-container" class="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center overflow-hidden border-2 border-white/10 shadow-2xl animate-float backdrop-blur-sm">
                    <img id="app-logo" src="" alt="Logo" class="w-full h-full object-contain p-3">
                </div>
                <div class="text-center space-y-1.5">
                    <h1 id="app-name" class="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">FeatherPanel</h1>
                    <p class="text-sm text-white/60 font-medium">Database Management</p>
                </div>
            </div>

            <!-- Loading Content -->
            <div class="space-y-8 text-center relative z-10">
                <div class="space-y-6">
                    <!-- Enhanced Animated Spinner -->
                    <div class="flex justify-center">
                        <div class="relative w-20 h-20">
                            <!-- Outer ring -->
                            <div class="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                            <!-- Spinning ring -->
                            <div class="absolute inset-0 border-4 border-transparent border-t-blue-400 border-r-purple-400 rounded-full animate-spin"></div>
                            <!-- Inner pulsing dot -->
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Loading Text -->
                    <div class="space-y-3">
                        <h2 class="text-2xl font-bold text-white drop-shadow-lg">Connecting to phpMyAdmin</h2>
                        <p class="text-sm text-white/70 font-medium">Authenticating your session securely...</p>
                    </div>
                    
                    <!-- Enhanced Progress Bar -->
                    <div class="pt-4">
                        <div class="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                            <div class="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full animate-pulse" style="width: 60%; animation: shimmer 2s infinite;"></div>
                        </div>
                    </div>
                    
                    <!-- Progress Dots -->
                    <div class="flex justify-center space-x-3 pt-2">
                        <div class="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50" style="animation-delay: 0s;"></div>
                        <div class="w-2.5 h-2.5 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50" style="animation-delay: 0.3s;"></div>
                        <div class="w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse shadow-lg shadow-pink-400/50" style="animation-delay: 0.6s;"></div>
                    </div>
                </div>
            </div>

            <!-- Powered by Footer -->
            <div class="pt-8 border-t border-white/10 relative z-10">
                <p class="text-xs text-center text-white/50 font-medium">
                    Powered by <a id="powered-by-link" href="https://featherpanel.com" target="_blank" rel="noopener noreferrer" class="font-bold text-white/80 hover:text-white transition-colors underline decoration-white/30 hover:decoration-white/60"><span id="powered-by-name">FeatherPanel</span></a>
                </p>
            </div>
        </div>
    </div>

    <script>
        // Read app info from localStorage
        (function() {
            const appName = localStorage.getItem('appName') || 'FeatherPanel';
            const appLogoDark = localStorage.getItem('appLogoDark');
            const appLogoWhite = localStorage.getItem('appLogoWhite');
            
            // Force dark mode
            document.documentElement.classList.add('dark');
            
            // Set app name
            document.getElementById('app-name').textContent = appName;
            document.getElementById('powered-by-name').textContent = appName;
            
            // Set app logo (prefer dark logo)
            const logoImg = document.getElementById('app-logo');
            if (appLogoDark) {
                logoImg.src = appLogoDark;
                logoImg.style.display = 'block';
            } else if (appLogoWhite) {
                logoImg.src = appLogoWhite;
                logoImg.style.display = 'block';
    } else {
                // Hide logo container if no logo available
                document.getElementById('app-logo-container').style.display = 'none';
            }
            
            // Handle logo load error
            logoImg.onerror = function() {
                this.style.display = 'none';
                document.getElementById('app-logo-container').style.display = 'none';
            };
            
            // Redirect after a brief moment
            setTimeout(() => {
                window.location.href = '<?php echo htmlspecialchars($redirectUrl, ENT_QUOTES, 'UTF-8'); ?>';
            }, 800);
        })();
    </script>
</body>
</html>
<?php
    exit;
}

// Show loading page with pretty UI
header('Content-Type: text/html; charset=utf-8');
$errorMessage = isset($_SESSION['PMA_single_signon_error_message']) ? htmlspecialchars($_SESSION['PMA_single_signon_error_message']) : null;
?>
<!DOCTYPE html>
<html lang="en" dir="ltr" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $errorMessage ? 'Error' : 'Logging in...'; ?> - phpMyAdmin</title>
    <link rel="icon" href="../favicon.ico" type="image/x-icon">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --color-border: hsl(217.2 32.6% 17.5%);
            --color-input: hsl(217.2 32.6% 17.5%);
            --color-ring: hsl(212.7 26.8% 83.9%);
            --color-background: hsl(222.2 84% 4.9%);
            --color-foreground: hsl(210 40% 98%);
            --color-primary: hsl(210 40% 98%);
            --color-primary-foreground: hsl(222.2 47.4% 11.2%);
            --color-secondary: hsl(217.2 32.6% 17.5%);
            --color-secondary-foreground: hsl(210 40% 98%);
            --color-muted: hsl(217.2 32.6% 17.5%);
            --color-muted-foreground: hsl(215 20.2% 65.1%);
            --color-accent: hsl(217.2 32.6% 17.5%);
            --color-accent-foreground: hsl(210 40% 98%);
            --color-card: hsl(222.2 84% 4.9%);
            --color-card-foreground: hsl(210 40% 98%);
            --color-destructive: hsl(0 62.8% 30.6%);
            --color-destructive-foreground: hsl(210 40% 98%);
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        .animate-spin {
            animation: spin 1s linear infinite;
        }
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-float {
            animation: float 3s ease-in-out infinite;
        }
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .gradient-bg {
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 25%, #2d1b3d 50%, #1a1f3a 75%, #0a0e27 100%);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
        }
        .glass-effect {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .shimmer {
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
        }
    </style>
</head>
<body class="gradient-bg text-white min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <div class="glass-effect rounded-3xl shadow-2xl p-10 md:p-12 space-y-10 relative overflow-hidden">
            <!-- Animated background gradient -->
            <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
            <div class="absolute inset-0 shimmer opacity-10"></div>
            
            <!-- Logo and App Name -->
            <div class="flex flex-col items-center space-y-5 relative z-10">
                <div id="app-logo-container" class="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center overflow-hidden border-2 border-white/10 shadow-2xl animate-float backdrop-blur-sm">
                    <img id="app-logo" src="" alt="Logo" class="w-full h-full object-contain p-3">
                </div>
                <div class="text-center space-y-1.5">
                    <h1 id="app-name" class="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">FeatherPanel</h1>
                    <p class="text-sm text-white/60 font-medium">Database Management</p>
                </div>
            </div>

            <!-- Loading/Error Content -->
            <div class="space-y-8 text-center relative z-10">
                <?php if ($errorMessage) { ?>
                    <!-- Error State -->
                    <div class="space-y-6">
                        <div class="flex justify-center">
                            <div class="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border-2 border-red-400/30 backdrop-blur-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                        </div>
                        <div class="space-y-3">
                            <h2 class="text-2xl font-bold text-red-400 drop-shadow-lg">Authentication Error</h2>
                            <p class="text-sm text-white/70 font-medium px-4"><?php echo $errorMessage; ?></p>
                        </div>
                    </div>
                <?php } else { ?>
                    <!-- Loading State -->
                    <div class="space-y-6">
                        <!-- Enhanced Animated Spinner -->
                        <div class="flex justify-center">
                            <div class="relative w-20 h-20">
                                <!-- Outer ring -->
                                <div class="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                                <!-- Spinning ring -->
                                <div class="absolute inset-0 border-4 border-transparent border-t-blue-400 border-r-purple-400 rounded-full animate-spin"></div>
                                <!-- Inner pulsing dot -->
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <div class="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Loading Text -->
                        <div class="space-y-3">
                            <h2 class="text-2xl font-bold text-white drop-shadow-lg">Connecting to phpMyAdmin</h2>
                            <p class="text-sm text-white/70 font-medium">Authenticating your session securely...</p>
                        </div>
                        
                        <!-- Enhanced Progress Bar -->
                        <div class="pt-4">
                            <div class="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                <div class="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full animate-pulse" style="width: 60%; animation: shimmer 2s infinite;"></div>
                            </div>
                        </div>
                        
                        <!-- Progress Dots -->
                        <div class="flex justify-center space-x-3 pt-2">
                            <div class="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50" style="animation-delay: 0s;"></div>
                            <div class="w-2.5 h-2.5 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50" style="animation-delay: 0.3s;"></div>
                            <div class="w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse shadow-lg shadow-pink-400/50" style="animation-delay: 0.6s;"></div>
                        </div>
                    </div>
                <?php } ?>
            </div>

            <!-- Powered by Footer -->
            <div class="pt-8 border-t border-white/10 relative z-10">
                <p class="text-xs text-center text-white/50 font-medium">
                    Powered by <a id="powered-by-link" href="https://featherpanel.com" target="_blank" rel="noopener noreferrer" class="font-bold text-white/80 hover:text-white transition-colors underline decoration-white/30 hover:decoration-white/60"><span id="powered-by-name">FeatherPanel</span></a>
                </p>
            </div>
        </div>
    </div>

    <script>
        // Read app info from localStorage
        (function() {
            const appName = localStorage.getItem('appName') || 'FeatherPanel';
            const appLogoDark = localStorage.getItem('appLogoDark');
            const appLogoWhite = localStorage.getItem('appLogoWhite');
            
            // Force dark mode
            document.documentElement.classList.add('dark');
            
            // Set app name
            document.getElementById('app-name').textContent = appName;
            document.getElementById('powered-by-name').textContent = appName;
            
            // Set app logo (prefer dark logo)
            const logoImg = document.getElementById('app-logo');
            if (appLogoDark) {
                logoImg.src = appLogoDark;
                logoImg.style.display = 'block';
            } else if (appLogoWhite) {
                logoImg.src = appLogoWhite;
                logoImg.style.display = 'block';
            } else {
                // Hide logo container if no logo available
                document.getElementById('app-logo-container').style.display = 'none';
            }
            
            // Handle logo load error
            logoImg.onerror = function() {
                this.style.display = 'none';
                document.getElementById('app-logo-container').style.display = 'none';
            };
        })();
    </script>
</body>
</html>
<?php

?>
