import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useEditMode } from './EditModeContext';

export type TutorialStep = 
  | 'IDLE'
  | 'CHOOSE_PATH'
  | 'GO_TO_POD'
  | 'OPEN_MENU'
  | 'CLICK_ADD_POD'
  | 'CLICK_MAP'
  | 'CLICK_POD_PIN'
  | 'FILL_POD_FORM'
  | 'CLICK_ADD_CART'
  | 'FILL_CART_FORM'
  | 'CLICK_POD_MAP'
  | 'USE_PLACE_ON_MAP'
  | 'POSITION_CARTS'
  | 'CONGRATS'
  | 'DONE';

interface TutorialContextType {
  step: TutorialStep;
  startTutorial: () => void;
  nextStep: (expectedCurrentStep: TutorialStep, next: TutorialStep) => void;
  goToStep: (next: TutorialStep) => void;
  endTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<TutorialStep>('IDLE');
  const location = useLocation();
  const { editMode } = useEditMode();

  const startTutorial = () => {
    setStep('CHOOSE_PATH');
  };

  const goToStep = (next: TutorialStep) => {
    setStep(next);
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
      setStep('CLICK_POD_MAP');
    } else if (step === 'CLICK_POD_MAP' && path.match(/^\/pod\/[^/]+\/map$/)) {
      setStep('USE_PLACE_ON_MAP');
    } else if (step === 'POSITION_CARTS' && !editMode) {
      setStep('CONGRATS');
    }
  }, [location.pathname, location.search, step, editMode]);

  return (
    <TutorialContext.Provider value={{ step, startTutorial, nextStep, goToStep, endTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorial must be used within TutorialProvider');
  return context;
}
