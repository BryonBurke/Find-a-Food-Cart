import React from 'react';
import { useTutorial } from './TutorialContext';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function TutorialOverlay() {
  const { step, endTutorial, goToStep } = useTutorial();
  const location = useLocation();

  if (step === 'IDLE' || step === 'DONE') return null;

  const getStepContent = () => {
    switch (step) {
      case 'CHOOSE_PATH':
        return {
          text: "How would you like to start?",
          position: "top-24 left-1/2 -translate-x-1/2",
          arrow: "hidden",
          options: [
            { label: "Start from scratch with new pod", action: () => goToStep('OPEN_MENU') },
            { label: "Add a cart in an existing pod", action: () => goToStep('GO_TO_POD') }
          ]
        };
      case 'GO_TO_POD':
        return {
          text: "Open the Pod where you want to enter a cart. Ensure you are logged in and have enabled editing",
          position: "top-24 left-1/2 -translate-x-1/2",
          arrow: "hidden",
          buttons: [
            { label: "I'm here", action: () => goToStep('CLICK_ADD_CART') }
          ]
        };
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
          text: "Make an account, log in, and ensure the edit mode is on, then click the 'Add Pod' button.",
          position: "top-24 right-4",
          arrow: "hidden",
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
          text: "Now let's add a cart to this pod! Click the 'Add Cart' button.",
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
      case 'CLICK_POD_MAP':
        if (!location.pathname.match(/^\/cart\/[^/]+$/)) return null;
        return {
          text: "Now click the map button below to put the cart in the right place on the map.",
          position: "top-24 left-1/2 -translate-x-1/2",
          arrow: "hidden",
        };
      case 'USE_PLACE_ON_MAP':
        if (!location.pathname.match(/^\/pod\/[^/]+\/map$/)) return null;
        return {
          text: "Go to the cart rack at the bottom and use the Place on Map to put the cart where it should be.",
          position: "bottom-64 left-1/2 -translate-x-1/2",
          arrow: "hidden",
        };
      case 'POSITION_CARTS':
        if (!location.pathname.match(/^\/pod\/[^/]+\/map$/)) return null;
        return {
          text: "Position the carts by dragging them to the right place. Clicking on a cart will open arrow keys for precise placement. When done, disable editing.",
          position: "top-24 left-1/2 -translate-x-1/2",
          arrow: "hidden",
        };
      case 'CONGRATS':
        return {
          text: "Good Job! You added a cart!",
          position: "top-24 left-1/2 -translate-x-1/2",
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
        
        {content.options && (
          <div className="mt-4 flex flex-col gap-2">
            {content.options.map((opt, i) => (
              <button
                key={i}
                onClick={opt.action}
                className="w-full bg-stone-900 text-white py-2 px-4 rounded-lg font-bold text-xs hover:bg-stone-800 transition-colors text-left"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {content.buttons && (
          <div className="mt-4 flex flex-col gap-2">
            {content.buttons.map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
