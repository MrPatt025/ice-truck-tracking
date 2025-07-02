import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardContent } from '../src/ui/components/Card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Truck Status</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This is a default card with some content.</p>
      </CardContent>
    </Card>
  ),
}

export const Elevated: Story = {
  render: () => (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Elevated Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This card has an elevated shadow effect.</p>
      </CardContent>
    </Card>
  ),
}

export const Outlined: Story = {
  render: () => (
    <Card variant="outlined">
      <CardHeader>
        <CardTitle>Outlined Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This card has a prominent border.</p>
      </CardContent>
    </Card>
  ),
}

export const TruckCard: Story = {
  render: () => (
    <Card variant="elevated" className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚚 Truck ABC-123
          <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Driver:</span>
          <span className="font-medium">John Doe</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Temperature:</span>
          <span className="font-medium text-blue-600">-2.5°C</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Speed:</span>
          <span className="font-medium">45 km/h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Location:</span>
          <span className="font-medium">Bangkok, TH</span>
        </div>
      </CardContent>
    </Card>
  ),
}