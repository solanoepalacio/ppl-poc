# Pannico Production Line Automation
This project is a **PoC** that streamlines order taking process of a small to medium bakery, taking orders from customers through whatsapp, recording them to a backend and presenting them through a front end application to stakeholders.
The orders are B2B for a whitelisted set of clients.

## User Stories:
1. As a client I want to be able to start an order through whatsapp and decide on the items of the order with a good ux. 
2. As a production line worker I want to able to see how many of each item I need to produce today.
3. As a manager I want to be able to manage orders

## Edge Cases:

## System Overview:
At a high level, the system is composed of the following subsystems:

### Client Orders pipeline:
A pipeline to take client orders through whatsapp, structure them and store them on a database.
The pipeline has a conversational surface, where an agent handles greetings and questions but redirects to a **Custom Order Form** for the customer to complete the order.
The communication with the customer through whatsapp is two-way.
The order data is exposed through a rest api to serve the admin and production line front end applications.
Price, Payment and Stock information is out of scope for the PoC.

    
### Admin application:
Allows the bakery manager to see the current status of the system and manage essential data.
- what's currently in line for production
- See and manage client orders:
    - manually crud an order
- manage the product catalog
    - crud of available items
- manage the production slots
    - Mark production slots as closed
    - Move orders between production slots
- Connecting the system to whastapp using a QR code

### Production line application:
An application to be used by the workers at the production line
Probably displayed on a television for general visibility of the production line staff.
It shows only the summary of what needs to be produced in the current slot, by units of finished items.
For PoC there's no feedback from the production line about what production has been completed.

 <!-- TODO: Fill the titles below with medium level description of the different subsystems and components. Each of them can point to a detailed technical specification of one or multiple components. -->
## Subsystems Overview:

### Client Order Pipeline:

#### Token Based Order Form

#### Production Slot & Scheduling:
     
Each day is represented in the system by a production slot.
Incoming orders are routed to the present day
### Product Catalog Management:

### Order Management:

### Product Line Application:

### Bot Whatsapp Auth:
