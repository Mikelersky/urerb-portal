export default function Button({ children, type = 'button', variant = 'primary', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
