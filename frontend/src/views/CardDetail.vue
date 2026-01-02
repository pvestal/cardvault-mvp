<template>
  <div class="card-detail-container">
    <header class="header">
      <button @click="$router.back()" class="back-btn">← Back</button>
      <h1>{{ card?.name || 'Loading...' }}</h1>
      <button v-if="card" @click="deleteCard" class="delete-btn">Delete</button>
    </header>

    <div v-if="loading" class="loading">
      Loading card details...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
      <button @click="loadCard" class="retry-btn">Retry</button>
    </div>

    <div v-else-if="card" class="card-content">
      <!-- Barcode Display -->
      <div class="barcode-section">
        <h2>Barcode</h2>
        <div class="barcode-container">
          <div v-if="barcodeLoading" class="barcode-loading">
            Generating barcode...
          </div>
          <div v-else-if="barcodeError" class="barcode-error">
            {{ barcodeError }}
            <button @click="generateBarcodeImage" class="retry-btn">Retry</button>
          </div>
          <div v-else-if="barcodeDataUrl" class="barcode-display">
            <img :src="barcodeDataUrl" alt="Card barcode" class="barcode-image" />
            <p class="barcode-text">{{ card.card_number }}</p>
          </div>
        </div>
      </div>

      <!-- PIN Section -->
      <div v-if="card.pin" class="pin-section">
        <h2>PIN</h2>
        <div class="pin-container">
          <button @click="togglePinVisibility" class="pin-toggle">
            {{ showPin ? card.pin : '••••' }}
          </button>
          <span class="pin-hint">Tap to {{ showPin ? 'hide' : 'reveal' }}</span>
        </div>
      </div>

      <!-- Card Info -->
      <div class="card-info">
        <div class="info-grid">
          <div class="info-item">
            <label>Balance</label>
            <span class="balance">${{ (card.balance || 0).toFixed(2) }}</span>
          </div>
          <div class="info-item">
            <label>Barcode Format</label>
            <span>{{ card.barcode_format }}</span>
          </div>
          <div class="info-item">
            <label>Added</label>
            <span>{{ formatDate(card.created_at) }}</span>
          </div>
          <div v-if="card.notes" class="info-item">
            <label>Notes</label>
            <span>{{ card.notes }}</span>
          </div>
        </div>
      </div>

      <!-- Update Balance -->
      <div class="balance-update">
        <h3>Update Balance</h3>
        <div class="balance-form">
          <input
            v-model.number="newBalance"
            type="number"
            step="0.01"
            placeholder="Enter new balance"
            :disabled="updating"
          />
          <button @click="updateBalance" :disabled="updating || newBalance === null" class="update-btn">
            {{ updating ? 'Updating...' : 'Update' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCardsStore } from '@/stores/cards';
import { useBarcode } from '@/composables/useBarcode';
import type { Card } from '@/types';

const route = useRoute();
const router = useRouter();
const cardsStore = useCardsStore();
const { generateBarcode, loading: barcodeLoading, error: barcodeError } = useBarcode();

const card = ref<Card | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const showPin = ref(false);
const barcodeDataUrl = ref<string | null>(null);
const newBalance = ref<number | null>(null);
const updating = ref(false);

const loadCard = async () => {
  loading.value = true;
  error.value = null;

  try {
    const cardId = route.params.id as string;
    const cardData = await cardsStore.getCard(cardId);

    if (cardData) {
      card.value = cardData;
      newBalance.value = cardData.balance || 0;
      await generateBarcodeImage();
    } else {
      error.value = 'Card not found';
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load card';
  } finally {
    loading.value = false;
  }
};

const generateBarcodeImage = async () => {
  if (!card.value?.card_number) return;

  try {
    const dataUrl = await generateBarcode(
      card.value.card_number,
      card.value.barcode_format
    );
    barcodeDataUrl.value = dataUrl;
  } catch (err) {
    console.error('Failed to generate barcode:', err);
  }
};

const togglePinVisibility = () => {
  showPin.value = !showPin.value;
  setTimeout(() => {
    showPin.value = false;
  }, 5000); // Auto-hide after 5 seconds
};

const updateBalance = async () => {
  if (newBalance.value === null || !card.value) return;

  updating.value = true;

  try {
    const success = await cardsStore.updateCard(card.value.id, {
      balance: newBalance.value
    });

    if (success) {
      card.value.balance = newBalance.value;
    }
  } catch (err) {
    console.error('Failed to update balance:', err);
  } finally {
    updating.value = false;
  }
};

const deleteCard = async () => {
  if (!card.value) return;

  if (!confirm(`Are you sure you want to delete ${card.value.name}?`)) return;

  const success = await cardsStore.deleteCard(card.value.id);
  if (success) {
    router.push('/');
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

onMounted(() => {
  loadCard();
});
</script>

<style scoped>
.card-detail-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e1e5e9;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header h1 {
  margin: 0;
  color: #333;
  flex: 1;
  text-align: center;
}

.back-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.back-btn {
  background: #6c757d;
  color: white;
}

.back-btn:hover {
  background: #5a6268;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.loading,
.error {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
}

.card-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.barcode-section,
.pin-section,
.card-info,
.balance-update {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.barcode-section h2,
.pin-section h2,
.balance-update h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.barcode-container {
  text-align: center;
}

.barcode-display {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 4px;
  border: 2px solid #e9ecef;
}

.barcode-image {
  max-width: 100%;
  height: auto;
  margin-bottom: 1rem;
}

.barcode-text {
  font-family: monospace;
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.barcode-loading,
.barcode-error {
  padding: 2rem;
  color: #666;
}

.pin-container {
  text-align: center;
}

.pin-toggle {
  background: #007bff;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  letter-spacing: 0.5rem;
  min-width: 150px;
}

.pin-toggle:hover {
  background: #0056b3;
}

.pin-hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.info-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-weight: 500;
  color: #666;
  font-size: 0.9rem;
}

.info-item span {
  color: #333;
  font-size: 1rem;
}

.balance {
  color: #28a745;
  font-weight: bold;
  font-size: 1.5rem !important;
}

.balance-form {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.balance-form input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 4px;
  font-size: 1rem;
}

.balance-form input:focus {
  outline: none;
  border-color: #007bff;
}

.update-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.update-btn:hover:not(:disabled) {
  background: #218838;
}

.update-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.retry-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 1rem;
}

.retry-btn:hover {
  background: #5a6268;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
  }

  .balance-form {
    flex-direction: column;
  }

  .pin-toggle {
    font-size: 1.5rem;
    padding: 0.75rem 1.5rem;
  }
}
</style>