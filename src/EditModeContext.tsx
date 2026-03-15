import React, { createContext, useContext, useState, useEffect } from 'react';

interface EditModeContextType {
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType>({
  editMode: false,
  setEditMode: () => {},
});

export const EditModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [editMode, setEditMode] = useState(() => {
    const saved = localStorage.getItem('editMode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('editMode', editMode.toString());
  }, [editMode]);

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => useContext(EditModeContext);
