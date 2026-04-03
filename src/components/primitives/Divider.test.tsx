// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Divider } from './Divider'

describe('Divider', () => {
  it('renders hr when no label', () => {
    const { container } = render(<Divider />)
    expect(container.querySelector('hr')).toBeTruthy()
  })

  it('renders label text when provided', () => {
    render(<Divider label="Combat" />)
    expect(screen.getByText('Combat')).toBeTruthy()
  })
})
