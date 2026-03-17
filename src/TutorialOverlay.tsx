import React from 'react';
import { useTutorial } from './TutorialContext';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function TutorialOverlay() {
  const { step, endTutorial } = useTutorial();
  const location = useLocation();

  if (step === 'IDLE' || step === 'DONE') return null;

  const getStepContent = () => {
    switch (step) {
      case 'OPEN_MENU':
        if (location.pathname !== '/') return null;
        return {
          text: "First we need a pod, even for just one cart. To make a pod, open the menu.",
          position: "top-16 right-4",
          arrow: "absolute -top-2 right-6 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white",
        };
      case 'CLICK_ADD_POD':
        if (location.pathname !== '/') return null;
        return {
          text: "Click 'Add Pod' to start creating your pod.",
          position: "top-48 right-72",
          arrow: "absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0 border-t-[8px] border-b-[8px] border-l-[8px] border-t-transparent border-b-transparent border-l-white",
        };
      case 'CLICK_MAP':
        if (location.pathname !== '/') return null;
        return {
          text: "Click anywhere on the map to place your new pod.",
          position: "top-24 left-1/2 -translate-x-1/2",
          arrow: "hidden",
        };
      case 'CLICK_POD_PIN':
        if (location.pathname !== '/') return null;
        return {
          text: "Click the pin you just dropped to create the pod.",
          position: "top-24 left-1/2 -translate-x-1/2",
          arrow: "hidden",
        };
      case 'FILL_POD_FORM':
        if (location.pathname !== '/pod/new') return null;
        return {
          text: "Fill out the pod details and save it.",
          position: "top-8 left-1/2 -translate-x-1/2",
          arrow: "hidden",
        };
      case 'CLICK_ADD_CART':
        if (!location.pathname.match(/^\/pod\/[^/]+$/)) return null;
        return {
          text: "Now let's add a cart to your new pod! Click the 'Add Cart' button.",
          position: "top-32 right-4",
          arrow: "hidden",
        };
      case 'FILL_CART_FORM':
        if (!location.pathname.match(/^\/pod\/[^/]+\/cart\/new$/)) return null;
        return {
          text: "Fill out the cart details and save it.",
          position: "top-8 left-1/2 -translate-x-1/2",
          arrow: "hidden",
        };
      default:
        return null;
    }
  };

  const content = getStepContent();
  if (!content) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed z-[9999] bg-white text-stone-800 p-4 rounded-xl shadow-2xl border border-stone-200 max-w-xs ${content.position}`}
      >
        <div className={content.arrow} />
        <button
          onClick={endTutorial}
          className="absolute top-2 right-2 text-stone-400 hover:text-stone-600"
        >
          <X size={16} />
        </button>
        <p className="text-sm font-medium pr-6">{content.text}</p>
      </motion.div>
    </AnimatePresence>
  );
}
