import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardContent } from './Card'

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-gray-600'>
          12 active trucks, 3 idle, 1 offline
        </p>
      </CardContent>
    </Card>
  ),
}

export const Elevated: Story = {
  render: () => (
    <Card variant='elevated'>
      <CardHeader>
        <CardTitle>Temperature Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-red-600'>
          Truck TRK-042: -2°C (threshold: -5°C)
        </p>
      </CardContent>
    </Card>
  ),
}

export const Outlined: Story = {
  render: () => (
    <Card variant='outlined'>
      <CardHeader>
        <CardTitle>Route Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-gray-600'>
          Bangkok → Chiang Mai: 688 km, ETA 8h
        </p>
      </CardContent>
    </Card>
  ),
}

export const MetricCards: Story = {
  name: 'Metric Card Grid',
  render: () => (
    <div className='grid grid-cols-3 gap-4'>
      <Card variant='elevated' padding='lg'>
        <p className='text-sm text-gray-500'>Active Trucks</p>
        <p className='text-3xl font-bold text-blue-600'>127</p>
      </Card>
      <Card variant='elevated' padding='lg'>
        <p className='text-sm text-gray-500'>Avg Temperature</p>
        <p className='text-3xl font-bold text-cyan-600'>-18.3°C</p>
      </Card>
      <Card variant='elevated' padding='lg'>
        <p className='text-sm text-gray-500'>Alerts Today</p>
        <p className='text-3xl font-bold text-red-600'>5</p>
      </Card>
    </div>
  ),
}
