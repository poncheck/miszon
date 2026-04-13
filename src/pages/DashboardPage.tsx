import { ClockWidget } from '../components/dashboard/ClockWidget'
import { GatewayStatus } from '../components/dashboard/GatewayStatus'

export function DashboardPage() {
  return (
    <div className="p-8 flex flex-col gap-6 max-w-3xl">
      <ClockWidget />
      <GatewayStatus />
    </div>
  )
}
