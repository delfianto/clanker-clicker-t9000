import type { Rule } from "../../../types/rules";

export const caribbeancomRule: Rule = {
  id: "swallow-aclib-crash-caribbeancom",
  match: ".*",
  pathMatch: "^/caribbeancom-",
  runAt: "start",
  actions: [
    {
      type: "run",
      run: () => {
        const origDefineProperty = Object.defineProperty;
        Object.defineProperty = function (obj, prop, descriptor) {
          if (prop === "aclib") {
            try {
              return origDefineProperty(obj, prop, descriptor);
            } catch {
              return obj;
            }
          }
          return origDefineProperty(obj, prop, descriptor);
        };
      },
    },
  ],
};
