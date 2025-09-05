# Project Review Dashboard

## Overview

This is a full-stack web application for managing project reviews and code collaboration. The system provides a dashboard interface for managing projects, reviewing code changes, and tracking project history. Built as a modern single-page application with React frontend and Express backend, it features a component-based architecture using shadcn/ui for consistent design and user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with React 18 and TypeScript, utilizing a modern component-based architecture. The UI is constructed with shadcn/ui components built on top of Radix UI primitives, providing accessible and consistent design patterns. State management is handled through Zustand for global application state, with TanStack Query managing server state and caching. The application uses Wouter for client-side routing, providing a lightweight alternative to React Router.

The styling system combines Tailwind CSS with CSS custom properties for theming, supporting both light and dark modes. The application is organized into three main sections: project management, code review, and project history, each with dedicated pages and components.

### Backend Architecture
The server is built with Express.js and follows a modular structure with separate route handlers and storage abstractions. The current implementation includes an in-memory storage layer with interfaces designed for easy migration to persistent databases. The server provides REST API endpoints and includes middleware for request logging and error handling.

The development setup integrates Vite for hot module replacement and build optimization, with conditional middleware loading based on environment. This architecture supports both development and production deployments.

### Data Storage Solutions
The application uses Drizzle ORM with PostgreSQL as the primary database solution, configured for Neon Database hosting. The schema is defined in TypeScript with proper type inference and validation using Zod schemas. The current implementation includes a memory storage adapter for development, with interfaces ready for database integration.

Database migrations are managed through Drizzle Kit, with schema definitions supporting user management and extensible data structures for projects and reviews.

### Authentication and Authorization
The codebase includes foundational user management schema with username/password authentication patterns. Session management is configured with PostgreSQL session storage using connect-pg-simple, though the full authentication implementation is not yet complete.

### External Dependencies
- **Neon Database**: PostgreSQL hosting service for production data storage
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect
- **Radix UI**: Unstyled, accessible UI primitives for component foundation
- **TanStack Query**: Server state management and caching layer
- **Zustand**: Client-side state management for application state
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Vite**: Build tool and development server with HMR support
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Wouter**: Minimalist routing library for client-side navigation