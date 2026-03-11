import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search'],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { placeholder: 'Enter text...' },
}

export const WithLabel: Story = {
  args: { label: 'Truck Code', placeholder: 'TRK-001' },
}

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    error: 'Please enter a valid email address',
    defaultValue: 'invalid',
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'License Plate',
    helperText: 'Format: กท-1234',
    placeholder: 'กท-1234',
  },
}

export const WithLeftIcon: Story = {
  args: {
    label: 'Search Trucks',
    leftIcon: '🔍',
    placeholder: 'Search by name or code...',
  },
}

export const Disabled: Story = {
  args: {
    label: 'GPS Code',
    defaultValue: 'GPS-2024-0042',
    disabled: true,
  },
}

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
  },
}
