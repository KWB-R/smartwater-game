type SecondaryRewardToastProps = {
  message: string;
};

export function SecondaryRewardToast({ message }: SecondaryRewardToastProps) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2.5 text-[0.9rem] font-semibold text-slate-50 animate-level-toast-in shadow-lg landscape:bottom-4 [.level-game_&]:landscape:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0))]"
      role="status"
    >
      {message}
    </div>
  );
}
