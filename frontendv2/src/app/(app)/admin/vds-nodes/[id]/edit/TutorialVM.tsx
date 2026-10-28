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

'use client';

import { Info, ShieldAlert } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';

export function TutorialVM() {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.vdsNodes.tutorial.vm.title')} icon={Info} className='mt-6'>
            <div className='text-muted-foreground space-y-4 text-sm'>
                <p className='font-medium'>{t('admin.vdsNodes.tutorial.vm.step1')}</p>
                <pre className='bg-muted/60 overflow-x-auto rounded-md p-3 text-xs'>
                    <code>{`cd /var/lib/vz/template/iso

# Debian 13 (trixie)
wget https://cloud.debian.org/images/cloud/trixie/latest/debian-13-genericcloud-amd64.qcow2

# Ubuntu 24.04 (noble)
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img`}</code>
                </pre>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.vm.step2')}</p>
                <p>{t('ui.admin.vdsNodes.edit.tutorialVM.inTheProxmoxUIUseThese')}</p>
                <ul className='list-inside list-disc space-y-1 text-xs'>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.general')}</span> set VMID{' '}
                        <code>9000</code>, name e.g.
                        <code>debian-13-cloudinit</code>.
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.oSTab')}</span>{' '}
                        <span className='text-foreground font-semibold'>do not attach any ISO</span>. Set the CD/DVD
                        option to <code>{t('ui.admin.vdsNodes.edit.tutorialVM.doNotUseAnyMedia')}</code>.
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.systemTab')}</span>{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.machineQ35')}</code>,{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.bIOSOVMFUEFI')}</code>. When asked, choose EFI
                        storage (e.g. <code>local</code>) and tick{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.qemuAgent')}</code>.
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.disksTab')}</span> leave
                        the default disk so the wizard can finish (we will remove the default <code>scsi0</code> after
                        creation).
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.cPUTab')}</span> set{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.typeHost')}</code>; keep sockets/cores at your
                        preferred defaults.
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.memoryTab')}</span> choose
                        a reasonable default (e.g.
                        <code>1024</code> {t('ui.admin.vdsNodes.edit.tutorialVM.mB')}
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.networkTab')}</span>{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.modelVirtIOParavirtualized')}</code>, bridge{' '}
                        <code>vmbr0</code> {t('ui.admin.vdsNodes.edit.tutorialVM.orYourMainBridge')}
                    </li>
                </ul>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.afterTheVMIsCreatedOpen')}{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.hardware')}</code> tab,{' '}
                    <span className='font-semibold'>remove the default scsi0 disk</span>, and make sure you still have
                    an EFI disk (<code>efidisk0</code>) and a free IDE slot for cloud-init (<code>ide2</code>). Then on
                    the node shell run the commands below.{' '}
                    <span className='text-foreground font-semibold'>
                        {t('ui.admin.vdsNodes.edit.tutorialVM.doNotLiterallyType')}
                    </span>{' '}
                    <code>&lt;storage&gt;</code> - replace it with your storage ID from <code>qm config</code>{' '}
                    {t('ui.admin.vdsNodes.edit.tutorialVM.forExample')} <code>local</code> or <code>local-lvm</code>).
                </p>
                <pre className='bg-muted/60 overflow-x-auto rounded-md p-3 text-xs'>
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
                    {t('ui.admin.vdsNodes.edit.tutorialVM.for')} <span className='font-semibold'>both</span>{' '}
                    {t('ui.admin.vdsNodes.edit.tutorialVM.debianAndUbuntuTemplatesGoBack')}{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.hardware')}</code> tab and edit the imported disk (now{' '}
                    <code>scsi0</code>). If this node uses SSD or NVMe storage, tick both{' '}
                    <code>{t('common.unsavedChanges.discard')}</code> and{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.sSDEmulation')}</code> so Proxmox can trim and align IO
                    correctly, then save the dialog.
                </p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.nextOpen')}{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.optionsBootOrder')}</code>. Uncheck <code>ide2</code>{' '}
                    and <code>net0</code> as boot devices and drag <code>scsi0</code> to the very top so it is the{' '}
                    <span className='font-semibold'>only active boot entry</span>. This ensures the VM always boots from
                    the main disk on <code>scsi0</code> and never from PXE or the cloud-init CD while still using the
                    cloud-init drive on <code>ide2</code> for metadata.
                </p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.goTo')}{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.hardware')}</code> and make sure you have an EFI disk (
                    <code>efidisk0</code>) and a
                    <span className='font-semibold'> {t('ui.admin.vdsNodes.edit.tutorialVM.cloudInitDrive')}</span> on{' '}
                    <code>ide2</code>.{' '}
                    <span className='text-foreground font-semibold'>
                        {t('ui.admin.vdsNodes.edit.tutorialVM.doNotRemoveTheCloudInitDrive')}
                    </span>{' '}
                    - it is required for FeatherPanel to inject IP, user, password and SSH keys. Finally, right‑click
                    the VM in the tree, choose <code>{t('ui.admin.vdsNodes.edit.tutorialVM.convertToTemplate')}</code>{' '}
                    and confirm. This gives you a ready‑to‑use cloud-init template for that OS.
                </p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.importantBeforeConvertingStartTheVM')}
                    <code> /etc/ssh/sshd_config</code>. If your products use password-based SSH login, ensure
                    <code> {t('ui.admin.vdsNodes.edit.tutorialVM.passwordAuthenticationYes')}</code> is enabled (and set{' '}
                    <code> {t('ui.admin.vdsNodes.edit.tutorialVM.permitRootLoginYes')}</code> only if you intentionally
                    allow root password logins). Restart SSH after changes. Skipping this can cause clients to fail SSH
                    logins after deployment.
                </p>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.vm.step3')}</p>
                <p>{t('ui.admin.vdsNodes.edit.tutorialVM.inTheProxmoxUIRepeatThe')}</p>
                <ul className='list-inside list-disc space-y-1 text-xs'>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.general')}</span>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialVM.vMID')} <code>9001</code>, name e.g.
                        <code>ubuntu-24-cloudinit</code>.
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.oSTab')}</span> again,{' '}
                        <span className='font-semibold'>no ISO</span>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialVM.setCDDVDTo')}{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.doNotUseAnyMedia')}</code>).
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialVM.systemTab')}</span>{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.machineQ35')}</code>,{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.bIOSOVMFUEFI')}</code> with EFI storage, Qemu agent
                        enabled.
                    </li>
                    <li>
                        <span className='font-semibold'>
                            {t('ui.admin.vdsNodes.edit.tutorialVM.disksCPUMemoryNetwork')}
                        </span>{' '}
                        same defaults as Debian; remove the default <code>scsi0</code> disk on{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialVM.hardware')}</code> after creation, keep VirtIO
                        network.
                    </li>
                </ul>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.thenOnTheNodeShellImport')} <code>scsi0</code>:
                </p>
                <pre className='bg-muted/60 overflow-x-auto rounded-md p-3 text-xs'>
                    <code>{`cd /var/lib/vz/template/iso

mv noble-server-cloudimg-amd64.img noble-server-cloudimg-amd64.qcow2
qemu-img resize noble-server-cloudimg-amd64.qcow2 32G

qm importdisk 9001 noble-server-cloudimg-amd64.qcow2 <storage>

qm config 9001

# Attach imported disk as scsi0, add EFI disk and a cloud-init drive (ide2, type = CloudInit), then:
qm set 9001 --serial0 socket --vga serial0`}</code>
                </pre>

                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.for')} <span className='font-semibold'>both</span>{' '}
                    {t('ui.admin.vdsNodes.edit.tutorialVM.debianAndUbuntuTemplatesGoBack')}{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.hardware')}</code> tab and edit the imported disk (now{' '}
                    <code>scsi0</code>). If this node uses SSD or NVMe storage, tick both{' '}
                    <code>{t('common.unsavedChanges.discard')}</code> and{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.sSDEmulation')}</code> so Proxmox can trim and align IO
                    correctly, then save the dialog.
                </p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.nextOpen')}{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.optionsBootOrder')}</code>. Uncheck <code>ide2</code>{' '}
                    and <code>net0</code> as boot devices and drag <code>scsi0</code> to the very top so it is the{' '}
                    <span className='font-semibold'>only active boot entry</span>. This ensures the VM always boots from
                    the main disk on <code>scsi0</code> and never from PXE or the cloud-init CD while still using the
                    cloud-init drive on <code>ide2</code> for metadata.
                </p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.goTo')}{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.hardware')}</code> and make sure you have an EFI disk (
                    <code>efidisk0</code>) and a
                    <span className='font-semibold'> {t('ui.admin.vdsNodes.edit.tutorialVM.cloudInitDrive')}</span> on{' '}
                    <code>ide2</code>.{' '}
                    <span className='text-foreground font-semibold'>
                        {t('ui.admin.vdsNodes.edit.tutorialVM.doNotRemoveTheCloudInitDrive')}
                    </span>{' '}
                    - it is required for FeatherPanel to inject IP, user, password and SSH keys. Finally, right‑click
                    the VM in the tree, choose <code>{t('ui.admin.vdsNodes.edit.tutorialVM.convertToTemplate')}</code>{' '}
                    and confirm. This gives you a ready‑to‑use cloud-init template for that OS.
                </p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.importantBeforeConvertingBootTheVM')}{' '}
                    <code>/etc/ssh/sshd_config</code>. For password-login plans, set{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialVM.passwordAuthenticationYes')}</code> and restart SSH. If
                    this is not configured, deployed clients may not be able to SSH into their servers.
                </p>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.vm.step4')}</p>
                <p>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.inYourPlansProductsUseTemplate')} <code>9000</code> for Debian
                    13 and <code>9001</code> for Ubuntu 24.04. FeatherPanel will clone these templates, apply cloud-init
                    (IP, user, password / SSH keys) and the VNC Console button will open the Proxmox noVNC URL directly.
                    These steps are written for official Debian/Ubuntu cloud-init images, but the same pattern generally
                    works for other distros that ship proper cloud-init images and UEFI support.
                </p>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.vm.step5')}</p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialVM.ifCreatesFailWith')}{' '}
                    <code>qemu-img resize … failed: got timeout</code>, Proxmox is timing out while allocating qcow2
                    metadata on your storage. On the Proxmox node, disable metadata preallocation for the storage that
                    holds VM disks (replace <code>raid1</code> with your storage ID from <code>pvesm status</code>):
                </p>
                <pre className='bg-muted/60 overflow-x-auto rounded-md p-3 text-xs'>
                    <code>{`pvesm set raid1 --preallocation off`}</code>
                </pre>
                <p className='text-xs'>{t('ui.admin.vdsNodes.edit.tutorialVM.thisIsACommonFixFor')}</p>

                <div className='bg-primary/5 border-primary/20 mt-6 rounded-lg border p-4'>
                    <p className='text-primary flex items-center gap-2 font-medium'>
                        <ShieldAlert className='h-4 w-4' />
                        {t('admin.vdsNodes.tutorial.vm.best_practice_title')}
                    </p>
                    <p className='text-muted-foreground mt-1 text-xs'>
                        {t('ui.admin.vdsNodes.edit.tutorialVM.vMsQEMUKVMProvideTheStrongest')}
                    </p>
                </div>
            </div>
        </PageCard>
    );
}
