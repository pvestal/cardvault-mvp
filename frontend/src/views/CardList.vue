<template>
  <div class="card-list-container">
    <header class="header">
      <div class="header-content">
        <h1>CardVault</h1>
        <div class="user-info">
          <span>{{ authStore.user?.username }}</span>
          <button @click="logout" class="logout-btn">Logout</button>
        </div>
      </div>
    </header>

    <div class="summary">
      <div class="total-balance">
        <h2>${{ cardsStore.totalBalance.toFixed(2) }}</h2>
        <span>Total Balance</span>
      </div>
      <div class="card-count">
        <h3>{{ cardsStore.cards.length }}</h3>
        <span>Cards</span>
      </div>
    </div>

    <div class="actions">
      <button @click="$router.push('/cards/add')" class="add-btn">
        + Add Card
      </button>
      <button @click="refreshCards" :disabled="cardsStore.loading" class="refresh-btn">
        {{ cardsStore.loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="cardsStore.error" class="error">
      {{ cardsStore.error }}
      <button @click="cardsStore.clearError" class="close-error">×</button>
    </div>

    <div v-if="cardsStore.loading && cardsStore.cards.length === 0" class="loading">
      Loading your cards...
    </div>

    <div v-else-if="cardsStore.cards.length === 0" class="empty-state">
      <h3>No cards yet</h3>
      <p>Add your first gift card to get started</p>
      <button @click="$router.push('/cards/add')" class="add-btn">
        Add Your First Card
      </button>
    </div>

    <div v-else class="cards-grid">
      <div
        v-for="card in cardsStore.cards"
        :key="card.id"
        @click="$router.push(`/cards/${card.id}`)"
        class="card-item"
      >
        <div class="card-header">
          <h3>{{ card.name }}</h3>
          <span v-if="card.balance" class="balance">${{ card.balance.toFixed(2) }}</span>
        </div>
        <div class="card-info">
          <span class="format">{{ card.barcode_format }}</span>
          <span class="date">{{ formatDate(card.created_at) }}</span>
        </div>
        <div v-if="card.notes" class="card-notes">
          {{ card.notes }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCardsStore } from '@/stores/cards';

const router = useRouter();
const authStore = useAuthStore();
const cardsStore = useCardsStore();

const logout = () => {
  authStore.logout();
  router.push('/login');
};

const refreshCards = () => {
  cardsStore.fetchCards();
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

onMounted(() => {
  cardsStore.fetchCards();
});
</script>

<style scoped>
.card-list-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e1e5e9;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  color: #333;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.logout-btn:hover {
  background: #c82333;
}

.summary {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: flex;
  gap: 2rem;
  align-items: center;
}

.total-balance h2 {
  color: #28a745;
  margin: 0;
  font-size: 2rem;
}

.total-balance span,
.card-count span {
  color: #666;
  font-size: 0.9rem;
}

.card-count h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.actions {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem 1rem;
  display: flex;
  gap: 1rem;
}

.add-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.add-btn:hover {
  background: #218838;
}

.refresh-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-btn:hover:not(:disabled) {
  background: #5a6268;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  max-width: 1200px;
  margin: 0 auto 1rem;
  padding: 0 1rem;
  color: #dc3545;
  background: #f8d7da;
  padding: 1rem;
  border-radius: 4px;
  position: relative;
}

.close-error {
  position: absolute;
  right: 1rem;
  top: 1rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}

.loading,
.empty-state {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  text-align: center;
}

.empty-state h3 {
  color: #666;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #888;
  margin-bottom: 2rem;
}

.cards-grid {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.card-item {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}

.balance {
  color: #28a745;
  font-weight: 500;
}

.card-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.card-notes {
  font-size: 0.9rem;
  color: #666;
  font-style: italic;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .summary {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .actions {
    flex-direction: column;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>