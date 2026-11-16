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

namespace App\Tests\Vm;

use App\Chat\VmSubuser;
use PHPUnit\Framework\TestCase;

/**
 * Removing a VM subuser only touches subusers of that VM.
 */
class VmSubuserRemovalScopeTest extends TestCase
{
    public function testControllerChecksTheSubuserBelongsToTheVm(): void
    {
        $src = $this->read('app/Controllers/User/Vds/VmUserSubuserController.php');
        $this->assertMatchesRegularExpression('/function deleteSubuser\(.*?VmSubuser::getById\(\$subuserId\).*?vm_instance_id.*?NOT_FOUND.*?VmSubuser::deleteForVmInstance\(\$subuserId, \$vmInstanceId\)/s', $src);
        $this->assertStringNotContainsString('VmSubuser::delete($subuserId)', $src);
    }

    public function testDeleteQueryIsScopedToTheVm(): void
    {
        $src = $this->read('app/Chat/VmSubuser.php');
        $this->assertMatchesRegularExpression('/function deleteForVmInstance\(.*?WHERE id = :id AND vm_instance_id = :vm_instance_id/s', $src);
    }

    public function testInvalidIdsAreRejectedWithoutQuerying(): void
    {
        $this->assertFalse(VmSubuser::deleteForVmInstance(0, 5));
        $this->assertFalse(VmSubuser::deleteForVmInstance(5, 0));
    }

    private function read(string $relative): string
    {
        $src = file_get_contents(dirname(__DIR__, 2) . '/' . $relative);
        $this->assertNotFalse($src);

        return $src;
    }
}
