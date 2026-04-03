// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TextField } from './TextField'

describe('TextField', () => {
  it('renders label and value as text when no onChange', () => {
    render(<TextField label="Name" value="Gimlet" />)
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('Gimlet')).toBeTruthy()
  })

  it('renders input when onChange provided', () => {
    render(<TextField label="Name" value="Gimlet" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    expect(input).toBeTruthy()
  })

  it('calls onChange with new value', () => {
    const onChange = vi.fn()
    render(<TextField value="old" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } })
    expect(onChange).toHaveBeenCalledWith('new')
  })

  it('renders dash for empty value in readonly mode', () => {
    render(<TextField value="" />)
    expect(screen.getByText('—')).toBeTruthy()
  })
})
