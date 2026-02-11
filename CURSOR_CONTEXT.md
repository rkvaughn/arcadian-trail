# Project Name: Arcadian Trail

## Overview
You are helping develop a 2D game inspired by *Oregon Trail*, but set in a near-future scenario where players guide climate migrants fleeing high-risk areas (e.g. flood zones, wildfire-prone regions, drought-scarred farmland). Players must manage limited resources, survive peril-specific events, and adapt to dynamically sourced climate data.

## Objective
Build a side-scrolling or decision-tree-based game where players choose a starting location and must journey toward a safer region, facing climate peril challenges along the way.

## Tone & Style Preferences
- Use technical precision when discussing APIs, game mechanics, or climate data.
- Keep code snippets production-ready and modular for ease of testing in Cursor/VScode.
- Assume game dev knowledge equivalent to an advanced beginner or intermediate JavaScript/HTML/CSS developer.
- Use pop culture or playful references (in moderation) to lighten technical moments.

## Gameplay Features
- Players begin in a climate-risky location (e.g., Miami, Phoenix, Sacramento Delta).
- Players choose a destination (e.g., Minneapolis, Buffalo, Boise).
- The game generates route options and environmental obstacles using real climate data.
- Game events include:
  - Wildfires
  - Hurricanes
  - Floods
  - Drought & food insecurity
  - Heatwave health effects
- Resource management includes:
  - Fuel, water, food, shelter, family morale
  - Inventory of supplies (like meds, insulation, solar panels)
- Choices impact outcomes (e.g., detour = more fuel use but avoids a fire)
- Characters have traits (resilience, health, age) that affect decision outcomes.

## Technical Goals
- Integrate real climate data via public APIs (NASA POWER, OpenWeatherMap, etc.)
- Store precomputed regional risk profiles in a backend DB (Postgres or simple JSON for now)
- Use HTML5 canvas or Phaser.js for 2D side-scroller OR Twine/Ink-style decision-tree for text-based version
- Eventually connect to a leaderboard or scoring system (based on survival, adaptation success, etc.)

## ChatGPT Task Types
Ask ChatGPT to:
1. Write modular game logic in JavaScript, including:
   - Character setup
   - Event generation
   - Resource tracking
2. Connect climate APIs and explain how to extract, clean, and store relevant data.
3. Generate narrative event text (e.g., "Your route through Nebraska is interrupted by a freak hailstorm").
4. Design UI mockups or layouts for a side-scroller map or inventory screen.
5. Help build a backend to store region risk profiles and adaptation modifiers.
6. Tune difficulty curves by adjusting resource burn rates and event frequency.
7. Debug integration between game logic and data fetching.
8. Suggest data visualizations for tracking player journey and climate threats.
9. Propose names, slogans, and promotional art prompts.

## Preferred Tools & Stack
- JavaScript (game logic)
- HTML/CSS (frontend)
- OpenWeatherMap / NASA POWER / NOAA APIs (climate data)
- Cursor IDE (code development)
- Supabase / Firebase / local storage (early backend)
- Phaser.js or pure canvas (side scroller)
- Twine or Ink (alt: text-based version)

## Sample Prompt to Start the Project
"Create a JavaScript-based game where the player guides a family of climate migrants from Miami to Minneapolis. Along the journey, use real climate data from the OpenWeatherMap API to determine event probabilities such as floods or extreme heat. Begin with a basic resource tracking system and one peril: extreme heat."