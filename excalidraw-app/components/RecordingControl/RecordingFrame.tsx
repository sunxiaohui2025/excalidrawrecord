import "./RecordingFrame.scss";
import { useRecordingDimensions } from "./useRecordingDimensions";

interface RecordingFrameProps {
  visible: boolean;
  aspectRatio: string;
  countdown?: number;
}

export const RecordingFrame = ({
  visible,
  aspectRatio,
  countdown,
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
        {countdown !== undefined && countdown > 0 && (
          <div className="countdown-wrapper">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
};
