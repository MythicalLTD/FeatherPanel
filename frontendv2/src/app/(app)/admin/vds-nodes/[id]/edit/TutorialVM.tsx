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

import { Info } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';

export function TutorialVM() {
    return (
        <PageCard title='How to create Debian 13 / Ubuntu 24.04 Proxmox templates' icon={Info} className='mt-6'>
            <div className='text-sm text-muted-foreground space-y-4'>
                <p className='font-medium'>1. Download latest cloud images on your Proxmox node</p>
                <pre className='bg-muted/60 rounded-md p-3 overflow-x-auto text-xs'>
                    <code>{`cd /var/lib/vz/template/iso

# Debian 13 (trixie)
wget https://cloud.debian.org/images/cloud/trixie/latest/debian-13-genericcloud-amd64.qcow2

# Ubuntu 24.04 (noble)
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img`}</code>
                </pre>

                <p className='font-medium'>2. Create a Debian 13 cloud-init template (example VMID 9000)</p>
                <p>In the Proxmox UI, use these settings when you click &quot;Create VM&quot;:</p>
                <ul className='list-disc list-inside text-xs space-y-1'>
                    <li>
                        <span className='font-semibold'>General:</span> set VMID <code>9000</code>, name e.g.
                        <code>debian-13-cloudinit</code>.
                    </li>
                    <li>
                        <span className='font-semibold'>OS tab:</span>{' '}
                        <span className='font-semibold text-foreground'>do not attach any ISO</span>. Set the CD/DVD
                        option to <code>Do not use any media</code>.
                    </li>
                    <li>
                        <span className='font-semibold'>System tab:</span> <code>Machine = q35</code>,{' '}
                        <code>BIOS = OVMF (UEFI)</code>. When asked, choose EFI storage (e.g. <code>local</code>)
                        and tick <code>Qemu agent</code>.
                    </li>
                    <li>
                        <span className='font-semibold'>Disks tab:</span> leave the default disk so the wizard can
                        finish (we will remove the default <code>scsi0</code> after creation).
                    </li>
                    <li>
                        <span className='font-semibold'>CPU tab:</span> set <code>Type = host</code>; keep
                        sockets/cores at your preferred defaults.
                    </li>
                    <li>
                        <span className='font-semibold'>Memory tab:</span> choose a reasonable default (e.g.
                        <code>1024</code> MB).
                    </li>
                    <li>
                        <span className='font-semibold'>Network tab:</span>{' '}
                        <code>Model = VirtIO (paravirtualized)</code>, bridge <code>vmbr0</code> (or your main
                        bridge).
                    </li>
                </ul>
                <p className='text-xs'>
                    After the VM is created, open its <code>Hardware</code> tab,{' '}
                    <span className='font-semibold'>remove the default scsi0 disk</span>, and make sure you still
                    have an EFI disk (<code>efidisk0</code>) and a free IDE slot for cloud-init (<code>ide2</code>).
                    Then on the node shell run the commands below.{' '}
                    <span className='font-semibold text-foreground'>Do not literally type</span>{' '}
                    <code>&lt;storage&gt;</code> – replace it with your storage ID from <code>qm config</code> (for
                    example <code>local</code> or <code>local-lvm</code>).
                </p>
                <pre className='bg-muted/60 rounded-md p-3 overflow-x-auto text-xs'>
                    <code>{`cd /var/lib/vz/template/iso

# (Optional) rename to .qcow2 and resize to desired template size
mv debian-13-genericcloud-amd64.qcow2 debian-13-genericcloud-amd64-template.qcow2
qemu-img resize debian-13-genericcloud-amd64-template.qcow2 32G

# Import Debian disk into the VM (replace <storage> with your storage ID, e.g. 'local')
qm importdisk 9000 debian-13-genericcloud-amd64-template.qcow2 <storage>

# Check the exact volume name Proxmox created (see scsi0/unused0)
qm config 9000

# In the Proxmox UI or via qm set, attach the imported volume as scsi0 on the same storage,
# add an EFI disk (efidisk0) and a cloud-init drive (ide2, type = CloudInit), then:
qm set 9000 --serial0 socket --vga serial0`}</code>
                </pre>

                <p className='text-xs'>
                    For <span className='font-semibold'>both</span> Debian and Ubuntu templates, go back to the
                    VM&apos;s <code>Hardware</code> tab and edit the imported disk (now <code>scsi0</code>). If this
                    node uses SSD or NVMe storage, tick both <code>Discard</code> and <code>SSD emulation</code> so
                    Proxmox can trim and align IO correctly, then save the dialog.
                </p>
                <p className='text-xs'>
                    Next, open <code>Options → Boot order</code>. Uncheck <code>ide2</code> and <code>net0</code> as
                    boot devices and drag <code>scsi0</code> to the very top so it is the{' '}
                    <span className='font-semibold'>only active boot entry</span>. This ensures the VM always boots
                    from the main disk on <code>scsi0</code> and never from PXE or the cloud-init CD while still
                    using the cloud-init drive on <code>ide2</code> for metadata.
                </p>
                <p className='text-xs'>
                    Go to <code>Hardware</code> and make sure you have an EFI disk (<code>efidisk0</code>) and a
                    <span className='font-semibold'> CloudInit drive</span> on <code>ide2</code>.{' '}
                    <span className='font-semibold text-foreground'>Do not remove the CloudInit drive</span> – it is
                    required for FeatherPanel to inject IP, user, password and SSH keys. Finally, right‑click the VM
                    in the tree, choose <code>Convert to template</code> and confirm. This gives you a ready‑to‑use
                    cloud-init template for that OS.
                </p>

                <p className='font-medium'>3. Create an Ubuntu 24.04 cloud-init template (example VMID 9001)</p>
                <p>In the Proxmox UI, repeat the same VM creation flow for Ubuntu:</p>
                <ul className='list-disc list-inside text-xs space-y-1'>
                    <li>
                        <span className='font-semibold'>General:</span> VMID <code>9001</code>, name e.g.
                        <code>ubuntu-24-cloudinit</code>.
                    </li>
                    <li>
                        <span className='font-semibold'>OS tab:</span> again,{' '}
                        <span className='font-semibold'>no ISO</span> (set CD/DVD to{' '}
                        <code>Do not use any media</code>).
                    </li>
                    <li>
                        <span className='font-semibold'>System tab:</span> <code>Machine = q35</code>,{' '}
                        <code>BIOS = OVMF (UEFI)</code> with EFI storage, Qemu agent enabled.
                    </li>
                    <li>
                        <span className='font-semibold'>Disks / CPU / Memory / Network:</span> same defaults as
                        Debian; remove the default <code>scsi0</code> disk on <code>Hardware</code> after creation,
                        keep VirtIO network.
                    </li>
                </ul>
                <p className='text-xs'>
                    Then on the node shell import the Ubuntu cloud image and attach it as <code>scsi0</code>:
                </p>
                <pre className='bg-muted/60 rounded-md p-3 overflow-x-auto text-xs'>
                    <code>{`cd /var/lib/vz/template/iso

mv noble-server-cloudimg-amd64.img noble-server-cloudimg-amd64.qcow2
qemu-img resize noble-server-cloudimg-amd64.qcow2 32G

qm importdisk 9001 noble-server-cloudimg-amd64.qcow2 <storage>

qm config 9001

# Attach imported disk as scsi0, add EFI disk and a cloud-init drive (ide2, type = CloudInit), then:
qm set 9001 --serial0 socket --vga serial0`}</code>
                </pre>

                <p className='text-xs'>
                    For <span className='font-semibold'>both</span> Debian and Ubuntu templates, go back to the
                    VM&apos;s <code>Hardware</code> tab and edit the imported disk (now <code>scsi0</code>). If this
                    node uses SSD or NVMe storage, tick both <code>Discard</code> and <code>SSD emulation</code> so
                    Proxmox can trim and align IO correctly, then save the dialog.
                </p>
                <p className='text-xs'>
                    Next, open <code>Options → Boot order</code>. Uncheck <code>ide2</code> and <code>net0</code> as
                    boot devices and drag <code>scsi0</code> to the very top so it is the{' '}
                    <span className='font-semibold'>only active boot entry</span>. This ensures the VM always boots
                    from the main disk on <code>scsi0</code> and never from PXE or the cloud-init CD while still
                    using the cloud-init drive on <code>ide2</code> for metadata.
                </p>
                <p className='text-xs'>
                    Go to <code>Hardware</code> and make sure you have an EFI disk (<code>efidisk0</code>) and a
                    <span className='font-semibold'> CloudInit drive</span> on <code>ide2</code>.{' '}
                    <span className='font-semibold text-foreground'>Do not remove the CloudInit drive</span> – it is
                    required for FeatherPanel to inject IP, user, password and SSH keys. Finally, right‑click the VM
                    in the tree, choose <code>Convert to template</code> and confirm. This gives you a ready‑to‑use
                    cloud-init template for that OS.
                </p>

                <p className='font-medium'>4. Hook into FeatherPanel</p>
                <p>
                    In your plans / products, use template ID <code>9000</code> for Debian 13 and <code>9001</code>{' '}
                    for Ubuntu 24.04. FeatherPanel will clone these templates, apply cloud-init (IP, user, password
                    / SSH keys) and the VNC Console button will open the Proxmox noVNC URL directly. These steps are
                    written for official Debian/Ubuntu cloud-init images, but the same pattern generally works for
                    other distros that ship proper cloud-init images and UEFI support.
                </p>
            </div>
        </PageCard>
    );
}
