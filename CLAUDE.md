<context>
    <high_level_context>
        We are building a system to planify and manage the production of a small to medium baking company.
    </high_level_context>
    <current_scope>
        Our short term goal is to build a **PoC** that streamlines the client orders to the production team.
    </current_scope>
    <session_goal>
        This session goal is to make progress in generating the specification files (/spec/*) for this PoC.
    </session_goal>
    <context_for_poc>
    ### Overview
    This PoC looks to optimize the process of receiving client orders and forwarding them to the production line. This process today works as follows:
    1. A Client order is received in natural language (whatsapp or email)
    2. A human processes the order:
        - taking note of it for sales tracking (sales and income tracking are strictly outside of scope of this PoC).
        - "translates" the natural language into the bakery internal product descriptors
        - forwards the request to the production line via whatsapp
    ### Production grouping and delivery date:
    Production is grouped in time slots based on the delivery dates. Production of requests is scheduled to these slots based on availability, which determines the delivery date and when they will be prepared.
    Production slots stop receiving orders some time before they are closed.
    It's possible that the production won't meet the production required for a slot and the portion not produced needs to be carried over to the next slot.
    It's possible that prioritary customers are scheduled to a slot that has already closed it's assignment.
    </context_for_poc>
    <goal_for_poc>
    Fully automate orders taking process for orders comming throuh Whatsapp.
    </goal_for_poc>
</context>
