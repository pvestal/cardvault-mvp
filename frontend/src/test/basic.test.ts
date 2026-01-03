import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

// Simple test component
const TestComponent = defineComponent({
  template: '<div data-test="hello">Hello {{ name }}</div>',
  props: {
    name: {
      type: String,
      default: 'World'
    }
  }
})

describe('Basic Test Setup', () => {
  it('can mount and test Vue components', () => {
    const wrapper = mount(TestComponent, {
      props: {
        name: 'CardVault'
      }
    })

    expect(wrapper.text()).toBe('Hello CardVault')
    expect(wrapper.find('[data-test="hello"]').exists()).toBe(true)
  })

  it('has working localStorage mocks', () => {
    localStorage.setItem('test-key', 'test-value')
    expect(localStorage.getItem('test-key')).toBe('test-value')

    localStorage.removeItem('test-key')
    expect(localStorage.getItem('test-key')).toBe(null)
  })

  it('has working environment mocks', () => {
    expect(import.meta.env.VITE_API_URL).toBe('/api/cardvault')
    expect(import.meta.env.MODE).toBe('test')
  })
})