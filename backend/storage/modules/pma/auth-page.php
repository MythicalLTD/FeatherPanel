<?php
/**
 * Shared phpMyAdmin auth transition page.
 *
 * Expected variables:
 * - $pmaPageMode (string): connect | error | logout
 * - $pmaErrorMessage (?string)
 * - $pmaRedirectUrl (?string)
 * - $pmaRedirectDelay (int, default 500)
 * - $pmaPostLoadScript (?string) extra JS after branding setup
 */
$pmaPageMode = $pmaPageMode ?? 'connect';
$pmaRedirectDelay = $pmaRedirectDelay ?? 500;
$pmaErrorMessage = $pmaErrorMessage ?? null;
$pmaRedirectUrl = $pmaRedirectUrl ?? null;
$pmaPostLoadScript = $pmaPostLoadScript ?? '';
?>
<!DOCTYPE html>
<html lang="en" dir="ltr" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="pageTitleLogin">Logging in - phpMyAdmin</title>
    <link rel="icon" href="../favicon.ico" type="image/x-icon">
    <style>
        :root {
            --background: 0 0% 100%;
            --foreground: 0 0% 9%;
            --card: 0 0% 100%;
            --card-foreground: 0 0% 9%;
            --muted-foreground: 0 0% 45%;
            --border: 0 0% 90%;
            --primary: 262 83% 58%;
            --destructive: 0 84% 60%;
            --app-font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .dark {
            --background: 220 15% 6%;
            --foreground: 210 20% 98%;
            --card: 220 15% 9%;
            --card-foreground: 210 20% 98%;
            --muted-foreground: 0 0% 64%;
            --border: 220 15% 14%;
            --destructive: 0 84% 60%;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: hsl(var(--background));
            color: hsl(var(--foreground));
            font-family: var(--app-font-family);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .shell {
            width: 100%;
            max-width: 28rem;
        }

        .brand-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .logo-wrap {
            width: 3.5rem;
            height: 3.5rem;
            border-radius: 1rem;
            border: 1px solid hsl(var(--border) / 0.8);
            background: hsl(var(--card) / 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .logo-wrap img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 0.375rem;
        }

        .app-name {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            text-align: center;
            color: hsl(var(--foreground));
            text-decoration: none;
        }

        .app-name:hover {
            opacity: 0.9;
        }

        .brand-subtitle {
            font-size: 0.8125rem;
            color: hsl(var(--muted-foreground));
            text-align: center;
            margin-top: 0.25rem;
        }

        .card {
            background: hsl(var(--card) / 0.92);
            color: hsl(var(--card-foreground));
            border: 1px solid hsl(var(--border));
            border-radius: 1.5rem;
            padding: 2rem 1.75rem;
            box-shadow: 0 24px 48px hsl(var(--background) / 0.35);
        }

        .content {
            text-align: center;
        }

        .spinner {
            width: 2.75rem;
            height: 2.75rem;
            margin: 0 auto 1.25rem;
            border: 2px solid hsl(var(--border));
            border-top-color: hsl(var(--primary));
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .heading {
            font-size: 1.0625rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            letter-spacing: -0.01em;
        }

        .message {
            font-size: 0.875rem;
            color: hsl(var(--muted-foreground));
            line-height: 1.55;
        }

        .error-icon {
            width: 2.75rem;
            height: 2.75rem;
            margin: 0 auto 1.25rem;
            color: hsl(var(--destructive));
        }

        .error-heading {
            color: hsl(var(--destructive));
        }

        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid hsl(var(--border));
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
            text-align: center;
        }

        .footer a {
            color: hsl(var(--foreground));
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        .footer a:hover {
            opacity: 0.85;
        }

        .hidden {
            display: none !important;
        }
    </style>
</head>
<body data-page-mode="<?php echo htmlspecialchars($pmaPageMode, ENT_QUOTES, 'UTF-8'); ?>">
    <div class="shell">
        <div class="brand-block">
            <div id="app-logo-container" class="logo-wrap">
                <img id="app-logo" src="" alt="">
            </div>
            <div>
                <a id="app-home-link" class="app-name" href="/">
                    <span id="app-name">FeatherPanel</span>
                </a>
                <p id="brand-subtitle" class="brand-subtitle" data-i18n="databaseManagement">Database Management</p>
            </div>
        </div>

        <div class="card">
            <div class="content">
                <?php if ($pmaErrorMessage) { ?>
                    <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2 id="status-heading" class="heading error-heading" data-i18n="authError">Authentication error</h2>
                    <p class="message"><?php echo $pmaErrorMessage; ?></p>
                <?php } else { ?>
                    <div class="spinner" role="status" aria-labelledby="status-heading"></div>
                    <h2 id="status-heading" class="heading" data-i18n="connecting">Connecting to phpMyAdmin</h2>
                    <p id="status-message" class="message" data-i18n="authenticating">Authenticating your session securely...</p>
                <?php } ?>
            </div>

            <div id="powered-by-footer" class="footer">
                <span id="powered-by-prefix"></span><a id="powered-by-link" href="https://featherpanel.com" target="_blank" rel="noopener noreferrer"><span id="powered-by-name">FeatherPanel</span></a>
            </div>
        </div>
    </div>

    <script>
        (function() {
            var pageMode = document.body.getAttribute('data-page-mode') || 'connect';

            var defaults = {
                pageTitleLogin: 'Logging in - phpMyAdmin',
                pageTitleError: 'Authentication error - phpMyAdmin',
                pageTitleLogout: 'Logging out - phpMyAdmin',
                databaseManagement: 'Database Management',
                connecting: 'Connecting to phpMyAdmin',
                authenticating: 'Authenticating your session securely...',
                loggingOut: 'Logging out',
                loggingOutMessage: 'Please wait while we securely log you out...',
                authError: 'Authentication error',
                poweredBy: 'Powered by {name}',
                loading: 'Loading'
            };

            var accentMap = {
                purple: '262 83% 58%',
                blue: '217 91% 60%',
                green: '142 71% 45%',
                red: '0 84% 60%',
                orange: '25 95% 53%',
                pink: '330 81% 60%',
                teal: '173 80% 40%',
                yellow: '45 93% 47%',
                indigo: '239 84% 67%',
                violet: '262 83% 58%',
                cyan: '189 94% 43%',
                lime: '84 81% 44%',
                amber: '38 92% 50%',
                rose: '347 77% 50%',
                slate: '215 16% 47%'
            };

            var fontStacks = {
                inter: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                roboto: "'Roboto', system-ui, sans-serif",
                poppins: "'Poppins', system-ui, sans-serif",
                'open-sans': "'Open Sans', system-ui, sans-serif",
                lato: "'Lato', system-ui, sans-serif",
                montserrat: "'Montserrat', system-ui, sans-serif",
                nunito: "'Nunito', system-ui, sans-serif",
                raleway: "'Raleway', system-ui, sans-serif",
                ubuntu: "'Ubuntu', system-ui, sans-serif",
                'jetbrains-mono': "'JetBrains Mono', ui-monospace, monospace"
            };

            function getQueryLocale() {
                try {
                    return new URLSearchParams(window.location.search).get('lang');
                } catch (e) {
                    return null;
                }
            }

            function readContext() {
                try {
                    var raw = localStorage.getItem('fp_pma_auth');
                    if (!raw) return null;
                    var parsed = JSON.parse(raw);
                    if (!parsed || parsed.version !== 1) return null;
                    return parsed;
                } catch (e) {
                    return null;
                }
            }

            function readSettings() {
                try {
                    var raw = localStorage.getItem('app_settings');
                    if (!raw) return null;
                    var parsed = JSON.parse(raw);
                    return parsed && parsed.data && parsed.data.settings ? parsed.data.settings : null;
                } catch (e) {
                    return null;
                }
            }

            function readTranslations(locale) {
                var versions = ['1.3'];
                for (var i = 0; i < versions.length; i++) {
                    try {
                        var raw = localStorage.getItem('translations_' + locale + '_' + versions[i]);
                        if (raw) return JSON.parse(raw);
                    } catch (e) {}
                }
                return null;
            }

            function translateFromCache(translations, key) {
                if (!translations) return null;
                var parts = key.split('.');
                var cur = translations;
                for (var i = 0; i < parts.length; i++) {
                    cur = cur && cur[parts[i]];
                }
                return typeof cur === 'string' ? cur : null;
            }

            function applyParams(text, params) {
                if (!params) return text;
                return Object.keys(params).reduce(function(result, key) {
                    return result.split('{' + key + '}').join(params[key]);
                }, text);
            }

            function resolveStrings(context, translations, locale, appName) {
                var strings = Object.assign({}, defaults);
                var pma = translations && translations.serverDatabases && translations.serverDatabases.pmaAuth;
                if (pma && typeof pma === 'object') {
                    Object.keys(defaults).forEach(function(key) {
                        if (typeof pma[key] === 'string') strings[key] = pma[key];
                    });
                }
                if (context && context.strings) {
                    Object.keys(context.strings).forEach(function(key) {
                        if (typeof context.strings[key] === 'string') strings[key] = context.strings[key];
                    });
                }
                strings.poweredBy = applyParams(strings.poweredBy, { name: appName });
                return strings;
            }

            var context = readContext();
            var settings = readSettings();
            var locale = (context && context.locale) || getQueryLocale() || localStorage.getItem('locale') || 'en';
            var translations = readTranslations(locale);
            var theme = (context && context.theme) || localStorage.getItem('theme') || 'dark';
            var accentColor = (context && context.accentColor) || localStorage.getItem('accentColor') || 'purple';
            var fontFamily = (context && context.fontFamily) || localStorage.getItem('fontFamily') || 'inter';

            var branding = {
                appName: (context && context.branding && context.branding.appName)
                    || (settings && settings.app_name)
                    || 'FeatherPanel',
                logoDark: (context && context.branding && context.branding.logoDark)
                    || (settings && settings.app_logo_dark)
                    || '',
                logoWhite: (context && context.branding && context.branding.logoWhite)
                    || (settings && settings.app_logo_white)
                    || '',
                appUrl: (context && context.branding && context.branding.appUrl)
                    || (settings && (settings.website_url || settings.app_url))
                    || '/',
                showPoweredBy: context && context.branding
                    ? !!context.branding.showPoweredBy
                    : String((settings && settings.branding_show_powered_by) || 'true') === 'true'
            };

            var strings = resolveStrings(context, translations, locale, branding.appName);

            document.documentElement.lang = locale;
            document.documentElement.classList.toggle('dark', theme !== 'light');
            document.documentElement.classList.toggle('light', theme === 'light');
            document.documentElement.style.setProperty('--primary', accentMap[accentColor] || accentMap.purple);
            document.documentElement.style.setProperty('--app-font-family', fontStacks[fontFamily] || fontStacks.inter);

            var titleKey = pageMode === 'logout'
                ? 'pageTitleLogout'
                : (pageMode === 'error' ? 'pageTitleError' : 'pageTitleLogin');
            document.title = strings[titleKey];

            document.getElementById('app-name').textContent = branding.appName;
            document.getElementById('powered-by-name').textContent = branding.appName;

            var homeLink = document.getElementById('app-home-link');
            homeLink.href = branding.appUrl || '/';

            var poweredByFooter = document.getElementById('powered-by-footer');
            if (!branding.showPoweredBy) {
                poweredByFooter.classList.add('hidden');
            } else {
                var poweredText = strings.poweredBy;
                var nameIndex = poweredText.indexOf(branding.appName);
                var poweredPrefix = nameIndex >= 0
                    ? poweredText.slice(0, nameIndex)
                    : poweredText.split('{name}')[0] || 'Powered by ';
                document.getElementById('powered-by-prefix').textContent = poweredPrefix;
                document.getElementById('powered-by-link').href = branding.appUrl || '/';
            }

            if (pageMode === 'logout') {
                var heading = document.getElementById('status-heading');
                var message = document.getElementById('status-message');
                if (heading) heading.textContent = strings.loggingOut;
                if (message) message.textContent = strings.loggingOutMessage;
            } else if (pageMode === 'connect') {
                var connectHeading = document.getElementById('status-heading');
                var connectMessage = document.getElementById('status-message');
                if (connectHeading) connectHeading.textContent = strings.connecting;
                if (connectMessage) connectMessage.textContent = strings.authenticating;
            }

            document.querySelectorAll('[data-i18n]').forEach(function(node) {
                var key = node.getAttribute('data-i18n');
                if (!key || !strings[key]) return;
                if (key === 'poweredBy') return;
                node.textContent = strings[key];
            });

            var spinner = document.querySelector('.spinner');
            if (spinner) spinner.setAttribute('aria-label', strings.loading);

            var logoContainer = document.getElementById('app-logo-container');
            var logoImg = document.getElementById('app-logo');
            var logoSrc = theme === 'light'
                ? (branding.logoWhite || branding.logoDark)
                : (branding.logoWhite || branding.logoDark);

            if (logoSrc) {
                logoImg.src = logoSrc;
                logoImg.alt = branding.appName;
                logoContainer.style.display = 'flex';
                logoImg.onerror = function() {
                    logoContainer.style.display = 'none';
                };
            }

            <?php if ($pmaRedirectUrl) { ?>
            setTimeout(function() {
                window.location.href = <?php echo json_encode($pmaRedirectUrl, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
            }, <?php echo (int) $pmaRedirectDelay; ?>);
            <?php } ?>

            <?php echo $pmaPostLoadScript; ?>
        })();
    </script>
</body>
</html>
