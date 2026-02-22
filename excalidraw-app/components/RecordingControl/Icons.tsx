import React from "react";

type Opts = {
  width?: number;
  height?: number;
  mirror?: true;
} & React.SVGProps<SVGSVGElement>;

export const createIcon = (
  d: string | React.ReactNode,
  opts: number | Opts = 512,
) => {
  const {
    width = 512,
    height = width,
    mirror,
    style,
    ...rest
  } = typeof opts === "number" ? ({ width: opts } as Opts) : opts;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      className={mirror ? "rtl-mirror" : undefined}
      style={style}
      {...rest}
    >
      {typeof d === "string" ? <path fill="currentColor" d={d} /> : d}
    </svg>
  );
};

const tablerIconProps: Opts = {
  width: 24,
  height: 24,
  fill: "none",
  strokeWidth: 2,
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const GearIcon = createIcon(
  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  { ...tablerIconProps, width: 24, height: 24 },
);

export const TeleprompterIcon = createIcon(
  <path d="M14 3v4a1 1 0 0 0 1 1h4M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2zM9 9h1M9 13h6M9 17h6" />,
  { ...tablerIconProps, width: 24, height: 24 },
);

export const RecordIcon = createIcon(
  <circle cx="12" cy="12" r="7" fill="currentColor" stroke="none" />,
  { ...tablerIconProps, width: 24, height: 24 },
);

export const SlideshowIcon = createIcon(
  <path d="M15 17.5l-3 -4.5l-3 4.5M4 6h16v12h-16z" />,
  { ...tablerIconProps, width: 24, height: 24 },
);

export const PlayIcon = createIcon(
  <path d="M7 4v16l13 -8z" fill="currentColor" stroke="none" />,
  { ...tablerIconProps, width: 24, height: 24 },
);

export const PauseIcon = createIcon(
  <path d="M6 5h4v14h-4zm8 0h4v14h-4z" fill="currentColor" stroke="none" />,
  { ...tablerIconProps, width: 24, height: 24 },
);

export const CloseIcon = createIcon(<path d="M18 6l-12 12M6 6l12 12" />, {
  ...tablerIconProps,
  width: 24,
  height: 24,
});

export const AddIcon = createIcon(<path d="M12 5v14M5 12h14" />, {
  ...tablerIconProps,
  width: 24,
  height: 24,
});

export const CheckIcon = createIcon(<path d="M5 12l5 5l10 -10" />, {
  ...tablerIconProps,
  width: 24,
  height: 24,
});

export const StopIcon = createIcon(
  <rect x="5" y="5" width="14" height="14" fill="currentColor" stroke="none" />,
  { ...tablerIconProps, width: 24, height: 24 },
);

export const CursorIcon = createIcon(
  <path
    d="M6 3l6 14l-4-2l-3 5l-2-1l3-5l-6-2z"
    fill="currentColor"
    stroke="none"
  />,
  { ...tablerIconProps, width: 24, height: 24 },
);
