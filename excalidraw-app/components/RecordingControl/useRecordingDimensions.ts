import { useState, useEffect } from "react";

export const useRecordingDimensions = (aspectRatio: string) => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    left: 0,
    top: 0,
  });

  useEffect(() => {
    const calculateDimensions = () => {
      const sw = window.innerWidth;
      const sh = window.innerHeight;

      let targetRatio = 16 / 9;
      if (aspectRatio !== "custom") {
        const [w, h] = aspectRatio.split("/").map(Number);
        if (!isNaN(w) && !isNaN(h) && h !== 0) {
          targetRatio = w / h;
        }
      } else {
        targetRatio = sw / sh;
      }

      let cw = sw;
      let ch = sh;

      if (cw / ch > targetRatio) {
        cw = ch * targetRatio;
      } else {
        ch = cw / targetRatio;
      }

      // Ensure even numbers for video encoding
      cw = Math.round(cw / 2) * 2;
      ch = Math.round(ch / 2) * 2;

      const left = (sw - cw) / 2;
      const top = (sh - ch) / 2;

      setDimensions({ width: cw, height: ch, left, top });
    };

    calculateDimensions();
    window.addEventListener("resize", calculateDimensions);

    return () => {
      window.removeEventListener("resize", calculateDimensions);
    };
  }, [aspectRatio]);

  return dimensions;
};
