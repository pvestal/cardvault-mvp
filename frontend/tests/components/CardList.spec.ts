/**
 * Unit tests for CardList component
 * Tests card display, filtering, and interaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CardList from '@/components/CardList.vue';
import { useCardsStore } from '@/stores/cards';
import { useAuthStore } from '@/stores/auth';

describe('CardList Component', () => {
  let wrapper: VueWrapper;
  let cardsStore: ReturnType<typeof useCardsStore>;
  let authStore: ReturnType<typeof useAuthStore>;

  const mockCards = [
    {
      id: '1',
      card_name: 'Grocery Store Card',
      card_number_encrypted: 'encrypted1',
      card_number_masked: '****1234',
      barcode_data: '123456789',
      pin: '1234',
      notes: 'Main grocery card',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      card_name: 'Pharmacy Rewards',
      card_number_encrypted: 'encrypted2',
      card_number_masked: '****5678',
      barcode_data: '987654321',
      pin: '5678',
      notes: 'Pharmacy discount card',
      created_at: '2024-01-02T00:00:00Z'
    },
    {
      id: '3',
      card_name: 'Coffee Shop',
      card_number_encrypted: 'encrypted3',
      card_number_masked: '****9012',
      barcode_data: '555555555',
      pin: null,
      notes: null,
      created_at: '2024-01-03T00:00:00Z'
    }
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    cardsStore = useCardsStore();
    authStore = useAuthStore();

    // Mock auth state
    authStore.user = { id: 'user123', username: 'testuser' };
    authStore.isAuthenticated = true;

    // Mock cards state
    cardsStore.cards = [...mockCards];
    cardsStore.loading = false;
    cardsStore.error = null;
  });

  describe('Card Display', () => {
    it('should display all cards when no filter is applied', () => {
      wrapper = mount(CardList);

      const cards = wrapper.findAll('[data-testid="card-item"]');
      expect(cards).toHaveLength(3);

      expect(cards[0].text()).toContain('Grocery Store Card');
      expect(cards[1].text()).toContain('Pharmacy Rewards');
      expect(cards[2].text()).toContain('Coffee Shop');
    });

    it('should display masked card numbers', () => {
      wrapper = mount(CardList);

      const cardNumbers = wrapper.findAll('[data-testid="card-number"]');
      expect(cardNumbers[0].text()).toBe('****1234');
      expect(cardNumbers[1].text()).toBe('****5678');
      expect(cardNumbers[2].text()).toBe('****9012');
    });

    it('should show loading state', async () => {
      cardsStore.loading = true;
      wrapper = mount(CardList);

      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
      expect(wrapper.findAll('[data-testid="card-item"]')).toHaveLength(0);
    });

    it('should show error message', async () => {
      cardsStore.error = 'Failed to load cards';
      wrapper = mount(CardList);

      expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Failed to load cards');
    });

    it('should show empty state when no cards exist', () => {
      cardsStore.cards = [];
      wrapper = mount(CardList);

      expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('No cards found');
      expect(wrapper.find('button[data-testid="add-first-card"]').exists()).toBe(true);
    });
  });

  describe('Card Filtering', () => {
    it('should filter cards by search term', async () => {
      wrapper = mount(CardList);

      const searchInput = wrapper.find('input[data-testid="search-input"]');
      await searchInput.setValue('Pharmacy');

      const cards = wrapper.findAll('[data-testid="card-item"]');
      expect(cards).toHaveLength(1);
      expect(cards[0].text()).toContain('Pharmacy Rewards');
    });

    it('should be case-insensitive when filtering', async () => {
      wrapper = mount(CardList);

      const searchInput = wrapper.find('input[data-testid="search-input"]');
      await searchInput.setValue('GROCERY');

      const cards = wrapper.findAll('[data-testid="card-item"]');
      expect(cards).toHaveLength(1);
      expect(cards[0].text()).toContain('Grocery Store Card');
    });

    it('should search in card notes', async () => {
      wrapper = mount(CardList);

      const searchInput = wrapper.find('input[data-testid="search-input"]');
      await searchInput.setValue('discount');

      const cards = wrapper.findAll('[data-testid="card-item"]');
      expect(cards).toHaveLength(1);
      expect(cards[0].text()).toContain('Pharmacy Rewards');
    });

    it('should show no results message when filter matches nothing', async () => {
      wrapper = mount(CardList);

      const searchInput = wrapper.find('input[data-testid="search-input"]');
      await searchInput.setValue('NonexistentCard');

      expect(wrapper.find('[data-testid="no-results"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('No cards match your search');
    });

    it('should clear filter when clear button is clicked', async () => {
      wrapper = mount(CardList);

      const searchInput = wrapper.find('input[data-testid="search-input"]');
      await searchInput.setValue('Coffee');

      let cards = wrapper.findAll('[data-testid="card-item"]');
      expect(cards).toHaveLength(1);

      const clearButton = wrapper.find('button[data-testid="clear-search"]');
      await clearButton.trigger('click');

      cards = wrapper.findAll('[data-testid="card-item"]');
      expect(cards).toHaveLength(3);
    });
  });

  describe('Card Interactions', () => {
    it('should emit select event when card is clicked', async () => {
      wrapper = mount(CardList);

      const firstCard = wrapper.find('[data-testid="card-item"]');
      await firstCard.trigger('click');

      expect(wrapper.emitted('select-card')).toBeTruthy();
      expect(wrapper.emitted('select-card')?.[0]).toEqual([mockCards[0]]);
    });

    it('should navigate to card details on click', async () => {
      const mockRouter = {
        push: vi.fn()
      };

      wrapper = mount(CardList, {
        global: {
          mocks: {
            $router: mockRouter
          }
        }
      });

      const firstCard = wrapper.find('[data-testid="card-item"]');
      await firstCard.trigger('click');

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'card-details',
        params: { id: '1' }
      });
    });

    it('should open add card modal when add button is clicked', async () => {
      wrapper = mount(CardList);

      const addButton = wrapper.find('button[data-testid="add-card-button"]');
      await addButton.trigger('click');

      expect(wrapper.emitted('open-add-modal')).toBeTruthy();
    });

    it('should handle keyboard navigation', async () => {
      wrapper = mount(CardList);

      const cardItems = wrapper.findAll('[data-testid="card-item"]');

      // Focus first card
      await cardItems[0].trigger('focus');
      expect(document.activeElement).toBe(cardItems[0].element);

      // Arrow down to next card
      await cardItems[0].trigger('keydown', { key: 'ArrowDown' });
      expect(document.activeElement).toBe(cardItems[1].element);

      // Arrow up to previous card
      await cardItems[1].trigger('keydown', { key: 'ArrowUp' });
      expect(document.activeElement).toBe(cardItems[0].element);

      // Enter to select
      await cardItems[0].trigger('keydown', { key: 'Enter' });
      expect(wrapper.emitted('select-card')?.[0]).toEqual([mockCards[0]]);
    });
  });

  describe('Sorting', () => {
    it('should sort cards alphabetically', async () => {
      wrapper = mount(CardList);

      const sortButton = wrapper.find('select[data-testid="sort-select"]');
      await sortButton.setValue('name-asc');

      const cards = wrapper.findAll('[data-testid="card-item"]');
      expect(cards[0].text()).toContain('Coffee Shop');
      expect(cards[1].text()).toContain('Grocery Store Card');
      expect(cards[2].text()).toContain('Pharmacy Rewards');
    });

    it('should sort cards by date added', async () => {
      wrapper = mount(CardList);

      const sortButton = wrapper.find('select[data-testid="sort-select"]');
      await sortButton.setValue('date-desc');

      const cards = wrapper.findAll('[data-testid="card-item"]');
      expect(cards[0].text()).toContain('Coffee Shop');
      expect(cards[1].text()).toContain('Pharmacy Rewards');
      expect(cards[2].text()).toContain('Grocery Store Card');
    });
  });

  describe('Card Actions', () => {
    it('should show action menu on more button click', async () => {
      wrapper = mount(CardList);

      const moreButton = wrapper.find('button[data-testid="card-menu-1"]');
      await moreButton.trigger('click');

      expect(wrapper.find('[data-testid="card-menu-dropdown-1"]').exists()).toBe(true);
      expect(wrapper.find('button[data-testid="edit-card-1"]').exists()).toBe(true);
      expect(wrapper.find('button[data-testid="delete-card-1"]').exists()).toBe(true);
    });

    it('should open edit modal when edit is clicked', async () => {
      wrapper = mount(CardList);

      const moreButton = wrapper.find('button[data-testid="card-menu-1"]');
      await moreButton.trigger('click');

      const editButton = wrapper.find('button[data-testid="edit-card-1"]');
      await editButton.trigger('click');

      expect(wrapper.emitted('open-edit-modal')).toBeTruthy();
      expect(wrapper.emitted('open-edit-modal')?.[0]).toEqual([mockCards[0]]);
    });

    it('should show delete confirmation when delete is clicked', async () => {
      wrapper = mount(CardList);

      const moreButton = wrapper.find('button[data-testid="card-menu-1"]');
      await moreButton.trigger('click');

      const deleteButton = wrapper.find('button[data-testid="delete-card-1"]');
      await deleteButton.trigger('click');

      expect(wrapper.find('[data-testid="delete-confirmation"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Are you sure you want to delete');
      expect(wrapper.text()).toContain('Grocery Store Card');
    });

    it('should delete card when confirmed', async () => {
      const deleteCard = vi.spyOn(cardsStore, 'deleteCard').mockResolvedValue(undefined);
      wrapper = mount(CardList);

      const moreButton = wrapper.find('button[data-testid="card-menu-1"]');
      await moreButton.trigger('click');

      const deleteButton = wrapper.find('button[data-testid="delete-card-1"]');
      await deleteButton.trigger('click');

      const confirmButton = wrapper.find('button[data-testid="confirm-delete"]');
      await confirmButton.trigger('click');

      expect(deleteCard).toHaveBeenCalledWith('1');
    });

    it('should cancel delete when declined', async () => {
      const deleteCard = vi.spyOn(cardsStore, 'deleteCard');
      wrapper = mount(CardList);

      const moreButton = wrapper.find('button[data-testid="card-menu-1"]');
      await moreButton.trigger('click');

      const deleteButton = wrapper.find('button[data-testid="delete-card-1"]');
      await deleteButton.trigger('click');

      const cancelButton = wrapper.find('button[data-testid="cancel-delete"]');
      await cancelButton.trigger('click');

      expect(deleteCard).not.toHaveBeenCalled();
      expect(wrapper.find('[data-testid="delete-confirmation"]').exists()).toBe(false);
    });
  });

  describe('Responsive Behavior', () => {
    it('should switch to grid view on desktop', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      wrapper = mount(CardList);

      expect(wrapper.find('[data-testid="cards-grid"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="cards-list"]').exists()).toBe(false);
    });

    it('should switch to list view on mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      wrapper = mount(CardList);

      expect(wrapper.find('[data-testid="cards-list"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="cards-grid"]').exists()).toBe(false);
    });

    it('should allow view toggle on desktop', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      wrapper = mount(CardList);

      const toggleButton = wrapper.find('button[data-testid="view-toggle"]');
      await toggleButton.trigger('click');

      expect(wrapper.find('[data-testid="cards-list"]').exists()).toBe(true);

      await toggleButton.trigger('click');
      expect(wrapper.find('[data-testid="cards-grid"]').exists()).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      wrapper = mount(CardList);

      expect(wrapper.find('[aria-label="Search cards"]').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Add new card"]').exists()).toBe(true);
      expect(wrapper.find('[role="list"]').exists()).toBe(true);
    });

    it('should announce search results to screen readers', async () => {
      wrapper = mount(CardList);

      const searchInput = wrapper.find('input[data-testid="search-input"]');
      await searchInput.setValue('Coffee');

      const announcement = wrapper.find('[role="status"][aria-live="polite"]');
      expect(announcement.text()).toContain('1 card found');
    });

    it('should trap focus in delete confirmation', async () => {
      wrapper = mount(CardList);

      const moreButton = wrapper.find('button[data-testid="card-menu-1"]');
      await moreButton.trigger('click');

      const deleteButton = wrapper.find('button[data-testid="delete-card-1"]');
      await deleteButton.trigger('click');

      const dialog = wrapper.find('[role="dialog"]');
      expect(dialog.exists()).toBe(true);
      expect(dialog.attributes('aria-modal')).toBe('true');
    });
  });
});