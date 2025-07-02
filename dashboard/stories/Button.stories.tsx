import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../src/ui/components/Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    loading: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
}

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
}

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
}

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
}

export const Loading: Story = {
  args: {
    children: 'Loading Button',
    loading: true,
  },
}

export const WithIcons: Story = {
  args: {
    children: 'With Icons',
    leftIcon: '🚚',
    rightIcon: '→',
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>
      <div className="flex gap-4">
        <Button variant="primary" disabled>Disabled</Button>
        <Button variant="primary" loading>Loading</Button>
      </div>
    </div>
  ),
}