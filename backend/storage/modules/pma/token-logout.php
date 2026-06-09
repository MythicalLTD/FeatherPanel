<?php
declare(strict_types=1);

// Must be the same as in the token.php file
$session_name = 'TokenSession';
session_name($session_name);
@session_start();
session_unset();
session_destroy();

$pmaPageMode = 'logout';
$pmaErrorMessage = null;
$pmaRedirectUrl = null;
$pmaRedirectDelay = 500;
$pmaPostLoadScript = 'setTimeout(function() { window.close(); }, 1000);';

require __DIR__ . '/auth-page.php';
