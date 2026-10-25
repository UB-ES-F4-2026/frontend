# AGENTS.md

## Product

Grupo F4 is a collective investment platform where users can discover, fund, and track investment opportunities.

An opportunity may represent a property, business, startup, or another investable project.

- Keep the interface **investment-type agnostic**.
    
- Use generic concepts such as _opportunity_, _project_, _investment_, and _funding_.
    
- Use category-specific terminology only when relevant to a particular opportunity.
    
- Prioritize accessibility, transparency, and diversification.
    
- Never imply guaranteed returns or risk-free investments.

Read `docs/PRODUCT.md` to understand the business model,
investment mechanisms, domain concepts, and product scope.

Use this document as the primary reference for product behavior.

## Language

The default interface language is Catalan (`ca`); keep user-facing text consistent.

## Design system

Create a modern, trustworthy, and approachable financial interface.

### Visual identity

|Token|Color|
|---|---|
|Background|`#F7F8FA`|
|Surface|`#FFFFFF`|
|Primary text|`#101828`|
|Secondary text|`#667085`|
|Border|`#E4E7EC`|
|Brand|`#172B4D`|
|Accent|`#F5A623`|

- Use navy for brand identity and amber for primary actions and selected highlights.
    
- Use semantic colors for success, warnings, and errors.
    
- Prefer clean typography, subtle borders, restrained shadows, and consistent spacing.
    
- Maintain strong contrast and clear visual hierarchy.
    
- Centralize design tokens rather than hard-coding styles repeatedly.
    
- Avoid excessive decoration, gradients, and visual clutter.
    

### Components

- Use consistent buttons, inputs, cards, badges, and navigation patterns.
    
- Prefer concise labels and clearly identifiable actions.
    
- Display financial figures prominently with consistent formatting.
    
- Always accompany funding progress indicators with numerical values.
    
- Use a consistent outline icon style, preferably Lucide.
    
- Use relevant imagery without favoring any particular investment category.
    

## Responsive design

Follow a **mobile-first** approach while providing a fully optimized desktop experience.

- Start with small-screen layouts and enhance them using Tailwind breakpoints.
    
- Adapt layout composition and information density to larger screens rather than merely stretching mobile components.
    
- Ensure comfortable touch targets, readable text, and accessible navigation.
    
- Avoid unintended horizontal scrolling.
    
- Prefer CSS Grid and Flexbox for responsive layouts.
    
- Maintain consistent functionality across screen sizes.
    

## Frontend stack

- React 19
    
- React Router 7
    
- Tailwind CSS 4
    
- HeroUI 3 (`@heroui/react`, `@heroui/styles`)
    
- Zustand 5
    

### Implementation guidelines

- **HeroUI first:** Prefer existing HeroUI components over custom implementations of standard UI elements.
    
- **Tailwind:** Use utility classes for layouts, responsive behavior, and styling.
    
- **Theming:** Keep Tailwind and HeroUI styles consistent through shared design tokens.
    
- **Reusable components:** Extract components for recurring product concepts and interaction patterns.
    
- **State:** Prefer local React state; use Zustand when state must be shared across unrelated components.
    
- **Routing:** Use React Router for navigation.
    
- **Accessibility:** Preserve semantic HTML, keyboard navigation, visible focus states, and accessible form feedback.
    
- Avoid unnecessary dependencies, abstractions, and duplicated functionality.
    

## Content and UX

- Write concise, clear, and professional copy.
    
- Prefer concrete information over promotional language.
    
- Avoid unsupported claims about security, profitability, or project verification.
    
- Show estimated returns, investment risks, and funding status with unambiguous labels.
    
- Associate validation errors with their corresponding fields.
    
- Provide clear feedback for loading, success, error, and empty states.
    
- Do not request information unrelated to the current user flow.
    
- Keep forms focused and divide them into steps when this improves usability.
    
- Never add unnecessary friction or interactions.
    

## Design consistency

Before introducing a new component or pattern:

1. Check whether HeroUI or an existing project component already covers the requirement.
    
2. Follow the established colors, typography, spacing, and interaction patterns.
    
3. Verify the design on both mobile and desktop.
    
4. Ensure the interface remains appropriate for different investment categories.
    

Prefer simple, consistent solutions over unnecessary visual or architectural complexity.

## Project documentation

### User stories

- User stories are defined in `docs/user-stories/`.
- User Story files follow the naming convention `USXX-Y.md`, where XX is a two-digit epic number and Y is the story number.
- Before implementing or modifying a feature, read its corresponding User Story.
- Treat the functional specification, acceptance criteria, and scope exclusions as the source of truth for feature requirements.
- Do not introduce functionality explicitly excluded by the User Story unless requested.

### Mockups

- Mockups are stored in `docs/mockups/` and organized by User Story.
- Each User Story maps to the mockup directory `docs/mockups/US<XX>-<Y>/`.
- For example, `docs/user-stories/US01-6.md` maps to `docs/mockups/US01-6/`.
- Mockups are HTML files (`*.html`) representing the intended interface.
- Before implementing or modifying a UI feature, inspect all HTML mockups associated with its User Story.
- Follow the mockups for visual structure, layout, and styling, while using the User Story to determine functional behavior.
- Mockups are visual references, not production code. Implement the actual interface using the project's frontend stack.
- If a mockup conflicts with the User Story's functional requirements, prioritize the User Story.
