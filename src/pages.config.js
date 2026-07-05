/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import React from 'react';
import CostDatabase from './pages/CostDatabase';
import Home from './pages/Home';
import Notifications from './pages/Notifications';
import PalladioPricing from './pages/PalladioPricing';
import Projects from './pages/Projects';
import SavedChats from './pages/SavedChats';
import SubscriptionManagement from './pages/SubscriptionManagement';
import UserProfile from './pages/UserProfile';
import __Layout from './Layout.jsx';

const ArchiSketch = React.lazy(() => import('./pages/ArchiSketch'));
const PalladioAssess = React.lazy(() => import('./pages/PalladioAssess'));
const PalladioEstimator = React.lazy(() => import('./pages/PalladioEstimator'));
const PalladioFloorplan = React.lazy(() => import('./pages/PalladioFloorplan'));
const PalladioPlanner = React.lazy(() => import('./pages/PalladioPlanner'));
const PalladioProperty = React.lazy(() => import('./pages/PalladioProperty'));
const Render3D = React.lazy(() => import('./pages/Render3D'));


export const PAGES = {
    "ArchiSketch": ArchiSketch,
    "CostDatabase": CostDatabase,
    "Home": Home,
    "Notifications": Notifications,
    "PalladioAssess": PalladioAssess,
    "PalladioEstimator": PalladioEstimator,
    "PalladioFloorplan": PalladioFloorplan,
    "PalladioPlanner": PalladioPlanner,
    "PalladioPricing": PalladioPricing,
    "PalladioProperty": PalladioProperty,
    "Projects": Projects,
    "Render3D": Render3D,
    "SavedChats": SavedChats,
    "SubscriptionManagement": SubscriptionManagement,
    "UserProfile": UserProfile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};