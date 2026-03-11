import type { Meta, StoryObj } from '@storybook/react'
import { ConnectionStatus } from './ConnectionStatus'

const meta = {
  title: 'UI/ConnectionStatus',
  component: ConnectionStatus,
  tags: ['autodocs'],
  argTypes: {
    showQueueCount: { control: 'boolean' },
  },
} satisfies Meta<typeof ConnectionStatus>

export default meta
type Story = StoryObj<typeof meta>

export const Online: Story = {
  args: { showQueueCount: true },
}

export const WithoutQueue: Story = {
  args: { showQueueCount: false },
}
