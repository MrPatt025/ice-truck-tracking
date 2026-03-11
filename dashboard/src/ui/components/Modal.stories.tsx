import type { Meta } from '@storybook/react'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

const meta = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof Modal>

export default meta

function DefaultStory() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm Action">
        <p>Are you sure you want to dispatch truck TRK-042?</p>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Confirm</Button>
        </div>
      </Modal>
    </>
  )
}
export const Default = { render: () => <DefaultStory /> }

function LargeStory() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Route Details</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Route Details" size="lg">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Bangkok → Chiang Mai</h3>
            <p className="text-sm text-gray-500">Distance: 688 km | ETA: 8 hours</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Driver</p>
              <p className="font-medium">Somchai K.</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Truck</p>
              <p className="font-medium">TRK-042</p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
export const Large = { render: () => <LargeStory /> }

function DangerStory() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete Truck</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Delete Truck">
        <p className="text-red-600">
          This action cannot be undone. All telemetry data for TRK-042 will be permanently deleted.
        </p>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => setOpen(false)}>Delete</Button>
        </div>
      </Modal>
    </>
  )
}
export const DangerConfirmation = {
  name: 'Danger Confirmation',
  render: () => <DangerStory />,
}
