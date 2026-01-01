<?php

use App\App;
use App\Controllers\System\SelfTest;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerApiRoute(
        $routes,
        'system-selftest',
        '/api/selftest',
        function (Request $request) {
            return (new SelfTest())->getSelfTest($request);
        },
    );
};
