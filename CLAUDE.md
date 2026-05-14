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
    <output_requirements>
    ## Output:
    The main goal is to create two sets of documents:
    - A set of documents with the technical specification of the application, located under `/spec/*`
    - A development plan to get to get to such spec.

    ## Details:
    ### Spec:
    The spec is the technical specification of the system.
    It's rich in technical details.
    It has a main file `spec/spec.md` that contains a brief description of all the components and interactions in the system. In general avoid excessive details in the main spec file such as code, database schemas, flow diagrams, etc. Technical details specific to any of the components of the system are created as a separate file `spec/components` `spec/subsystems` etc... (names based on demand as we go). The mail spec file can and should reference the technical when relevant.
    
    ### Development Plan:
    The development plan can only be started when the spec is mostly ready.
    Some minor changes might still be made to the spec during the creation and refinement of the development plan.
    The development plan is broken down into phases, where each phase has a clear deliverable that can be verified by a human.
    Each phase is further broken down into tasks with sufficient context so that an agent can perform autonomously without reading the entire plan.

    Similary to the spec, the plan has a main file (`plans/master-plan.md`) that must mention all phases at a high level. It must avoid technical details such as code snippets, etc.
    The goal of the master-plan is to get an understanding how we'll progress through the different phases and what we'll be finished in each of them.

    </output_requirements>
    <other_documents>
    As we plan and refine the PoC, we'll also document the system architecture, stack and other technical details under `docs/design-decisions`, `docs/architecture`, etc...
    These are usually documents explaning the rationale behind a decision, diagrams to help understand the architecture, and other **supporting** documents. The source of truth of the current system is `/spec`
    </other_documents>
</context>