import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory('/cardvault/'),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/CardList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginSSO.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/cards/:id',
      name: 'CardDetail',
      component: () => import('@/views/CardDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cards/add',
      name: 'AddCard',
      component: () => import('@/views/AddCard.vue'),
      meta: { requiresAuth: true }
    }
  ]
});

// Auth guard
router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login' };
  }

  if (to.name === 'Login' && authStore.isAuthenticated) {
    return { name: 'Home' };
  }
});

export default router;