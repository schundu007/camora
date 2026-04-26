/* Public types for RoughLayeredDiagram — split into a `.types.ts` file so
   build-time scripts (e.g. apps/frontend/scripts/extract-layered-design.mjs)
   can import the Layer shape without dragging in the React/SVG runtime
   that the renderer itself depends on. */

export interface Layer {
  name: string;
  purpose?: string;
  components?: string[];
}
