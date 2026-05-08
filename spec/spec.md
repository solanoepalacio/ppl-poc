# Pannico Production Line Automation
This project is a **PoC** that streamlines order taking process of a small to medium bakery, taking orders from customers through whatsapp, recording them to a backend and presenting them through a front end application to stakeholders.
At a high level, the system is composed of the following:
- Client Orders pipeline:
    A pipeline to take client orders through whatsapp, structure them and store them on a database.
    This data is exposed through a rest api to serve the admin and production front end applications.
    Price and Payment information is out of scope for the PoC.
    
- Admin application:
    Allows the bakery manager to see the current status of the system and manage essential data.
    * what's currently in line for production?
    * Se and manage client orders:
        - sort/filter by customer, product or production slot
        - edit an order
    * manage the product catalog
        - crud of available items
    * manage the production slots
        - extend and shrink the production slots
- Production line application:
    An application to be used by the workers at the production line
    Probably on a television for visibility of the different employees.
    It shows only the summary of what needs to be produced in the current slot, by units of finished items.
    For PoC there's no feedback from the production line about what production has been completed.
    Manage the list of products that the client can order (no price)

## Subsystems Overview:
### Client Order Pipeline:

### Production Slot & Scheduling:

### Product Catalog:

## Architecture Components:
### Backend:

### Database:

### Admin Application:

### Production Line Application:

### Other...