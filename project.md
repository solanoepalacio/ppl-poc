# Pannico Production Line Automation
## Overview:
### Context:
This PoC is an experiment to optimize the process of receiving client orders and forwarding them to the production line. This process today works as follows:
1. A Client order is received in natural language through whatsapp
2. A human processes the order:
    - taking note of it for sales tracking
    - "translates" the natural language into the bakery internal product descriptors
    - forwards the request to the production line via whatsapp

### Goal:
This project is a **PoC** that helps taking orders in a structured manner and show them to the production line.
The concept we want to prove is that if the user has a zero friction UI to order (no login, no prices, no payment) it will be easier to receive orders through the form instead of taking orders in natural language.

### Solution Description:
We'll create a simple system that allows customers to create orders easily by creating and sending them a custom url that includes a short lived token that associates an order taken with the customer.
Upon visiting the custom url, we'll use the token to render a minimal UI where they can simply state what they want to order (no login, no price shown, no payment process -- order is confirmed directly).
Automatic confirmation of the order is possible because:
- Orders are currently taken through whatsapp and come from trusted parties (Orders are added to the customer account and invoiced monthly. Tracking sales and invoicing is out of scope for this PoC)
- The order token/custom url will be created manually by the bakery manager using its back office page.

The high level description of the workflow intended goes as follows:
1. A customer starts communicating through whatsapp
2. If the manager sees they want to make an order, it uses the back-office to create a url and token using the client phone number
3. The manger sends the url to the customer
4. The customer fills the order form and confirms**
5. The order is stored on the backend, the token is used to know what customer made the order
6. The order can be seen by the bakery manager on its back-office, by phone number

**note about point 4: the simple UI to make the order must include a button that will let the user mark that they prefer to continue making the order through whatsapp.
