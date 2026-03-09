import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    const {
      title = 'Confirm',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      danger = false,
    } = opts;
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ message, title, confirmLabel, cancelLabel, danger });
    });
  }, []);

  const handle = (result) => {
    setModal(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ModalContext.Provider value={{ confirm }}>
      {children}
      {modal &&
        createPortal(
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={() => handle(false)}
          >
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title" id="modal-title">{modal.title}</div>
              <div className="modal-message">{modal.message}</div>
              <div className="modal-actions">
                <button className="modal-cancel-btn" onClick={() => handle(false)}>
                  {modal.cancelLabel}
                </button>
                <button
                  className={`modal-confirm-btn${modal.danger ? ' danger' : ''}`}
                  onClick={() => handle(true)}
                  autoFocus
                >
                  {modal.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
};
