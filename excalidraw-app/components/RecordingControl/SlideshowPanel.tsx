import React, { useState } from "react";
import clsx from "clsx";

import { SlideshowIcon, AddIcon } from "./Icons";
import "./SlideshowPanel.scss";

export const SlideshowPanel = () => {
  const [slides, setSlides] = useState([
    { id: 1, title: "Slide 1" },
    { id: 2, title: "Slide 2" },
    { id: 3, title: "Slide 3" },
  ]);
  const [activeSlide, setActiveSlide] = useState(1);

  const addSlide = () => {
    const newId = slides.length + 1;
    setSlides([...slides, { id: newId, title: `Slide ${newId}` }]);
    setActiveSlide(newId);
  };

  return (
    <div className="slideshow-panel">
      <div className="slides-container">
        {slides.map((slide) => (
          <div
            key={slide.id}
            className={clsx("slide-thumbnail", {
              active: activeSlide === slide.id,
            })}
            onClick={() => setActiveSlide(slide.id)}
            title={slide.title}
          >
            {activeSlide === slide.id ? (
              <span>{slide.id}</span>
            ) : (
              <span style={{ fontSize: "12px" }}>{slide.id}</span>
            )}
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                opacity: 0.3,
              }}
            >
              {SlideshowIcon}
            </div>
          </div>
        ))}
      </div>
      <button className="add-slide-btn" onClick={addSlide} title="新增幻灯片">
        {AddIcon}
      </button>
    </div>
  );
};
