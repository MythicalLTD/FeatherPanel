/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import { Info, ShieldAlert } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function TutorialLXC() {
    return (
        <PageCard title='How to create Proxmox LXC templates' icon={Info} className='mt-6'>
            <div className='text-sm text-muted-foreground space-y-4'>
                <Alert variant='destructive'>
                    <ShieldAlert className='h-4 w-4' />
                    <AlertTitle>Security Warning</AlertTitle>
                    <AlertDescription>
                        LXC containers are not recommended if you plan to provide public hosting services. They lack KVM 
                        virtualization, which often causes issues with Docker and advanced networking. Additionally, 
                        exploits that escape containers to reach the host are more common with LXC. We strongly advise using 
                        <strong>QEMU/KVM Virtual Machines</strong> for hosting.
                    </AlertDescription>
                </Alert>

                <p className='font-medium'>1. Download a Container Template</p>
                <p>
                    In the Proxmox web interface, navigate to your storage (e.g., <code>local</code>), click on
                    <code>CT Templates</code>, and then click <code>Templates</code>. Choose your preferred
                    distribution (e.g., Debian 12, Ubuntu 24.04) and click <code>Download</code>.
                </p>

                <p className='font-medium'>2. Create the Container</p>
                <p>Click &quot;Create CT&quot; in the top right corner and follow the wizard:</p>
                <ul className='list-disc list-inside text-xs space-y-1'>
                    <li>
                        <span className='font-semibold'>General:</span> Set a VMID (e.g., <code>8000</code>) and a
                        hostname. Set a root password.
                    </li>
                    <li>
                        <span className='font-semibold'>Template:</span> Select the template you just downloaded.
                    </li>
                    <li>
                        <span className='font-semibold'>Disks:</span> Choose your storage and a suitable disk size.
                    </li>
                    <li>
                        <span className='font-semibold'>CPU / Memory:</span> Keep defaults or adjust as needed.
                    </li>
                    <li>
                        <span className='font-semibold'>Network:</span> Set <code>Bridge = vmbr0</code> and leave
                        IP settings as <code>Static</code> (FeatherPanel will override these settings during cloning).
                    </li>
                    <li>
                        <span className='font-semibold'>Confirm:</span> Review settings and click <code>Finish</code>.
                    </li>
                </ul>

                <p className='font-medium'>3. Prepare for FeatherPanel</p>
                <p className='text-xs'>
                    Once the container is created, you should ensure it has the necessary tools for FeatherPanel to
                    manage it. Start the container, log in, and run:
                </p>
                <pre className='bg-muted/60 rounded-md p-3 overflow-x-auto text-xs'>
                    <code>{`apt update && apt install -y openssh-server curl
# Ensure root login is allowed if you plan to use it (optional)
# sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
# systemctl restart ssh

apt upgrade -y
`}</code>
                </pre>

                <p className='font-medium'>4. Convert to Template</p>
                <p className='text-xs'>
                    Stop the container. Right-click it in the Proxmox tree and select <code>Convert to template</code>.
                </p>

                <p className='font-medium'>5. Hook into FeatherPanel</p>
                <p>
                    In the Templates tab of your VDS Node, add a new template using the VMID of the LXC template you just
                    created. Ensure you select <code>LXC</code> as the Guest Type. FeatherPanel will now be able to
                    clone this template when creating new LXC instances.
                </p>
            </div>
        </PageCard>
    );
}
