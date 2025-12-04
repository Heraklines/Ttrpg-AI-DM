import React from 'react';

interface FantasyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    children: React.ReactNode;
}

export const FantasyButton: React.FC<FantasyButtonProps> = ({
    variant = 'primary',
    children,
    className = '',
    ...props
}) => {
    const baseStyles = "relative inline-flex items-center justify-center font-medieval font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    // Clean buttons with gray/checker removed
    const variants = {
        primary: "min-w-[200px] min-h-[80px] px-12 py-5 text-[#1A1714] bg-[url('/ui/button-primary-clean.png')] bg-[length:100%_100%] bg-center bg-no-repeat bg-transparent border-0 hover:brightness-110 hover:-translate-y-0.5 active:brightness-95 active:translate-y-0.5",
        secondary: "min-w-[180px] min-h-[72px] px-10 py-4 text-parchment bg-[url('/ui/button-secondary-clean.png')] bg-[length:100%_100%] bg-center bg-no-repeat bg-transparent border-0 hover:brightness-110 hover:-translate-y-0.5 active:brightness-95 active:translate-y-0.5"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            <span className="relative z-10 drop-shadow-md">{children}</span>
        </button>
    );
};
