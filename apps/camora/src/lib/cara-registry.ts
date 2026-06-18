type VoidFn = () => void;

let openFn: VoidFn | null = null;
let closeFn: VoidFn | null = null;
let lumoraActive = false;

export const caraRegistry = {
  register(open: VoidFn, close: VoidFn): VoidFn {
    openFn = open;
    closeFn = close;
    return () => {
      if (openFn === open) openFn = null;
      if (closeFn === close) closeFn = null;
    };
  },

  open(): void {
    if (!lumoraActive) openFn?.();
  },

  close(): void {
    closeFn?.();
  },

  setLumoraActive(v: boolean): void {
    lumoraActive = v;
    if (v) closeFn?.();
  },

  isLumoraActive(): boolean {
    return lumoraActive;
  },
};
