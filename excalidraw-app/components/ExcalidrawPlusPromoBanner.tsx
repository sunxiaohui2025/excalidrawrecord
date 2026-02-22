export const ExcalidrawPlusPromoBanner = ({
  isSignedIn,
  onClick,
}: {
  isSignedIn: boolean;
  onClick?: () => void;
}) => {
  if (onClick) {
    return (
      <div
        className="plus-banner"
        onClick={onClick}
        style={{ cursor: "pointer" }}
      >
        Excalidraw+
      </div>
    );
  }

  return (
    <a
      href={
        isSignedIn
          ? import.meta.env.VITE_APP_PLUS_APP
          : `${
              import.meta.env.VITE_APP_PLUS_LP
            }/plus?utm_source=excalidraw&utm_medium=app&utm_content=guestBanner#excalidraw-redirect`
      }
      target="_blank"
      rel="noopener"
      className="plus-banner"
    >
      Excalidraw+
    </a>
  );
};
