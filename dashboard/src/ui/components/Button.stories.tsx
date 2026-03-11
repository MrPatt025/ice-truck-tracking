import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Button } from './Button'

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    onClick: fn(),
    children: 'Button',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Primary Button' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary' },
}

export const Outline: Story = {
  args: { variant: 'outline', children: 'Outline' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete Item' },
}

export const Small: Story = {
  args: { size: 'sm', children: 'Small' },
}

export const Large: Story = {
  args: { size: 'lg', children: 'Large Button' },
}

export const Loading: Story = {
  args: { loading: true, children: 'Saving...' },
}

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
}

export const WithLeftIcon: Story = {
  args: {
    leftIcon: '🚛',
    children: 'Track',
  },
}

export const WithRightIcon: Story = {
  args: {
    rightIcon: '→',
    children: 'Next',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-3'>
      <Button variant='primary'>Primary</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='danger'>Danger</Button>
    </div>
  ),
}
