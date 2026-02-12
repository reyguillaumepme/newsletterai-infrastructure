
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TestimonialCard, { Testimonial } from './TestimonialCard';

const TESTIMONIALS: Testimonial[] = [
    {
        id: '1',
        text: "J'ai divisé mon temps de rédaction par 10. L'IA comprend exactement le ton de ma marque, c'est bluffant.",
        author: "Sophie M.",
        role: "Content Manager",
        initial: "S",
        avatarColor: "bg-purple-100 text-purple-600",
        bgGradient: "#f3e8ff" // Purple
    },
    {
        id: '2',
        text: "Les designs sont superbes, mes patients adorent recevoir mes conseils nutrition chaque semaine.",
        author: "Amina A.",
        role: "Diététicienne",
        initial: "A",
        avatarColor: "bg-blue-100 text-blue-600",
        bgGradient: "#dbeafe" // Blue
    },
    {
        id: '3',
        text: "Le taux d'ouverture a bondi de 15% depuis que j'utilise NwsletterIA. L'optimisation est réelle.",
        author: "Julie R.",
        role: "Marketing Director",
        initial: "J",
        avatarColor: "bg-green-100 text-green-600",
        bgGradient: "#dcfce7" // Green
    },
    {
        id: '4',
        text: "L'interface est super intuitive. En 5 minutes, ma newsletter est prête, testée et envoyée.",
        author: "Marc D.",
        role: "Freelance",
        initial: "M",
        avatarColor: "bg-orange-100 text-orange-500",
        bgGradient: "#ffedd5" // Orange
    }
];

const swipeVariants = {
    enter: (direction: number) => ({
        scale: 0.95,
        y: -35,
        opacity: 0.6,
        zIndex: 2,
        x: 0,
    }),
    center: {
        zIndex: 3,
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as any
        }
    },
    exit: (direction: number) => ({
        zIndex: 3,
        x: direction > 0 ? 350 : -350,
        opacity: 0,
        scale: 1,
        rotate: direction > 0 ? 10 : -10,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as any
        }
    })
};

export default function TestimonialDeck() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const handleNext = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    };

    const handlePrev = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    };

    const activeItem = TESTIMONIALS[currentIndex];
    const nextItem = TESTIMONIALS[(currentIndex + 1) % TESTIMONIALS.length];
    const nextNextItem = TESTIMONIALS[(currentIndex + 2) % TESTIMONIALS.length];
    const nextNextNextItem = TESTIMONIALS[(currentIndex + 3) % TESTIMONIALS.length];

    return (
        <div className="relative w-full max-w-sm h-[380px] mx-auto flex items-center justify-center perspective-[1000px]">

            {/* Background Stack 3 */}
            <motion.div
                key={`bg3-${nextNextNextItem.id}`}
                className="absolute inset-x-0 mx-auto w-full h-full pointer-events-none max-w-sm"
                initial={{ scale: 0.8, y: -75, opacity: 0 }}
                animate={{
                    scale: 0.85,
                    y: -75,
                    zIndex: 0,
                    opacity: 0.3
                }}
                transition={{ duration: 0.4 }}
            >
                <TestimonialCard
                    data={nextNextNextItem}
                    onNext={() => { }}
                    onPrev={() => { }}
                    isBackground={true}
                />
            </motion.div>

            {/* Background Stack 2 */}
            <motion.div
                key={`bg2-${nextNextItem.id}`}
                className="absolute inset-x-0 mx-auto w-full h-full pointer-events-none max-w-sm"
                initial={{ scale: 0.85, y: -50, opacity: 0 }}
                animate={{
                    scale: 0.9,
                    y: -50,
                    zIndex: 1,
                    opacity: 0.5
                }}
                transition={{ duration: 0.4 }}
            >
                <TestimonialCard
                    data={nextNextItem}
                    onNext={() => { }}
                    onPrev={() => { }}
                    isBackground={true}
                />
            </motion.div>

            {/* Background Stack 1 */}
            <motion.div
                key={`bg1-${nextItem.id}`}
                className="absolute inset-x-0 mx-auto w-full h-full pointer-events-none max-w-sm"
                initial={{ scale: 0.9, y: -25, opacity: 0.4 }}
                animate={{
                    scale: 0.95,
                    y: -25,
                    zIndex: 2,
                    opacity: 0.8
                }}
                transition={{ duration: 0.4 }}
            >
                <TestimonialCard
                    data={nextItem}
                    onNext={() => { }}
                    onPrev={() => { }}
                    isBackground={true}
                />
            </motion.div>

            {/* Active Card */}
            <AnimatePresence custom={direction} mode="popLayout">
                <motion.div
                    key={activeItem.id}
                    custom={direction}
                    variants={swipeVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-x-0 mx-auto w-full h-full z-30 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-[30px] max-w-sm cursor-grab active:cursor-grabbing"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.7}
                    onDragEnd={(e, { offset }) => {
                        const swipe = offset.x;
                        if (swipe < -100) {
                            handleNext(); // Swipe left to go next (like Tinder/music apps usually)
                        } else if (swipe > 100) {
                            handlePrev();
                        }
                    }}
                >
                    <TestimonialCard
                        data={activeItem}
                        onNext={handleNext}
                        onPrev={handlePrev}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
