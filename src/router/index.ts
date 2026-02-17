import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { getSession } from '@/modules/auth/services/auth.service'
import AppLayout from '@/app/AppLayout.vue'

const routes: RouteRecordRaw[] = [
  // Auth routes (public, no nav)
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/modules/auth/views/RegisterView.vue'),
    meta: { public: true },
  },

  // Protected routes (with nav layout)
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/modules/projects/views/ProjectsView.vue'),
      },
      {
        path: 'design-system',
        name: 'design-system',
        component: () => import('@/modules/projects/views/DesignSystemView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const { data: user } = await getSession()
  const isAuthenticated = user !== null
  const isPublicRoute = to.meta.public === true

  if (!isAuthenticated && !isPublicRoute) {
    return { name: 'login' }
  }

  if (isAuthenticated && isPublicRoute) {
    return { name: 'home' }
  }
})

export default router
