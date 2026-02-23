import "./RecordingFrame.scss";
import { useRecordingDimensions } from "./useRecordingDimensions";

interface RecordingFrameProps {
  visible: boolean;
  aspectRatio: string;
}

export const RecordingFrame = ({
  visible,
  aspectRatio,
}: RecordingFrameProps) => {
  const { width, height, left, top } = useRecordingDimensions(aspectRatio);

  if (!visible) {
    return null;
  }

  return (
    <div className="recording-frame-overlay">
      <div
        className="recording-frame"
        style={{
          width,
          height,
          left,
          top,
        }}
      >
        <div className="recording-label">REC</div>
      </div>
    </div>
  );
};
