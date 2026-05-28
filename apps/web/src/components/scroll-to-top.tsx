'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
};

const smoothScroll = (element: HTMLElement, to: number, duration: number) => {
    const start =
        element.scrollTop || document.documentElement.scrollTop || document.body.scrollTop;
    const change = to - start;
    const increment = 20;
    let currentTime = 0;

    const animateScroll = () => {
        currentTime += increment;
        const val = easeInOutQuad(currentTime, start, change, duration);
        element.scrollTop = val;
        if (currentTime < duration) {
            setTimeout(animateScroll, increment);
        }
    };

    animateScroll();
};

export const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            // Show button when page is scrolled down 300px
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        smoothScroll(document.documentElement, 0, 400); // Scroll to top in 400ms
    };

    return (
        <>
            {isVisible && (
                <Button
                    className="fixed bottom-4 right-4 p-2 transition-opacity duration-300 ease-in-out opacity-50 hover:opacity-80 z-50"
                    onClick={scrollToTop}
                    size="icon"
                    aria-label="Back to top"
                >
                    <ArrowUp className="h-4 w-4" />
                </Button>
            )}
        </>
    );
};
