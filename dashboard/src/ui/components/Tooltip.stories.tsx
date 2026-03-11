import type { Meta } from '@storybook/react'
import { Tooltip } from './Tooltip'
import { Button } from './Button'

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    delay: { control: 'number' },
  },
} satisfies Meta<typeof Tooltip>

export default meta

export const Top = {
  render: () => (
    <div className='flex justify-center pt-16'>
      <Tooltip content='View truck details' position='top' delay={300}>
        <Button>Hover me</Button>
      </Tooltip>
    </div>
  ),
}

export const Bottom = {
  render: () => (
    <div className='flex justify-center pb-16'>
      <Tooltip content='Download report as PDF' position='bottom' delay={300}>
        <Button variant='outline'>Download</Button>
      </Tooltip>
    </div>
  ),
}

export const AllPositions = {
  name: 'All Positions',
  render: () => (
    <div className='flex justify-center items-center gap-8 py-20 px-20'>
      <Tooltip content='Left tooltip' position='left'>
        <Button size='sm'>Left</Button>
      </Tooltip>
      <div className='flex flex-col gap-8'>
        <Tooltip content='Top tooltip' position='top'>
          <Button size='sm'>Top</Button>
        </Tooltip>
        <Tooltip content='Bottom tooltip' position='bottom'>
          <Button size='sm'>Bottom</Button>
        </Tooltip>
      </div>
      <Tooltip content='Right tooltip' position='right'>
        <Button size='sm'>Right</Button>
      </Tooltip>
    </div>
  ),
}
