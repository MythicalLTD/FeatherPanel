/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client'

import React from 'react'
import { Wifi, Cpu, HardDrive, Database, Clock, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'
import { formatMib, formatCpu as formatCpuGlobal } from '@/lib/utils'

interface ServerInfoCardsProps {
  serverIp: string
  serverPort: number
  cpuLimit: number
  memoryLimit: number
  diskLimit: number
  wingsUptime: string
  ping: number | null
  // Current usage
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
}

export default function ServerInfoCards({
  serverIp,
  serverPort,
  cpuLimit,
  memoryLimit,
  diskLimit,
  wingsUptime,
  ping,
  cpuUsage = 0,
  memoryUsage = 0,
  diskUsage = 0,
}: ServerInfoCardsProps) {
  const { t } = useTranslation()

  const formatCpu = (cpu: number): string => {
    if (cpu === 0) return t('servers.console.info_cards.unlimited')
    return formatCpuGlobal(cpu)
  }

  const formatMemory = (memory: number): string => {
    if (memory === 0) return t('servers.console.info_cards.unlimited')
    return formatMib(memory)
  }

  const formatDisk = (disk: number): string => {
    if (disk === 0) return t('servers.console.info_cards.unlimited')
    return formatMib(disk)
  }

  const cards = [
    {
      title: t('servers.console.info_cards.address'),
      value: serverIp && serverPort ? `${serverIp}:${serverPort}` : 'N/A',
      icon: Wifi,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      copyable: true,
    },
    {
      title: t('servers.cpu'),
      value: `${cpuUsage.toFixed(1)}%`,
      subtitle: t('servers.console.info_cards.limit', { limit: formatCpu(cpuLimit) }),
      icon: Cpu,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: t('servers.memory'),
      value: formatMib(memoryUsage),
      subtitle: t('servers.console.info_cards.limit', { limit: formatMemory(memoryLimit) }),
      icon: Database,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: t('servers.disk'),
      value: formatMib(diskUsage),
      subtitle: t('servers.console.info_cards.limit', { limit: formatDisk(diskLimit) }),
      icon: HardDrive,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: t('servers.console.info_cards.uptime'),
      value: wingsUptime || 'N/A',
      icon: Clock,
      iconColor: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      title: t('servers.console.info_cards.ping'),
      value: ping !== null ? `${ping}ms` : 'N/A',
      icon: Activity,
      iconColor: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ]



  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        toast.success(t('servers.console.info_cards.copied'))
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
          toast.success(t('servers.console.info_cards.copied'))
        } catch (err) {
          console.error('Fallback copy failed', err)
          toast.error(t('servers.console.info_cards.copy_error'))
        }
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error(t('servers.console.info_cards.copy_error'))
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {card.title}
              </h3>
              <div className={`h-10 w-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-2xl font-bold truncate flex-1" title={card.value}>
                {card.value}
              </div>
              {'copyable' in card && card.copyable && card.value !== 'N/A' && (
                <button
                  onClick={() => handleCopy(card.value)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title={t('servers.console.info_cards.copy')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>
              )}
            </div>
            {'subtitle' in card && card.subtitle && (
              <div className="text-xs text-muted-foreground mt-1">
                {card.subtitle}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
