type CuteDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export default function CuteDialog({
  open,
  title,
  message,
  onClose,
}: CuteDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pink-200/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-pink-200 bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-2xl text-pink-500">
          !
        </div>
        <h2 className="text-xl font-bold text-pink-500">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <button
          className="mt-5 rounded-full bg-pink-400 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-500"
          onClick={onClose}
          type="button"
        >
          Okay
        </button>
      </div>
    </div>
  );
}
