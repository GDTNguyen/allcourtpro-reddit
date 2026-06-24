type LoadMoreButtonProps = {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  className?: string;
};

export function LoadMoreButton({
  onClick,
  loading,
  disabled = false,
  className = '',
}: LoadMoreButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${className}`}
      onClick={() => void onClick()}
      disabled={disabled || loading}
    >
      {loading ? 'Loading…' : 'Load more'}
    </button>
  );
}
