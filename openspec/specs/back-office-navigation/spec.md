# back-office-navigation Specification

## Purpose

Defines how the back office is structured around its three views and the persistent navigation the manager uses to move between them, and how this navigation is kept off the customer-facing order form.

## Requirements

### Requirement: Back office lands on the orders-by-day view
The back office SHALL present the orders-by-day view as its landing destination. There SHALL NOT be a separate back-office home page; navigating to the back-office root SHALL result in the orders-by-day view.

#### Scenario: Opening the back office shows orders by day
- **WHEN** the manager navigates to the back-office root
- **THEN** the orders-by-day view is shown

#### Scenario: No standalone home page
- **WHEN** the manager is anywhere in the back office
- **THEN** no standalone landing page distinct from the three views is presented

### Requirement: Persistent navigation across back-office views
The back office SHALL present a persistent navigation, visible on every back-office view, with one link to each of the three views labelled **Órdenes** (orders by day), **Crear link** (link generator), and **Producción** (production totals). Selecting a link SHALL navigate to that view. The navigation SHALL indicate which view is currently active.

#### Scenario: Navigation is present on each view
- **WHEN** the manager is on any of the orders, link-generator, or production views
- **THEN** the navigation is shown with links to Órdenes, Crear link, and Producción

#### Scenario: Navigating between views
- **WHEN** the manager selects a navigation link
- **THEN** the corresponding view is shown

#### Scenario: Active view is indicated
- **WHEN** the manager is on one of the back-office views
- **THEN** the navigation indicates that view as the active one

### Requirement: Customer order form excludes back-office navigation
The persistent back-office navigation SHALL NOT appear on the customer-facing order form.

#### Scenario: Order form has no back-office navigation
- **WHEN** a customer opens their order form via a link
- **THEN** the back-office navigation is not shown
