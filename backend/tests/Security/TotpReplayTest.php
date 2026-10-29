<?php

namespace App\Tests\Security;

use App\Helpers\TotpVerifier;
use PHPUnit\Framework\TestCase;
use PragmaRX\Google2FA\Google2FA;

class TotpReplayTest extends TestCase
{
    private array $claimed = [];

    protected function setUp(): void
    {
        $this->claimed = [];
        TotpVerifier::$claimer = function (int $id, int $ts): bool {
            if (isset($this->claimed[$id]) && $this->claimed[$id] >= $ts) {
                return false;
            }
            $this->claimed[$id] = $ts;

            return true;
        };
    }

    protected function tearDown(): void
    {
        TotpVerifier::$claimer = null;
    }

    public function testValidCodeAcceptedOnceThenRejected(): void
    {
        $g = new Google2FA();
        $secret = $g->generateSecretKey();
        $code = $g->getCurrentOtp($secret);
        $user = ['id' => 7, 'two_fa_key' => $secret, 'two_fa_last_timestep' => null];
        $this->assertTrue(TotpVerifier::verify($user, $code));
        $this->assertFalse(TotpVerifier::verify($user, $code), 'same code replayed (race path) must fail');
        $user['two_fa_last_timestep'] = $this->claimed[7];
        $this->assertFalse(TotpVerifier::verify($user, $code), 'code from stored timestep must fail');
    }

    public function testWrongCodeAndEmptySecretRejected(): void
    {
        $g = new Google2FA();
        $secret = $g->generateSecretKey();
        $code = $g->getCurrentOtp($secret);
        $wrong = str_pad((string) (((int) $code + 1) % 1000000), 6, '0', STR_PAD_LEFT);
        $this->assertFalse(TotpVerifier::verify(['id' => 1, 'two_fa_key' => $secret], $wrong));
        $this->assertFalse(TotpVerifier::verify(['id' => 1, 'two_fa_key' => ''], $code));
    }

    public function testCallersUseReplaySafeVerifier(): void
    {
        $root = dirname(__DIR__, 2) . '/app/';
        foreach (['Controllers/User/Auth/TwoFactorController.php', 'Services/Vm/VdsReauth.php', 'Controllers/User/User/AccountDeletionController.php'] as $f) {
            $this->assertStringContainsString('TotpVerifier::verify(', file_get_contents($root . $f), $f);
        }
    }
}
