import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Card, CreateCardData } from '@/types';
import { cardsAPI } from '@/services/api';

export const useCardsStore = defineStore('cards', () => {
  const cards = ref<Card[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const totalBalance = computed(() =>
    cards.value.reduce((sum, card) => sum + (card.balance || 0), 0)
  );

  async function fetchCards() {
    loading.value = true;
    error.value = null;

    try {
      cards.value = await cardsAPI.getAll();
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch cards';
    } finally {
      loading.value = false;
    }
  }

  async function getCard(id: string): Promise<Card | null> {
    try {
      return await cardsAPI.getById(id);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch card';
      return null;
    }
  }

  async function addCard(data: CreateCardData): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const newCard = await cardsAPI.create(data);
      cards.value.unshift(newCard);
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add card';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updateCard(id: string, data: Partial<CreateCardData>): Promise<boolean> {
    try {
      const updatedCard = await cardsAPI.update(id, data);
      const index = cards.value.findIndex(card => card.id === id);
      if (index !== -1) {
        cards.value[index] = updatedCard;
      }
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update card';
      return false;
    }
  }

  async function deleteCard(id: string): Promise<boolean> {
    try {
      await cardsAPI.delete(id);
      cards.value = cards.value.filter(card => card.id !== id);
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete card';
      return false;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    cards,
    loading,
    error,
    totalBalance,
    fetchCards,
    getCard,
    addCard,
    updateCard,
    deleteCard,
    clearError,
  };
});