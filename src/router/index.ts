import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import CalendarView from '../views/CalendarView.vue'
import TasksView from '../views/TasksView.vue'
import FinanceView from '../views/FinanceView.vue'
import FamilyView from '../views/FamilyView.vue'
import SettingsView from '../views/SettingsView.vue'
import ReceiptsView from '../views/ReceiptsView.vue'
import OfflineCenterView from '../views/OfflineCenterView.vue'
import AutomationsView from '../views/AutomationsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
      path: '/automations',
      name: 'automations',
      component: AutomationsView
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
      alias: '/offline-center',
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
