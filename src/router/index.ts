import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import CalendarView from '../views/CalendarView.vue'
import TasksView from '../views/TasksView.vue'
import FinanceView from '../views/FinanceView.vue'
import FamilyView from '../views/FamilyView.vue'
import SettingsView from '../views/SettingsView.vue'
import ReceiptsView from '../views/ReceiptsView.vue'
import OfflineCenterView from '../views/OfflineCenterView.vue'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: CalendarView
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: TasksView
    },
    {
      path: '/finance',
      name: 'finance',
      component: FinanceView
    },
    {
      path: '/receipts',
      name: 'receipts',
      component: ReceiptsView
    },
    {
      path: '/offline',
      name: 'offline',
      component: OfflineCenterView
    },
    {
      path: '/family',
      name: 'family',
      component: FamilyView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
})

export default router
