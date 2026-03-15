import { Footer } from "@excalidraw/excalidraw/index";
import React from "react";

import { isCCDRecordPlusSignedUser } from "../app_constants";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";

export const AppFooter = React.memo(
  ({ onChange }: { onChange: () => void }) => {
    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {!isCCDRecordPlusSignedUser && <EncryptedIcon />}
        </div>
        <div
          style={{
            position: "fixed",
            right: "20px",
            bottom: "60px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            zIndex: 1000,
          }}
        >
          <img
            src="/qrcode_gh.jpg"
            alt="GitHub QR Code"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          />
        </div>
      </Footer>
    );
  },
);
