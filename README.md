# Ajay Vemala Portfolio

An original, playable miniature town for Ajay Vemala's portfolio. Drive an expedition buggy to six destinations: About, Experience, Skills, Projects, Cloud, and Contact. Professional information comes from the supplied resume.

Built with React, TypeScript, Three.js, React Three Fiber, Rapier, GSAP, Zustand, Tailwind CSS, and Vite. Models and scenery are procedural geometry; audio is synthesized locally. Fonts and the resume are served locally.

## Start locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build` and preview it with `npm run preview`.

Use Node.js 22 or later. Publish the contents of `dist/` on a static host. The site currently expects to be served at the domain root.

## Explore

- **WASD / arrow keys:** drive and steer.
- **Space:** brake. **Shift:** boost. **R:** reset the vehicle.
- **E:** open a nearby exhibit. **Escape:** close an exhibit or pause.
- **M:** world map. Selecting a destination marks it on the map.
- **Drag / scroll:** rotate the camera / zoom.
- On phones, use the steering, accelerator, reverse, and brake buttons.
- Each exhibit has an optional **Read exhibit text** accessibility view.
- Sound starts after you click **Let's explore**: engine, wind, birds, brakes, and interaction sounds. Toggle it on the introduction, toolbar, or settings; settings also provide volume control.

Visual quality adapts to performance; settings also provide explicit High and Performance modes. A WebGL-capable browser is required. Mobile controls are browser-emulated during automated checks; real-device performance varies.

## Content and implementation

- `src/game/data.ts`: resume facts, project contributions, contact links, and destinations.
- `src/game/World.tsx`: terrain, buildings, landscaping, and static colliders.
- `src/game/Vehicle.tsx`: raycast suspension, wheels, driving, collisions, and camera.
- `src/game/Exhibits.tsx`: world-space information and project navigation.
- `src/game/Reader.tsx`: optional accessible reading dialog.
- `src/App.tsx` / `src/game.css`: loading, introduction, map, settings, and touch controls.

The previous JSX portfolio files are retained for reference but are not used by the TypeScript entry point. No private project screenshots, live URLs, or GitHub profile were supplied, so those links are not invented.

## Checks

`npm run build` checks TypeScript and generates the production bundle.

With `npm run dev -- --host 127.0.0.1` running on port 5173, run `npm run test:e2e`. The browser script checks driving, braking, arrival interaction, menus, six exhibits, map selection, a collision, mobile control input, reading view, and the resume download. Screenshots go into ignored `.test-artifacts/`.

The script uses installed Chrome on Windows. Set `CHROME_PATH` to a different Chrome executable when needed. It uses development modules for state assertions, so run it against the development server.

The résumé download is served from `public/assets/ajay-vemala-resume.pdf`.
