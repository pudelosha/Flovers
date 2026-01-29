import React, { useMemo, useRef } from "react";
import { motion, useAnimation, useInView, useReducedMotion } from "framer-motion";

export default function Reveal({ children, className = "", delay = 0, y = 18, amount = 0.28 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const controls = useAnimation();
  const inView = useInView(ref, { amount, margin: "0px 0px -10% 0px" });

  const hidden = useMemo(() => ({ opacity: 0, y: reduce ? 0 : y }), [reduce, y]);
  const shown = useMemo(() => ({ opacity: 1, y: 0 }), []);

  React.useEffect(() => {
    if (reduce) {
      controls.set({ opacity: 1, y: 0 });
      return;
    }
    controls.start(inView ? shown : hidden);
  }, [controls, inView, reduce, shown, hidden]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={hidden}
      animate={controls}
      transition={{
        duration: 0.55,
        ease: "easeOut",
        delay: reduce ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}