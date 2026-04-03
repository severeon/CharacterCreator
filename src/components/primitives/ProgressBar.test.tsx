// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('renders label and current/max values', () => {
    render(<ProgressBar label="Hit Points" current={25} max={40} />)
    expect(screen.getByText('Hit Points')).toBeTruthy()
    expect(screen.getByText('25/40')).toBeTruthy()
  })

  it('renders correct number of segment divs', () => {
    const { container } = render(<ProgressBar label="HP" current={5} max={10} segments={10} />)
    const segments = container.querySelectorAll('.flex-1.rounded-sm')
    expect(segments.length).toBe(10)
  })

  it('handles max=0 without dividing by zero', () => {
    render(<ProgressBar label="HP" current={0} max={0} />)
    expect(screen.getByText('0/0')).toBeTruthy()
  })
})
