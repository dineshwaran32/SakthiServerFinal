/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        tertiary: 'var(--tertiary)',
        success: 'var(--success)',
        error: 'var(--error)',
        background: 'var(--background)',
        surface: 'var(--surface)',
        surfaceVariant: 'var(--surface-variant)',
        successContainer: 'var(--success-container)',
        onSurface: 'var(--on-surface)',
        onSurfaceVariant: 'var(--on-surface-variant)',
        onPrimary: 'var(--on-primary)',
        primaryContainer: 'var(--primary-container)',
        secondaryContainer: 'var(--secondary-container)',
      },
    },
  },
  plugins: [],
};
