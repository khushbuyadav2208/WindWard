import { useEffect, useRef } from "react";
import { LockKeyhole } from "lucide-react";
export function RefreshDialog({
  token,
  onToken,
  onClose,
  onRefresh,
}: {
  token: string;
  onToken: (value: string) => void;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="refresh-modal"
      aria-labelledby="refresh-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const rect = ref.current!.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <LockKeyhole size={25} />
      <h2 id="refresh-title">Refresh from Elexon</h2>
      <p>
        Refresh requests are protected on public deployments. Enter the token
        configured by the deployment owner. The current dataset stays available
        if refresh fails.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onRefresh();
        }}
      >
        <label>
          Refresh token
          <input
            autoFocus
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => onToken(e.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button
            type="button"
            className="button button-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button-green" type="submit">
            Refresh data
          </button>
        </div>
      </form>
    </dialog>
  );
}
