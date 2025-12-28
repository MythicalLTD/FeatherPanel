import DashboardShell from '@/components/layout/DashboardShell'

export default function ServerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
