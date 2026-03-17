import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type TutorialStep = 
  | 'IDLE'
  | 'OPEN_MENU'
  | 'CLICK_ADD_POD'
  | 'CLICK_MAP'
  | 'CLICK_POD_PIN'
  | 'FILL_POD_FORM'
  | 'CLICK_ADD_CART'
  | 'FILL_CART_FORM'
  | 'DONE';

interface TutorialContextType {
  step: TutorialStep;
  startTutorial: () => void;
  nextStep: (expectedCurrentStep: TutorialStep, next: TutorialStep) => void;
  endTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<TutorialStep>('IDLE');
  const location = useLocation();

  const startTutorial = () => {
    setStep('OPEN_MENU');
  };

  const nextStep = (expectedCurrentStep: TutorialStep, next: TutorialStep) => {
    if (step === expectedCurrentStep) {
      setStep(next);
    }
  };

  const endTutorial = () => {
    setStep('IDLE');
  };

  // Auto-advance based on route changes if applicable
  useEffect(() => {
    if (step === 'IDLE') return;

    const path = location.pathname;
    const search = location.search;

    if (step === 'OPEN_MENU' && path === '/' && search.includes('mode=add')) {
      setStep('CLICK_MAP');
    } else if (step === 'CLICK_ADD_POD' && path === '/' && search.includes('mode=add')) {
      setStep('CLICK_MAP');
    } else if (step === 'CLICK_MAP' && path === '/' && !search.includes('mode=add')) {
      setStep('OPEN_MENU');
    } else if (step === 'CLICK_MAP' && path === '/pod/new') {
      setStep('FILL_POD_FORM');
    } else if (step === 'CLICK_POD_PIN' && path === '/pod/new') {
      setStep('FILL_POD_FORM');
    } else if (step === 'CLICK_POD_PIN' && path === '/' && !search.includes('mode=add')) {
      setStep('OPEN_MENU');
    } else if (step === 'FILL_POD_FORM' && path === '/' && search.includes('mode=add')) {
      setStep('CLICK_MAP');
    } else if (step === 'FILL_POD_FORM' && path.match(/^\/pod\/[^/]+$/) && !path.includes('new')) {
      setStep('CLICK_ADD_CART');
    } else if (step === 'CLICK_ADD_CART' && path.match(/^\/pod\/[^/]+\/cart\/new$/)) {
      setStep('FILL_CART_FORM');
    } else if (step === 'FILL_CART_FORM' && path.match(/^\/pod\/[^/]+$/) && !path.includes('new')) {
      setStep('CLICK_ADD_CART');
    } else if (step === 'FILL_CART_FORM' && path.match(/^\/cart\/[^/]+$/)) {
      setStep('DONE');
    }
  }, [location.pathname, location.search, step]);

  return (
    <TutorialContext.Provider value={{ step, startTutorial, nextStep, endTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorial must be used within TutorialProvider');
  return context;
}
