<template>
  <div class="add-card-container">
    <header class="header">
      <button @click="$router.back()" class="back-btn">← Back</button>
      <h1>Add New Card</h1>
      <div></div> <!-- Spacer for layout -->
    </header>

    <div class="add-card-content">
      <form @submit.prevent="handleSubmit" class="card-form">
        <div class="form-group">
          <label for="name">Card Name *</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            required
            placeholder="e.g., Starbucks, Amazon, Target"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="card_number">Card Number *</label>
          <input
            id="card_number"
            v-model="formData.card_number"
            type="text"
            required
            placeholder="Enter card number"
            :disabled="loading"
          />
          <small class="help-text">This will be encrypted and stored securely</small>
        </div>

        <div class="form-group">
          <label for="pin">PIN (optional)</label>
          <input
            id="pin"
            v-model="formData.pin"
            type="text"
            placeholder="Enter PIN if required"
            :disabled="loading"
          />
          <small class="help-text">Leave blank if card doesn't require a PIN</small>
        </div>

        <div class="form-group">
          <label for="barcode_format">Barcode Format</label>
          <select
            id="barcode_format"
            v-model="formData.barcode_format"
            :disabled="loading"
          >
            <option value="CODE_128">Code 128</option>
            <option value="QR_CODE">QR Code</option>
            <option value="EAN_13">EAN-13</option>
            <option value="UPC_A">UPC-A</option>
          </select>
        </div>

        <div class="form-group">
          <label for="balance">Current Balance</label>
          <input
            id="balance"
            v-model.number="formData.balance"
            type="number"
            step="0.01"
            placeholder="0.00"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="notes">Notes (optional)</label>
          <textarea
            id="notes"
            v-model="formData.notes"
            placeholder="Any additional notes about this card"
            :disabled="loading"
          ></textarea>
        </div>

        <div v-if="error" class="error">
          {{ error }}
        </div>

        <div class="form-actions">
          <button type="button" @click="$router.back()" class="cancel-btn" :disabled="loading">
            Cancel
          </button>
          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? 'Adding Card...' : 'Add Card' }}
          </button>
        </div>
      </form>

      <!-- Scanner Section -->
      <div class="scanner-section">
        <h3>Or scan a barcode</h3>
        <div class="scanner-placeholder">
          <div class="scanner-icon">📷</div>
          <p>Camera scanning coming soon</p>
          <small>For now, manually enter the card number above</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useCardsStore } from '@/stores/cards';
import type { CreateCardData } from '@/types';

const router = useRouter();
const cardsStore = useCardsStore();

const loading = ref(false);
const error = ref<string | null>(null);

const formData = reactive<CreateCardData>({
  name: '',
  card_number: '',
  pin: '',
  barcode_format: 'CODE_128',
  balance: 0,
  notes: '',
});

const handleSubmit = async () => {
  error.value = null;
  loading.value = true;

  try {
    // Clean up the data
    const cardData: CreateCardData = {
      name: formData.name.trim(),
      card_number: formData.card_number.trim(),
      pin: formData.pin?.trim() || undefined,
      barcode_format: formData.barcode_format,
      balance: formData.balance || undefined,
      notes: formData.notes?.trim() || undefined,
    };

    const success = await cardsStore.addCard(cardData);

    if (success) {
      router.push('/');
    } else {
      error.value = cardsStore.error || 'Failed to add card';
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to add card';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.add-card-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e1e5e9;
  padding: 1rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header h1 {
  margin: 0;
  color: #333;
  text-align: center;
}

.back-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.back-btn:hover {
  background: #5a6268;
}

.add-card-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: grid;
  gap: 2rem;
}

.card-form {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-of-type {
  margin-bottom: 2rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

input,
select,
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #007bff;
}

input:disabled,
select:disabled,
textarea:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.help-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: #666;
}

.error {
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn,
.submit-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  min-width: 120px;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover:not(:disabled) {
  background: #5a6268;
}

.submit-btn {
  background: #28a745;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #218838;
}

.cancel-btn:disabled,
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scanner-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.scanner-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.scanner-placeholder {
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 3rem 2rem;
  color: #666;
}

.scanner-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.scanner-placeholder p {
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.scanner-placeholder small {
  color: #888;
}

@media (max-width: 768px) {
  .add-card-content {
    padding: 1rem;
    gap: 1rem;
  }

  .card-form {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .cancel-btn,
  .submit-btn {
    width: 100%;
  }
}
</style>