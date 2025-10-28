import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					hover: 'hsl(var(--secondary-hover))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				bgc: {
					DEFAULT: 'hsl(var(--bgc-blue))',
					foreground: 'hsl(var(--bgc-blue-foreground))',
				},
				kent: {
					DEFAULT: 'hsl(var(--kent-orange))',
					foreground: 'hsl(var(--kent-orange-foreground))',
				},
				google: {
					DEFAULT: 'hsl(var(--google-gray))',
					foreground: 'hsl(var(--google-gray-foreground))',
				},
				orsh: {
					DEFAULT: "hsl(var(--orsh-primary))",
					secondary: "hsl(var(--orsh-secondary))",
					energy: "hsl(var(--orsh-energy))",
					success: "hsl(var(--orsh-success))",
					ocean: "hsl(var(--orsh-ocean))",
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				'none': '0px',
				'sm': '0.25rem',    /* 4px */
				'DEFAULT': '0.375rem', /* 6px */
				'md': '0.5rem',     /* 8px */
				'lg': '0.75rem',    /* 12px */
				'xl': '1rem',       /* 16px */
				'2xl': '1.5rem',    /* 24px */
				'3xl': '2rem',      /* 32px */
				'full': '9999px'
			},
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1rem' }],
				'sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'base': ['1rem', { lineHeight: '1.5rem' }],
				'lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'2xl': ['1.5rem', { lineHeight: '2rem' }],
				'3xl': ['1.875rem', { lineHeight: '2.25rem' }],
				'4xl': ['2.25rem', { lineHeight: '2.5rem' }],
				'5xl': ['3rem', { lineHeight: '1' }],
				'6xl': ['3.75rem', { lineHeight: '1' }],
				'7xl': ['4.5rem', { lineHeight: '1' }],
				'8xl': ['6rem', { lineHeight: '1' }],
				'9xl': ['8rem', { lineHeight: '1' }],
			},
			spacing: {
				'18': '4.5rem',   /* 72px */
				'88': '22rem',    /* 352px */
				'120': '30rem',   /* 480px */
			},
			boxShadow: {
				'fluent-xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
				'fluent-sm': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
				'fluent-md': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
				'fluent-lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
				'fluent-xl': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
				'fluent-2xl': '0 25px 50px rgba(0, 0, 0, 0.15)',
			},
			backdropBlur: {
				'fluent': '30px',
				'xs': '2px',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0', opacity: '0' },
					to: { height: 'var(--radix-accordion-content-height)', opacity: '1' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
					to: { height: '0', opacity: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.9)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(100%)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-in-right': {
					'0%': { opacity: '0', transform: 'translateX(100px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'reveal': {
					'0%': { opacity: '0', transform: 'translateY(30px) scale(0.95)' },
					'100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'pulse-subtle': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.8' }
				},
			'gradient-shift': {
				'0%, 100%': { 
					transform: 'translate(0%, 0%) scale(1)',
					opacity: '0.6'
				},
				'33%': { 
					transform: 'translate(15%, -12%) scale(1.15)',
					opacity: '0.7'
				},
				'66%': { 
					transform: 'translate(-12%, 15%) scale(1.08)',
					opacity: '0.65'
				}
			},
			'gradient-horizontal': {
				'0%, 100%': { 
					transform: 'translateX(-30%) scale(1)',
				},
				'50%': { 
					transform: 'translateX(30%) scale(1.1)',
				}
			},
			'gradient-vertical': {
				'0%, 100%': { 
					transform: 'translateY(-25%) scale(1)',
				},
				'50%': { 
					transform: 'translateY(25%) scale(1.08)',
				}
			},
			'gradient-sweep': {
				'0%': { 
					transform: 'translateX(-100%) translateY(-20%) rotate(-5deg)',
					opacity: '0.3'
				},
				'50%': { 
					transform: 'translateX(0%) translateY(0%) rotate(0deg)',
					opacity: '0.5'
				},
				'100%': { 
					transform: 'translateX(100%) translateY(20%) rotate(5deg)',
					opacity: '0.3'
				}
			},
				'gradient-pulse': {
					'0%, 100%': { 
						transform: 'scale(1)',
						opacity: '0.5'
					},
					'50%': { 
						transform: 'scale(1.15)',
						opacity: '0.7'
					}
				},
				'gradient-color-morph': {
					'0%': { filter: 'hue-rotate(0deg)' },
					'25%': { filter: 'hue-rotate(90deg)' },
					'50%': { filter: 'hue-rotate(180deg)' },
					'75%': { filter: 'hue-rotate(270deg)' },
					'100%': { filter: 'hue-rotate(360deg)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
				'accordion-up': 'accordion-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
				'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
				'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
				'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
				'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
				'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
				'reveal': 'reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
				'float': 'float 3s ease-in-out infinite',
				'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
				'spin-slow': 'spin 6s linear infinite',
			'gradient-shift': 'gradient-shift 12s ease infinite',
			'gradient-horizontal': 'gradient-horizontal 14s ease-in-out infinite',
			'gradient-vertical': 'gradient-vertical 16s ease-in-out infinite',
			'gradient-pulse': 'gradient-pulse 13s ease-in-out infinite',
			'gradient-sweep': 'gradient-sweep 20s ease-in-out infinite',
			'gradient-color-morph': 'gradient-color-morph 18s linear infinite',
			'gradient-color-morph-fast': 'gradient-color-morph 15s linear infinite',
			'gradient-color-morph-slow': 'gradient-color-morph 22s linear infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;