'use client';

import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ScrollToTopButtonProps {
    show: boolean;
    onClick: () => void;
}

export function ScrollToTopListButton({ show, onClick }: ScrollToTopButtonProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                    transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                    }}
                    className="absolute top-2 right-2 z-10"
                >
                    <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full shadow-lg px-4 gap-2 bg-background/85 backdrop-blur-sm border hover:scale-105 transition-transform"
                        onClick={onClick}
                    >
                        <ChevronUp className="h-4 w-4" />
                        <span>Top</span>
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
