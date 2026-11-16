<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

use App\Helpers\StepUpAuth;
use App\Helpers\SecurityStore;
use PHPUnit\Framework\TestCase;
use App\Middleware\WingsMiddleware;
use App\Middleware\ApiRateLimitMiddleware;
use Symfony\Component\HttpFoundation\Request;

class StepUpAuthTest extends TestCase
{
    protected function setUp(): void
    {
        // File-backed store only: no Redis needed for these tests.
        SecurityStore::$redisOverride = false;
    }

    protected function tearDown(): void
    {
        SecurityStore::$redisOverride = null;
    }

    public function testApiKeyRequestsAreNotAskedToReauthenticate(): void
    {
        $request = Request::create('/api/user/api-clients', 'POST');
        $request->attributes->set('auth_type', 'api_key');
        $request->attributes->set('user', $this->user());

        $this->assertNull(StepUpAuth::require($request, StepUpAuth::ACTION_API_KEY));
    }

    public function testSessionWithoutConfirmationGetsReauthRequired(): void
    {
        $request = $this->sessionRequest('token-a');
        $response = StepUpAuth::require($request, StepUpAuth::ACTION_CUSTOM_JS);

        $this->assertNotNull($response);
        $this->assertSame(403, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);
        $this->assertSame('REAUTH_REQUIRED', $body['error_code']);
        $this->assertSame('custom_js', $body['data']['action']);
        $this->assertSame(['totp'], $body['data']['methods']);
    }

    public function testConfirmationIsBoundToTheSessionAndCanBeRevoked(): void
    {
        $a = $this->sessionRequest('token-' . bin2hex(random_bytes(6)));
        $b = $this->sessionRequest('token-' . bin2hex(random_bytes(6)));

        $this->assertSame(StepUpAuth::TTL_SECONDS, StepUpAuth::grant($a));
        $this->assertNull(StepUpAuth::require($a, StepUpAuth::ACTION_IMPERSONATE));
        $this->assertGreaterThan(StepUpAuth::TTL_SECONDS - 5, StepUpAuth::secondsLeft($a));
        $this->assertNotNull(StepUpAuth::require($b, StepUpAuth::ACTION_IMPERSONATE), 'another session of the same user stays unconfirmed');

        StepUpAuth::revoke($a);
        $this->assertNotNull(StepUpAuth::require($a, StepUpAuth::ACTION_IMPERSONATE));
    }

    public function testImpersonatingAdminIsTheOneWhoConfirms(): void
    {
        $request = $this->sessionRequest('token-' . bin2hex(random_bytes(6)));
        $admin = $this->user();
        $request->attributes->set('user', ['uuid' => 'target-user', 'two_fa_enabled' => 'false']);
        $request->attributes->set('impersonator', $admin);

        $this->assertSame($admin, StepUpAuth::actor($request));
    }

    public function testTwoFactorAccountsMustUseTheirAuthenticator(): void
    {
        $this->assertSame([StepUpAuth::METHOD_TOTP], StepUpAuth::methodsFor($this->user()));
    }

    public function testPasswordCheck(): void
    {
        $user = ['password' => password_hash('secret-pass', PASSWORD_BCRYPT)];
        $this->assertTrue(StepUpAuth::checkPassword($user, 'secret-pass'));
        $this->assertFalse(StepUpAuth::checkPassword($user, 'wrong'));
        $this->assertFalse(StepUpAuth::checkPassword(['password' => ''], ''));
    }

    public function testFailuresLockAfterTheLimit(): void
    {
        $user = ['uuid' => 'lock-' . bin2hex(random_bytes(6))];
        for ($i = 1; $i < StepUpAuth::MAX_FAILURES; ++$i) {
            $this->assertFalse(StepUpAuth::recordFailure($user));
        }
        $this->assertTrue(StepUpAuth::recordFailure($user));
        $this->assertTrue(StepUpAuth::isLockedOut($user));
        $this->assertGreaterThan(0, StepUpAuth::lockoutSecondsLeft($user));

        StepUpAuth::clearFailures($user);
        $this->assertFalse(StepUpAuth::isLockedOut($user));
    }

    public function testLockoutRunsItsFullLengthFromTheLastFailure(): void
    {
        $user = ['uuid' => 'lock-' . bin2hex(random_bytes(6))];
        for ($i = 0; $i < StepUpAuth::MAX_FAILURES; ++$i) {
            StepUpAuth::recordFailure($user);
        }
        $this->assertTrue(StepUpAuth::isLockedOut($user));
        $this->assertGreaterThan(StepUpAuth::LOCKOUT_SECONDS - 5, StepUpAuth::lockoutSecondsLeft($user));
        StepUpAuth::clearFailures($user);
    }

    public function testMailWithAOneTimeCodeIsHiddenInThePanel(): void
    {
        $hidden = App\Chat\MailQueue::redactOneTimeCode(['body' => App\Chat\MailQueue::ONE_TIME_CODE_MARKER . '<p>Your code is 123456</p>']);
        $this->assertStringNotContainsString('123456', $hidden['body']);
        $plain = App\Chat\MailQueue::redactOneTimeCode(['body' => '<p>Welcome</p>']);
        $this->assertSame('<p>Welcome</p>', $plain['body']);
    }

    public function testRequiredResponseSaysWhenSigningInAgainHelps(): void
    {
        $request = $this->sessionRequest('token-' . bin2hex(random_bytes(6)));
        $request->attributes->set('user', ['uuid' => 'pw-only-' . bin2hex(random_bytes(4)), 'two_fa_enabled' => 'false', 'email' => '']);
        $body = json_decode((string) StepUpAuth::require($request, StepUpAuth::ACTION_ACCOUNT_SECURITY)->getContent(), true);
        $this->assertSame(['password'], $body['data']['methods']);
        $this->assertTrue($body['data']['sign_in_again']);

        $twoFactor = json_decode((string) StepUpAuth::require($this->sessionRequest('token-x'), StepUpAuth::ACTION_API_KEY)->getContent(), true);
        $this->assertFalse($twoFactor['data']['sign_in_again']);
    }

    public function testAdminPermissionDetection(): void
    {
        $this->assertTrue(StepUpAuth::isAdminPermission('admin.root'));
        $this->assertTrue(StepUpAuth::isAdminPermission(' Admin.users.edit '));
        $this->assertFalse(StepUpAuth::isAdminPermission('user.api-keys.create'));
        $this->assertFalse(StepUpAuth::roleGrantsAdmin(0));
    }

    public function testFileStoreCountsAWindow(): void
    {
        $key = 'test:' . bin2hex(random_bytes(6));
        $this->assertSame(1, SecurityStore::hit($key, 60)['count']);
        $second = SecurityStore::hit($key, 60);
        $this->assertSame(2, $second['count']);
        $this->assertGreaterThan(0, $second['ttl']);
        $this->assertLessThanOrEqual(60, $second['ttl']);
        SecurityStore::delete($key);
        $this->assertSame(0, SecurityStore::count($key));
    }

    public function testPanelWideLimitSkipsDaemonCallbacksAndWebhooks(): void
    {
        $this->assertTrue(ApiRateLimitMiddleware::isExempt(Request::create('/api/remote/servers'), []));
        $this->assertTrue(ApiRateLimitMiddleware::isExempt(Request::create('/api/wings/backups/x'), []));
        $this->assertTrue(ApiRateLimitMiddleware::isExempt(Request::create('/api/quilld-remote/sync'), []));
        $this->assertTrue(ApiRateLimitMiddleware::isExempt(Request::create('/api/webhooks/webspaces/x/git-deploy', 'POST'), []));
        App\Runtime\RequestContext::setRoute('/api/addons/billing/webhook');
        $this->assertTrue(ApiRateLimitMiddleware::isExempt(Request::create('/api/addons/billing/webhook', 'POST'), []));
        // A caller-chosen path segment must not opt a normal route out of the budget.
        App\Runtime\RequestContext::setRoute('/api/user/webspaces/{uuidShort}/files/{path}');
        $this->assertFalse(ApiRateLimitMiddleware::isExempt(Request::create('/api/user/webspaces/abc/files/webhook', 'GET'), []));
        App\Runtime\RequestContext::setRoute(null);
        $this->assertTrue(ApiRateLimitMiddleware::isExempt(Request::create('/api/health/ready'), []));
        $this->assertTrue(ApiRateLimitMiddleware::isExempt(Request::create('/api/user/session', 'OPTIONS'), []));
        $this->assertTrue(ApiRateLimitMiddleware::isExempt(Request::create('/api/custom/daemon'), [new WingsMiddleware()]));
        $this->assertFalse(ApiRateLimitMiddleware::isExempt(Request::create('/api/user/session'), []));
        $this->assertFalse(ApiRateLimitMiddleware::isExempt(Request::create('/api/admin/users', 'POST'), []));
    }

    public function testPanelWideLimitRunsAfterAuthentication(): void
    {
        $auth = new App\Middleware\AuthMiddleware();
        $stack = ApiRateLimitMiddleware::apply([$auth], Request::create('/api/user/session'));
        $this->assertSame($auth, $stack[0]);
        $this->assertInstanceOf(ApiRateLimitMiddleware::class, $stack[1]);

        $guest = ApiRateLimitMiddleware::apply([], Request::create('/api'));
        $this->assertInstanceOf(ApiRateLimitMiddleware::class, $guest[0]);
    }

    private function sessionRequest(string $token): Request
    {
        $request = Request::create('/api/admin/settings', 'PATCH', [], ['remember_token' => $token]);
        $request->attributes->set('auth_type', 'session');
        $request->attributes->set('user', $this->user());

        return $request;
    }

    private function user(): array
    {
        return [
            'uuid' => 'admin-' . substr(hash('sha256', (string) getmypid()), 0, 8),
            'two_fa_enabled' => 'true',
            'two_fa_key' => 'JBSWY3DPEHPK3PXP',
            'email' => 'admin@example.com',
        ];
    }
}
