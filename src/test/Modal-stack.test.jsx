import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '../components/ui/Modal'

describe('Modal — pilha de Esc', () => {
  it('modal único fecha no Esc', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Único">corpo</Modal>)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('com dois modais abertos, Esc fecha só o de cima', async () => {
    const onCloseOuter = vi.fn()
    const onCloseInner = vi.fn()
    render(
      <>
        <Modal open onClose={onCloseOuter} title="Externo">externo</Modal>
        <Modal open onClose={onCloseInner} title="Interno">interno</Modal>
      </>
    )
    await userEvent.keyboard('{Escape}')
    expect(onCloseInner).toHaveBeenCalledTimes(1)
    expect(onCloseOuter).not.toHaveBeenCalled()
  })
})
