import React from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from '@/pages/bd-task/Layout';
import Workbench from '@/pages/bd-task/workbench/TaskWorkbenchPage';
import ParentTaskList from '@/pages/bd-task/ParentTaskList';
import ShopList from '@/pages/bd-task/ShopListPage';
import SubTaskList from '@/pages/bd-task/SubTaskList';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import EntityTaskList from '@/pages/bd-task/components/EntityTaskListPage';

const router = createHashRouter([
  { path: '/', element: <Navigate to="/bd-task" replace /> },
  { path: '/bd-task', element: <Layout><Workbench /></Layout> },
  { path: '/bd-task/batch-list', element: <Layout><ParentTaskList /></Layout> },
  { path: '/bd-task/list', element: <Navigate to="/bd-task/batch-list" replace /> },
  { path: '/bd-task/shops', element: <Layout><ShopList /></Layout> },
  { path: '/bd-task/shops/:shopId', element: <Layout><EntityTaskList /></Layout> },
  { path: '/bd-task/brands/:brandId', element: <Layout><EntityTaskList contactObjectType={CONTACT_OBJECT_TYPE.BRAND} /></Layout> },
  { path: '/bd-task/:parentTaskId', element: <Layout><SubTaskList /></Layout> },
  { path: '*', element: <Navigate to="/bd-task" replace /> },
]);
export default function AppRouter() { return <RouterProvider router={router} />; }
