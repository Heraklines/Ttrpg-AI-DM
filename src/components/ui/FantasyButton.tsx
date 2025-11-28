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

    const variants = {
        primary: "w-48 h-14 text-parchment hover:text-white bg-[url('/ui/button-primary.png')] bg-contain bg-center bg-no-repeat drop-shadow-lg hover:drop-shadow-xl active:scale-95",
        secondary: "w-40 h-12 text-parchment/80 hover:text-parchment bg-[url('/ui/button-secondary.png')] bg-contain bg-center bg-no-repeat hover:brightness-110 active:scale-95"
    };

    // If the button images have black backgrounds, we can try to blend them, 
    // but buttons are tricky because they contain text. 
    // Ideally, the images are transparent. 
    // If not, we might need a wrapper. 
    // For now, assuming standard usage.

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            <span className="relative z-10 drop-shadow-md">{children}</span>
        </button>
    );
};
